/**
 * Submission-identity guard: one clave, one set of signed bytes.
 *
 * After an uncertain POST outcome, Hacienda may already hold the document
 * under its clave. Sending different signed bytes under that same clave would
 * create two divergent fiscal records for one consecutive. This module records
 * `sha256(signed XML bytes)` per clave before the first POST and refuses any
 * later submission with a different digest, before any network call. A second
 * POST of the SAME bytes is refused too, unless the caller opts in explicitly
 * with `retrySameBytes` after reconciling by clave.
 *
 * The sandbox runner's `PREVIOUS_SUBMISSION_REQUIRES_STATUS` marker files are
 * the stricter script-level equivalent (scripts/validate-sdk-sandbox.mjs): they
 * block every second POST from a run directory.
 *
 * @module delivery/submission-identity
 */

import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { ClaveNumericaSchema } from "@dojocoding/hacienda-shared";

import { withFileLock, writeDurableJson } from "../config/durable-file.js";
import { ValidationError } from "../errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Durable record binding a clave to the digest of its signed bytes. */
export interface SubmissionIdentityRecord {
  /** 50-character clave. */
  readonly clave: string;
  /** Lowercase hex SHA-256 of the decoded signed XML bytes. */
  readonly sha256: string;
  /** When the first POST attempt was authorized (ISO 8601). */
  readonly firstAttemptAt: string;
  /** When the latest POST attempt was authorized (ISO 8601). */
  readonly lastAttemptAt: string;
  /** Number of authorized POST attempts, including explicit same-byte retries. */
  readonly attempts: number;
}

/** How a caller asks to use a clave. */
export type SubmissionIdentityMode = "first" | "retry";

/**
 * Result of an atomic {@link SubmissionIdentityStore.claim}.
 *
 * - `first`: no record existed; one was created with `attempts: 1`.
 * - `retry`: same digest and mode `retry`; `attempts` was incremented.
 * - `already_attempted`: same digest, mode `first`; nothing was modified.
 * - `conflict`: a different digest is recorded; nothing was modified.
 */
export type SubmissionIdentityClaim =
  | { readonly outcome: "first" | "retry"; readonly record: SubmissionIdentityRecord }
  | {
      readonly outcome: "already_attempted" | "conflict";
      readonly record: SubmissionIdentityRecord;
    };

/**
 * Pluggable store for submission identities.
 *
 * `claim` MUST be atomic per clave (a lock, a transaction or a conditional
 * write): two concurrent claims for the same clave must not both return
 * `first`. Records must never be deleted or have their digest changed while
 * the document can still be reconciled. The SDK re-checks every returned
 * claim and fails closed on an inconsistent answer.
 */
export interface SubmissionIdentityStore {
  /** Reads the record for a clave, or `null` when none exists. */
  get(clave: string): Promise<SubmissionIdentityRecord | null>;
  /** Atomically records a POST attempt; see {@link SubmissionIdentityClaim}. */
  claim(
    clave: string,
    sha256: string,
    mode: SubmissionIdentityMode,
    at: Date,
  ): Promise<SubmissionIdentityClaim>;
}

/** Why {@link guardSubmissionIdentity} refused a submission. */
export type SubmissionIdentityErrorReason = "DIFFERENT_BYTES" | "ALREADY_ATTEMPTED";

/**
 * Thrown before any network call when a submission would reuse a clave.
 *
 * - `DIFFERENT_BYTES`: the clave is already bound to other signed bytes. Never
 *   resubmit; reconcile the original document by clave. A correction needs a
 *   new document with its own consecutive and clave.
 * - `ALREADY_ATTEMPTED`: these exact bytes were already POSTed (or a POST was
 *   authorized and may have left). Reconcile by clave first; resend only
 *   deliberately with `retrySameBytes: true`.
 */
export class SubmissionIdentityError extends ValidationError {
  readonly reason: SubmissionIdentityErrorReason;
  readonly clave: string;
  /** Digest already recorded for the clave. */
  readonly recordedSha256: string;
  /** Digest of the rejected submission. */
  readonly attemptedSha256: string;

