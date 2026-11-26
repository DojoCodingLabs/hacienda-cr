import type { DocumentStore, DeliverySituation, DeliveryState } from "../delivery/types.js";
import { createStoredDocument } from "../delivery/state-machine.js";
/**
 * Submit-and-poll orchestrator.
 *
 * High-level pipeline that orchestrates the full document submission lifecycle:
 * sign -> submit -> poll until accepted/rejected.
 *
 * @module api/orchestrator
 */

import type { StatusResponse, SubmissionRequest } from "@dojocoding/hacienda-shared";
import { HaciendaStatus } from "@dojocoding/hacienda-shared";

import { sleep, withSignal } from "./cancellation.js";
import { ApiError, ValidationError } from "../errors.js";
import {
  SubmissionIdentityError,
  guardSubmissionIdentity,
  signedXmlSha256,
} from "../delivery/submission-identity.js";
import type { SubmissionIdentityStore } from "../delivery/submission-identity.js";
import type { HttpClient } from "./http-client.js";
import type { ParsedStatusResponse } from "./submission.js";
import { assertSubmittableRequest } from "./family-support.js";
import {
  submitDocument,
  getStatus,
  isTerminalStatus,
  extractRejectionReason,
  classifyNotYetReceived,
} from "./submission.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for the submit-and-wait orchestrator. */
export interface SubmitAndWaitOptions {
  /** Polling interval in milliseconds (default: 3000 = 3s). */
  readonly pollIntervalMs?: number;
  /** Maximum time for submission and polling in milliseconds (default: 60000 = 60s). */
  readonly timeoutMs?: number;
  /** Cancel submission, polling, and all waits. */
  readonly signal?: AbortSignal;
  /** Enable persistence; requires an explicit store. */
  readonly persist?: boolean;
  readonly store?: DocumentStore;
  /** Query the same clave without replaying an ambiguous POST. */
  readonly resumePending?: boolean;
  readonly situation?: DeliverySituation;
  readonly deadlineBusinessDays?: number;
  readonly provisionalReference?: string;
  readonly onStateChange?: (clave: string, from: string, to: string) => void;
  /** Optional callback invoked on each poll iteration. */
  readonly onPoll?: (status: ParsedStatusResponse, attempt: number) => void;
  /**
   * Opt-in submission-identity guard for the POST (see `submitDocument`).
   * Binds the clave to `sha256(signed bytes)` before any network call and
   * refuses different bytes, or a second send of the same bytes without
   * `retrySameBytes`, with a `SubmissionIdentityError`.
   */
  readonly identityStore?: SubmissionIdentityStore;
  /**
   * Explicitly resend the SAME signed bytes for a clave the identity guard
   * already recorded. Requires `identityStore`; not supported with a
   * persistent `DocumentStore`, which only resumes by status query.
   */
  readonly retrySameBytes?: boolean;
}

/** Final result of the submit-and-wait pipeline. */
export interface SubmitAndWaitResult {
  /** Whether the document was accepted by Hacienda. */
  readonly accepted: boolean;
  /** Final processing status. */
  readonly status: HaciendaStatus;
  /** 50-digit clave numerica. */
  readonly clave: string;
  /** Hacienda response date (ISO 8601). */
  readonly date?: string;
  /** Decoded response XML from Hacienda. */
  readonly responseXml?: string;
  /** Human-readable rejection reason (if rejected). */
  readonly rejectionReason?: string;
  /** HTTP status from the initial submission. */
  readonly submissionStatus: number;
  /** Number of poll attempts made. */
  readonly pollAttempts: number;
  readonly persisted?: boolean;
  readonly deliveryState?: DeliveryState;
}

