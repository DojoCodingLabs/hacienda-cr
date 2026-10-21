import { XMLParser } from "fast-xml-parser";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { assertDocumentIdentity, STANDARD_DOCUMENT_CODES } from "../xml/document-identity.js";
/**
 * Sequence number persistence for the clave numerica.
 *
 * Each document type requires a sequential number (up to 10 digits).
 * Sequences are persisted to ~/.hacienda-cr/sequences.json and keyed
 * by "{docType}-{branch}-{pos}".
 */

import { readFile, mkdir, rm } from "node:fs/promises";
import { writeDurableJson } from "./durable-file.js";
import { StoredDocumentSchema } from "../delivery/types.js";
import type { StoredDocument } from "../delivery/types.js";
import { parseClave } from "../clave/parse-clave.js";
import { z } from "zod";
import { join } from "node:path";
import { getConfigDir, ensureConfigDir } from "./config-manager.js";
import { SequenceFileSchema, MAX_SEQUENCE, DEFAULT_BRANCH, DEFAULT_POS } from "./types.js";
import type { SequenceFile } from "./types.js";

// ---------------------------------------------------------------------------
// File-based lock (mkdir is atomic on all platforms)
// ---------------------------------------------------------------------------

const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 50;

/**
 * Acquires a file-based lock using `mkdir` (atomic on all platforms).
 * Retries until timeout. Returns an unlock function.
 */