  constructor(
    reason: SubmissionIdentityErrorReason,
    clave: string,
    recordedSha256: string,
    attemptedSha256: string,
  ) {
    super(
      reason === "DIFFERENT_BYTES"
        ? `Clave is already bound to different document bytes (${clave}); reconcile the original by clave and never resubmit changed bytes.`
        : `A submission of these bytes was already attempted for clave ${clave}; reconcile by clave and retry only explicitly with retrySameBytes.`,
      { reason, clave, recordedSha256, attemptedSha256 },
    );
    this.name = "SubmissionIdentityError";
    this.reason = reason;
    this.clave = clave;
    this.recordedSha256 = recordedSha256;
    this.attemptedSha256 = attemptedSha256;
  }
}

/** Options for {@link guardSubmissionIdentity}. */
export interface GuardSubmissionIdentityOptions {
  /**
   * Explicitly authorize another POST of the SAME signed bytes for a clave
   * that was already attempted. Use only after reconciling by clave and
   * deciding, under your own policy, that a resend is warranted. Different
   * bytes are refused regardless.
   */
  readonly retrySameBytes?: boolean;
  /** Clock override (tests). */
  readonly now?: () => Date;
}

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------

const STRICT_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
/** Same bound as persistent delivery (12 MiB of Base64 input). */
const MAX_BASE64_LENGTH = 12 * 1024 * 1024;

/**
 * Returns the lowercase hex SHA-256 of the signed XML bytes carried by a
 * Base64 `comprobanteXml`. The Base64 must be strict (no whitespace, correct
 * padding) so that one digest corresponds to one transmitted payload.
 *
 * @throws {ValidationError} If the input is not strict, bounded Base64.
 */