/** Default configuration values. */
const DEFAULTS = {
  pollIntervalMs: 3000,
  timeoutMs: 60000,
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submits a document and polls until a terminal status is reached.
 *
 * Orchestrates the full lifecycle:
 * 1. Submit the document (POST /recepcion)
 * 2. Poll for status (GET /recepcion/{clave}) at regular intervals
 * 3. Return the final result when accepted, rejected, or timed out
 *
 * @param httpClient - The authenticated HTTP client.
 * @param request - The submission request payload (must include comprobanteXml as Base64).
 * @param options - Optional orchestration configuration.
 * @returns The final submission result.
 * @throws {ApiError} If submission fails or times out.
 *
 * @example
 * ```ts
 * const result = await submitAndWait(httpClient, {
 *   clave: "50601...",
 *   fecha: "2025-07-27T10:30:00-06:00",
 *   emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
 *   comprobanteXml: base64SignedXml,
 * });
 *
 * if (result.accepted) {
 *   console.log("Document accepted by Hacienda!");
 * } else {
 *   console.log("Rejected:", result.rejectionReason);
 * }
 * ```
 */
async function submitAndWaitLegacy(
  httpClient: HttpClient,
  request: SubmissionRequest,
  options?: SubmitAndWaitOptions,
): Promise<SubmitAndWaitResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULTS.pollIntervalMs;
  const timeoutMs = options?.timeoutMs ?? DEFAULTS.timeoutMs;

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2147483647 ||
    !Number.isFinite(pollIntervalMs) ||
    pollIntervalMs < 0 ||
    pollIntervalMs > 2147483647
  ) {
    throw new RangeError("Invalid submission timeout or polling interval.");
  }
  let pollAttempts = 0;
  const timeout = new AbortController();
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;
  const deadline = Date.now() + timeoutMs;
  const expire = () =>
    timeout.abort(
      new ApiError(
        `Submission/polling timed out after ${String(timeoutMs)}ms (${String(pollAttempts)} attempts).`,
        undefined,
        { clave: request.clave, pollAttempts },
      ),
    );
  const checkDeadline = () => {
    if (Date.now() >= deadline) expire();
    signal.throwIfAborted();
  };
  const timer = setTimeout(expire, timeoutMs);
  try {
    checkDeadline();
    let submissionResponse: { status: number };
    try {
      submissionResponse = await withSignal(
        () =>
          submitDocument(httpClient, request, {
            signal,
            ...(options?.identityStore ? { identityStore: options.identityStore } : {}),
            ...(options?.retrySameBytes ? { retrySameBytes: true } : {}),
          }),
        signal,
      );
    } catch (error) {
      // Without a store, a resend of a clave Hacienda already accepted can come
      // back as 400 instead of 409. Query by clave before reporting failure (#127).
      // A guard refusal (SubmissionIdentityError) is a ValidationError, never an ApiError.
      if (!(error instanceof ApiError) || error.statusCode !== 400) throw error;
      checkDeadline();
      let existing: ParsedStatusResponse;
      try {
        existing = await withSignal(() => getStatus(httpClient, request.clave, { signal }), signal);
      } catch {
        signal.throwIfAborted();
        throw error;
      }
      checkDeadline();
      if (existing.status !== HaciendaStatus.ACEPTADO) throw error;
      return {
        accepted: true,
        status: existing.status,
        clave: existing.clave,
        date: existing.date,
        responseXml: existing.responseXml,
        submissionStatus: 400,
        pollAttempts: 1,
      };
    }
    while (true) {
      checkDeadline();
      // Wait before polling (except on the first attempt, give Hacienda a moment)
      await sleep(
        Math.min(
          deadline - Date.now(),
          pollAttempts === 0 ? Math.min(pollIntervalMs, 1000) : pollIntervalMs,
        ),
        signal,
      );
      checkDeadline();

      pollAttempts++;

      let statusResponse: ParsedStatusResponse;
      try {
        statusResponse = await withSignal(
          () => getStatus(httpClient, request.clave, { signal }),
          signal,
        );
        checkDeadline();
      } catch (error) {
        // A 404, or the sandbox's 400 "no ha sido recibido", may mean the
        // document is not indexed yet: keep polling until the deadline.
        if (classifyNotYetReceived(error, request.clave)) {
          continue;
        }
        throw error;
      }

      // Invoke the poll callback if provided
      if (options?.onPoll) {
        options.onPoll(statusResponse, pollAttempts);
        checkDeadline();
      }

      // Check if we've reached a terminal status
      if (isTerminalStatus(statusResponse.status)) {
        const accepted = statusResponse.status === HaciendaStatus.ACEPTADO;
        let rejectionReason: string | undefined;

        if (!accepted && statusResponse.responseXml) {
          rejectionReason = extractRejectionReason(statusResponse.responseXml);
        }

        return {
          accepted,
          status: statusResponse.status,
          clave: statusResponse.clave,
          date: statusResponse.date,
          responseXml: statusResponse.responseXml,
          rejectionReason,
          submissionStatus: submissionResponse.status,
          pollAttempts,
        };
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Persist before POST; after an uncertain outcome only resume status queries.
 * Store CAS failures are surfaced rather than hidden. Acceptance is the observed
 * API status, not authentication of response XML; use the response verifier for that.
 */
export async function submitAndWait(
  httpClient: HttpClient,
  request: SubmissionRequest,
  options?: SubmitAndWaitOptions,
): Promise<SubmitAndWaitResult> {
  // REP and MensajeReceptor are refused before persistence or any POST.
  assertSubmittableRequest(request);
  if (!options?.persist && !options?.store && !options?.resumePending)
    return submitAndWaitLegacy(httpClient, request, options);
  const timeoutMs = options?.timeoutMs ?? DEFAULTS.timeoutMs;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULTS.pollIntervalMs;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2147483647 ||
    !Number.isFinite(pollIntervalMs) ||
    pollIntervalMs < 0 ||
    pollIntervalMs > 2147483647
  )
    throw new RangeError("Invalid submission timeout or polling interval.");
  options?.signal?.throwIfAborted();
  if (
    typeof request.comprobanteXml !== "string" ||
    Buffer.byteLength(request.comprobanteXml) > 12 * 1024 * 1024
  )
    throw new RangeError("Submission XML exceeds the bounded delivery input");
  const store = options?.store;
  if (!store) throw new Error("Persistent delivery requires an explicit DocumentStore");
  if (options?.retrySameBytes)
    throw new ValidationError(
      "Persistent delivery never re-POSTs; resume by status, or resend explicitly with submitDocument and an identityStore.",
    );
  const xml = Buffer.from(request.comprobanteXml, "base64").toString("utf8");
  let doc = await store.get(request.clave);
  // The DocumentStore already binds bytes per clave: this guard is on by default here.
  if (doc && doc.xml !== xml)
    throw new SubmissionIdentityError(
      "DIFFERENT_BYTES",
      request.clave,
      signedXmlSha256(Buffer.from(doc.xml, "utf8").toString("base64")),
      signedXmlSha256(request.comprobanteXml),
    );
  if (!doc) {
    if (options?.resumePending) throw new Error("No persisted document to resume");
    doc = createStoredDocument({
      xml,
      clave: request.clave,
      generatedAt: new Date(request.fecha),
      situation: options?.situation ?? "normal",
      deadlineBusinessDays: options?.deadlineBusinessDays,
      provisionalReference: options?.provisionalReference,
    });
    await store.persist(doc);
    doc = required(await store.get(request.clave));
  }
  if (["ACEPTADO", "RECHAZADO", "VENCIDO"].includes(doc.state))
    throw new Error("Document already has a terminal persisted state");
  const alreadyAttempted = doc.state !== "FIRMADO";
  if (alreadyAttempted && !options?.resumePending)
    throw new Error("Submission may already have occurred; resume status by the same clave");
  const change = async (to: DeliveryState): Promise<void> => {
    const current = await store.get(request.clave);
    if (!current) throw new Error("Persisted document disappeared");
    if (current.state === to) return;
    await store.transition(request.clave, current.state, to);
    options?.onStateChange?.(request.clave, current.state, to);
  };
  // The intent is durable before any network bytes. A crash afterwards is ambiguous.
  options?.signal?.throwIfAborted();
  if (!alreadyAttempted) {
    // An optional identity store is checked before the intent leaves FIRMADO,
    // so a refusal never strands the document in an ambiguous state.
    if (options?.identityStore) await guardSubmissionIdentity(options.identityStore, request);
    // Claim the *original* FIRMADO state. An idempotent transition after rereading
    // PENDIENTE would let two first callers both POST the same document.
    await store.transition(request.clave, "FIRMADO", "PENDIENTE");
    options?.onStateChange?.(request.clave, "FIRMADO", "PENDIENTE");
  }
  const transport = {
    post: async (...args: Parameters<HttpClient["post"]>) => {
      if (alreadyAttempted || options?.resumePending)
        return { status: 0, headers: new Headers(), data: {} };
      const result = await httpClient.post(...args);
      await change("ENVIADO");
      return result;
    },
    get: async (...args: Parameters<HttpClient["get"]>) => {
      const result = await httpClient.get<StatusResponse>(...args);
      if (result.data.clave !== request.clave) throw new ApiError("Status clave mismatch");
      const status = result.data["ind-estado"];
      if (status === HaciendaStatus.ACEPTADO) await change("ACEPTADO");
      else if (status === HaciendaStatus.RECHAZADO) await change("RECHAZADO");
      return result;
    },
  } as unknown as HttpClient;
  // The identity guard already ran above, before the PENDIENTE claim.
  const { identityStore: _guarded, ...rest } = options ?? {};
  const result = await submitAndWaitLegacy(transport, request, rest);
  return {
    ...result,
    persisted: true,
    deliveryState: required(await store.get(request.clave)).state,
  };
}

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing required value");
  return value;
}