async function acquireLock(lockPath: string): Promise<() => Promise<void>> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      await mkdir(lockPath);
      return async () => {
        try {
          await rm(lockPath, { recursive: true });
        } catch {
          // Lock dir may already be removed — non-fatal
        }
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        if (Date.now() >= deadline) {
          // Elapsed time does not prove that the owner is dead. Never steal
          // a live lock: doing so lets two writers allocate the same number.
          throw new Error(
            `Failed to acquire sequence lock at ${lockPath} after ${String(LOCK_TIMEOUT_MS)}ms. ` +
              `Check that no writer is running before manually removing the lock directory.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
        continue;
      }
      throw error;
    }
  }
}

/** Sequences file name */
const SEQUENCES_FILE_NAME = "sequences.json";

/**
 * Builds the compound key for a sequence entry.
 *
 * @param docType - Document type code (e.g. "01", "04")
 * @param branch - Branch/sucursal code (default: "001")
 * @param pos - Point-of-sale code (default: "00001")
 * @returns Formatted key string like "01-001-00001"
 */
export function buildSequenceKey(
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
): string {
  return `${docType}-${branch}-${pos}`;
}

/**
 * Returns the path to the sequences.json file.
 *
 * @param configDir - Optional override for the config directory
 * @returns Absolute path to sequences.json
 */
export function getSequencesPath(configDir?: string): string {
  return join(getConfigDir(configDir), SEQUENCES_FILE_NAME);
}

/**
 * Reads the current sequences file from disk.
 *
 * @param configDir - Optional override for the config directory
 * @returns Parsed sequence data, or empty object if file doesn't exist
 * @throws If the file exists but contains invalid JSON or fails validation
 */
async function readSequenceFile(configDir?: string): Promise<SequenceFile> {
  const filePath = getSequencesPath(configDir);

  try {
    const content = await readFile(filePath, "utf-8");

    if (content.trim() === "") {
      return {};
    }

    const parsed: unknown = JSON.parse(content);

    const result = SequenceFileSchema.safeParse(
      isLedger(parsed) ? LedgerSchema.parse(parsed).sequences : parsed,
    );
    if (!result.success) {
      throw new Error(`Invalid sequences file at ${filePath}: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    // File doesn't exist — start fresh
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
}

/**
 * Writes the sequences file atomically using a rename-based strategy.
 * Writes to a temporary file first, then renames to the target to reduce
 * the chance of corruption from concurrent writes or crashes.
 *
 * @param sequences - The sequence data to persist
 * @param configDir - Optional override for the config directory
 */
async function writeSequenceFile(sequences: SequenceFile, configDir?: string): Promise<void> {
  await ensureConfigDir(configDir);
  const filePath = getSequencesPath(configDir);
  const ledger = await readLedger(configDir);
  if (ledger) await writeDurableJson(filePath, { ...ledger, sequences });
  else await writeDurableJson(filePath, sequences);
}

/**
 * Error thrown when a sequence number exceeds the maximum allowed value.
 */
export class SequenceOverflowError extends Error {
  constructor(
    public readonly key: string,
    public readonly currentValue: number,
  ) {
    super(
      `Sequence overflow for "${key}": current value ${currentValue} has reached ` +
        `the maximum of ${MAX_SEQUENCE}. Cannot increment further.`,
    );
    this.name = "SequenceOverflowError";
  }
}

/**
 * Options for the SequenceStore.
 */
export interface SequenceStoreOptions {
  /** Override the config directory path (defaults to ~/.hacienda-cr/) */
  configDir?: string;
}

/**
 * Gets the next sequence number for a given document type, branch, and POS.
 *
 * Performs an atomic read-increment-write cycle:
 * 1. Reads the current sequences file
 * 2. Increments the sequence for the given key (or initializes at 1)
 * 3. Writes back the updated file atomically
 *
 * @param docType - Document type code (e.g. "01" for Factura)
 * @param branch - Branch/sucursal code (default: "001")
 * @param pos - Point-of-sale code (default: "00001")
 * @param options - Optional overrides
 * @returns The next sequence number (starts at 1)
 * @throws {SequenceOverflowError} If the sequence exceeds MAX_SEQUENCE
 */
export async function getNextSequence(
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
  options: SequenceStoreOptions = {},
): Promise<number> {
  const configDir = getConfigDir(options.configDir);
  await ensureConfigDir(options.configDir);
  const lockPath = join(configDir, ".sequences.lock");
  const unlock = await acquireLock(lockPath);

  try {
    const key = buildSequenceKey(docType, branch, pos);
    const sequences = await readSequenceFile(options.configDir);

    const current = sequences[key] ?? 0;

    if (current >= MAX_SEQUENCE) {
      throw new SequenceOverflowError(key, current);
    }

    const next = current + 1;
    sequences[key] = next;

    await writeSequenceFile(sequences, options.configDir);

    return next;
  } finally {
    await unlock();
  }
}

/**
 * Gets the current sequence number for a given key without incrementing.
 *
 * @param docType - Document type code
 * @param branch - Branch/sucursal code (default: "001")
 * @param pos - Point-of-sale code (default: "00001")
 * @param options - Optional overrides
 * @returns The current sequence number, or 0 if not yet initialized
 */
export async function getCurrentSequence(
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
  options: SequenceStoreOptions = {},
): Promise<number> {
  const key = buildSequenceKey(docType, branch, pos);
  const sequences = await readSequenceFile(options.configDir);
  return sequences[key] ?? 0;
}

/**
 * Resets a sequence number to zero (or a specific value).
 * Useful for testing or manual recovery.
 *
 * @param docType - Document type code
 * @param branch - Branch/sucursal code (default: "001")
 * @param pos - Point-of-sale code (default: "00001")
 * @param value - Value to reset to (default: 0)
 * @param options - Optional overrides
 */
export async function resetSequence(
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
  value = 0,
  options: SequenceStoreOptions = {},
): Promise<void> {
  if (!Number.isInteger(value) || value < 0 || value > MAX_SEQUENCE) {
    throw new RangeError(`Sequence must be an integer between 0 and ${MAX_SEQUENCE}.`);
  }
  const configDir = getConfigDir(options.configDir);
  await ensureConfigDir(options.configDir);
  const unlock = await acquireLock(join(configDir, ".sequences.lock"));
  try {
    const key = buildSequenceKey(docType, branch, pos);
    const sequences = await readSequenceFile(options.configDir);
    const ledger = await readLedger(options.configDir);
    const issuedFloor = ledger
      ? Math.max(
          0,
          ...Object.values(ledger.documents)
            .filter(
              (doc) =>
                doc.clave.slice(21, 24) === branch &&
                doc.clave.slice(24, 29) === pos &&
                doc.clave.slice(29, 31) === docType,
            )
            .map((doc) => Number(doc.clave.slice(31, 41))),
        )
      : 0;
    if (value < issuedFloor) throw new Error("Cannot rewind a sequence after durable issuance");
    sequences[key] = value;
    await writeSequenceFile(sequences, options.configDir);
  } finally {
    await unlock();
  }
}

const LedgerSchema = z
  .object({
    version: z.literal(1),
    sequences: SequenceFileSchema,
    documents: z.record(z.string(), StoredDocumentSchema),
    discarded: z.record(z.string(), z.string()),
  })
  .strict();
function isLedger(value: unknown): boolean {
  return !!value && typeof value === "object" && "version" in value;
}
async function readLedger(configDir?: string): Promise<z.infer<typeof LedgerSchema> | null> {
  try {
    const content = await readFile(getSequencesPath(configDir), "utf8");
    if (!content.trim()) return null;
    const value: unknown = JSON.parse(content);
    return isLedger(value) ? LedgerSchema.parse(value) : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Reserve a consecutive and persist the complete signed document in ONE ledger replacement.
 * The builder runs inside the sequence lock and must not call another sequence API.
 * Throwing leaves the counter unchanged; after commit the number cannot be reused.
 * This binds bytes/identity, not signature authenticity or fiscal acceptance.
 */
export async function assignSequenceWithDocument(
  docType: string,
  build: (sequence: number) => Promise<StoredDocument> | StoredDocument,
  options: SequenceStoreOptions & { branch?: string; pos?: string } = {},
): Promise<{ sequence: number; document: StoredDocument }> {
  const branch = options.branch ?? DEFAULT_BRANCH,
    pos = options.pos ?? DEFAULT_POS;
  if (!/^\d{2}$/.test(docType) || !/^\d{3}$/.test(branch) || !/^\d{5}$/.test(pos))
    throw new Error("Expected canonical document type, branch and point of sale");
  const directory = getConfigDir(options.configDir);
  await ensureConfigDir(directory);
  const unlock = await acquireLock(join(directory, ".sequences.lock"));
  try {
    const ledger = (await readLedger(directory)) ?? {
      version: 1 as const,
      sequences: await readSequenceFile(directory),
      documents: {},
      discarded: {},
    };
    const key = buildSequenceKey(docType, branch, pos),
      current = ledger.sequences[key] ?? 0;
    if (current >= MAX_SEQUENCE) throw new SequenceOverflowError(key, current);
    const sequence = current + 1;
    const document = StoredDocumentSchema.parse(await build(sequence));
    const identity = parseClave(document.clave);
    if (
      identity.documentType !== docType ||
      identity.branch !== branch ||
      identity.pos !== pos ||
      identity.sequence !== sequence ||
      document.state !== "FIRMADO" ||
      ledger.documents[document.clave]
    )
      throw new Error("Document does not bind the reserved consecutive");
    const schema = await validateDocumentXml(document.xml, { requireSignature: true });
    if (!schema.valid || !schema.hasSignature)
      throw new Error("Issuance requires a signed XSD-conformant document");
    const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(
      document.xml,
    ) as Record<string, unknown>;
    const root = Object.keys(parsed).find((name) => Object.hasOwn(STANDARD_DOCUMENT_CODES, name));
    if (!root || STANDARD_DOCUMENT_CODES[root] !== docType)
      throw new Error("Document root does not match the reserved type");
    const body = parsed[root] as {
      Clave: string;
      NumeroConsecutivo: string;
      FechaEmision: string;
      Emisor: { Identificacion: { Tipo: string; Numero: string } };
      Receptor?: { Identificacion?: { Tipo: string; Numero: string } };
    };
    if (
      body.Clave !== document.clave ||
      Date.parse(body.FechaEmision) !== Date.parse(document.generatedAt)
    )
      throw new Error("Stored metadata does not match signed XML identity");
    assertDocumentIdentity(
      {
        clave: body.Clave,
        numeroConsecutivo: body.NumeroConsecutivo,
        fechaEmision: body.FechaEmision,
        emisor: {
          identificacion: {
            tipo: body.Emisor.Identificacion.Tipo,
            numero: body.Emisor.Identificacion.Numero,
          },
        },
        ...(body.Receptor?.Identificacion
          ? {
              receptor: {
                identificacion: {
                  tipo: body.Receptor.Identificacion.Tipo,
                  numero: body.Receptor.Identificacion.Numero,
                },
              },
            }
          : {}),
      },
      docType,
    );
    ledger.sequences[key] = sequence;
    ledger.documents[document.clave] = document;
    await writeDurableJson(getSequencesPath(directory), ledger);
    return { sequence, document };
  } finally {
    await unlock();
  }
}

/** Read the exact immutable bytes committed with a sequence. */
export async function getAssignedDocument(
  clave: string,
  options: SequenceStoreOptions = {},
): Promise<StoredDocument | null> {
  return (await readLedger(options.configDir))?.documents[clave] ?? null;
}

/** Record a discard reason without deleting bytes or returning a sequence to the pool.
 * This is an audit annotation, not cancellation of a document at Hacienda.
 */
export async function recordSequenceDiscard(
  clave: string,
  reason: string,
  options: SequenceStoreOptions = {},
): Promise<void> {
  if (!reason.trim() || reason.length > 500)
    throw new Error("A bounded discard reason is required");
  const directory = getConfigDir(options.configDir);
  await ensureConfigDir(directory);
  const unlock = await acquireLock(join(directory, ".sequences.lock"));
  try {
    const ledger = await readLedger(directory);
    if (!ledger?.documents[clave]) throw new Error("No durable issuance for this clave");
    if (ledger.discarded[clave]) throw new Error("Discard already recorded");
    ledger.discarded[clave] = reason;
    await writeDurableJson(getSequencesPath(directory), ledger);
  } finally {
    await unlock();
  }
}