export function signedXmlSha256(comprobanteXmlBase64: string): string {
  if (
    typeof comprobanteXmlBase64 !== "string" ||
    comprobanteXmlBase64.length === 0 ||
    comprobanteXmlBase64.length > MAX_BASE64_LENGTH ||
    !STRICT_BASE64.test(comprobanteXmlBase64)
  )
    throw new ValidationError("comprobanteXml must be non-empty, bounded, strict Base64.");
  return createHash("sha256").update(Buffer.from(comprobanteXmlBase64, "base64")).digest("hex");
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Records the submission identity for `request.clave` and refuses a reuse.
 *
 * Call it immediately before the POST; it performs no network access.
 * `submitDocument` and `submitAndWait` call it for you when given an
 * `identityStore`. The record means "a POST was authorized and may have
 * left", so a later call for the same clave is refused even if the earlier
 * request failed locally.
 *
 * @returns The record after this attempt was authorized.
 * @throws {ValidationError} If the clave or Base64 payload is malformed.
 * @throws {SubmissionIdentityError} If the clave is bound to other bytes, or
 *   was already attempted and `retrySameBytes` was not set.
 */
export async function guardSubmissionIdentity(
  store: SubmissionIdentityStore,
  request: { readonly clave: string; readonly comprobanteXml: string },
  options?: GuardSubmissionIdentityOptions,
): Promise<SubmissionIdentityRecord> {
  const { clave } = request;
  if (typeof clave !== "string" || !ClaveNumericaSchema.safeParse(clave).success)
    throw new ValidationError("Invalid clave for submission identity.");
  const sha256 = signedXmlSha256(request.comprobanteXml);
  const mode: SubmissionIdentityMode = options?.retrySameBytes ? "retry" : "first";
  const claim = await store.claim(clave, sha256, mode, (options?.now ?? (() => new Date()))());
  const record = claim?.record;
  // Fail closed on a store answer that does not match the request.
  if (!record || record.clave !== clave || !SHA256_HEX.test(record.sha256))
    throw new Error("Submission identity store returned an inconsistent record.");
  switch (claim.outcome) {
    case "first":
    case "retry":
      if (record.sha256 !== sha256 || (claim.outcome === "retry" && mode !== "retry"))
        throw new Error("Submission identity store returned an inconsistent record.");
      return record;
    case "conflict":
      if (record.sha256 === sha256)
        throw new Error("Submission identity store returned an inconsistent record.");
      throw new SubmissionIdentityError("DIFFERENT_BYTES", clave, record.sha256, sha256);
    case "already_attempted":
      if (record.sha256 !== sha256)
        throw new SubmissionIdentityError("DIFFERENT_BYTES", clave, record.sha256, sha256);
      throw new SubmissionIdentityError("ALREADY_ATTEMPTED", clave, record.sha256, sha256);
    default:
      throw new Error("Submission identity store returned an inconsistent record.");
  }
}

// ---------------------------------------------------------------------------
// File-backed default
// ---------------------------------------------------------------------------

const CLAVE_FILE_NAME = /^506\d{6}[A-Za-z0-9]{12}\d{29}$/;

const SubmissionIdentityRecordSchema = z
  .object({
    clave: z.string().regex(CLAVE_FILE_NAME),
    sha256: z.string().regex(SHA256_HEX),
    firstAttemptAt: z.iso.datetime({ offset: true }),
    lastAttemptAt: z.iso.datetime({ offset: true }),
    attempts: z.number().int().min(1),
  })
  .strict();

/** Options for {@link FileSubmissionIdentityStore}. */
export interface FileSubmissionIdentityStoreOptions {
  /** Directory holding one record per clave (created with mode 0700). */
  readonly baseDir: string;
}

/**
 * Local file implementation of {@link SubmissionIdentityStore}.
 *
 * Follows the FileDocumentStore and sequence ledger conventions: one process
 * lock for every claim (a lock timeout never steals another writer's lock),
 * records written with mode 0600 through file fsync, rename and directory
 * fsync, and corrupt records reported instead of ignored. Records are never
 * deleted by the SDK. Guarantees cover local POSIX filesystems, not network
 * filesystems or power loss; multi-host services need a shared transactional
 * store implementing the same interface.
 */
export class FileSubmissionIdentityStore implements SubmissionIdentityStore {
  constructor(private readonly options: FileSubmissionIdentityStoreOptions) {}

  private path(clave: string): string {
    if (typeof clave !== "string" || !CLAVE_FILE_NAME.test(clave))
      throw new ValidationError("Invalid document key");
    return join(this.options.baseDir, `${clave}.json`);
  }

  async get(clave: string): Promise<SubmissionIdentityRecord | null> {
    const path = this.path(clave);
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    const record = SubmissionIdentityRecordSchema.parse(JSON.parse(text));
    if (record.clave !== clave) throw new Error("Submission identity record is corrupt.");
    return record;
  }

  async claim(
    clave: string,
    sha256: string,
    mode: SubmissionIdentityMode,
    at: Date,
  ): Promise<SubmissionIdentityClaim> {
    const path = this.path(clave);
    if (!SHA256_HEX.test(sha256)) throw new ValidationError("Invalid submission digest.");
    if (mode !== "first" && mode !== "retry")
      throw new ValidationError("Invalid submission identity mode.");
    if (!(at instanceof Date) || Number.isNaN(at.getTime()))
      throw new ValidationError("Invalid submission attempt time.");
    const timestamp = at.toISOString();
    await mkdir(this.options.baseDir, { recursive: true, mode: 0o700 });
    return withFileLock(join(this.options.baseDir, ".identity.lock"), async () => {
      const existing = await this.get(clave);
      if (!existing) {
        const record: SubmissionIdentityRecord = {
          clave,
          sha256,
          firstAttemptAt: timestamp,
          lastAttemptAt: timestamp,
          attempts: 1,
        };
        await writeDurableJson(path, record);
        return { outcome: "first", record };
      }
      if (existing.sha256 !== sha256) return { outcome: "conflict", record: existing };
      if (mode !== "retry") return { outcome: "already_attempted", record: existing };
      const record: SubmissionIdentityRecord = {
        ...existing,
        lastAttemptAt: timestamp,
        attempts: existing.attempts + 1,
      };
      await writeDurableJson(path, record);
      return { outcome: "retry", record };
    });
  }
}

/** Default file store at `<configDir>/submission-identity`. */
export function createDefaultSubmissionIdentityStore(
  configDir: string,
): FileSubmissionIdentityStore {
  return new FileSubmissionIdentityStore({ baseDir: join(configDir, "submission-identity") });
}
