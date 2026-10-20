/**
 * Sequence number persistence for the clave numerica.
 *
 * Each document type requires a sequential number (up to 10 digits).
 * Sequences are persisted to ~/.hacienda-cr/sequences.json and keyed
 * by "{docType}-{branch}-{pos}".
 */

import { readFile, writeFile, rename, mkdir, rm, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { getConfigDir, ensureConfigDir } from "./config-manager.js";
import {
  SequenceFileSchema,
  MAX_SEQUENCE,
  DEFAULT_BRANCH,
  DEFAULT_POS,
  ExtendedSequenceFileSchema,
  type SequenceFile,
  type SequenceAssignment,
  type SequenceDiscard,
  type ExtendedSequenceFile,
} from "./types.js";

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

    const result = SequenceFileSchema.safeParse(parsed);
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
  // Use a unique temp file name per write to avoid collisions under concurrent access
  const uniqueSuffix = randomBytes(6).toString("hex");
  const tempPath = `${filePath}.${uniqueSuffix}.tmp`;

  const content = JSON.stringify(sequences, null, 2) + "\n";
  await writeFile(tempPath, content, { encoding: "utf-8", mode: 0o600 });
  await rename(tempPath, filePath);
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
 * @deprecated This is a legacy operation that assigns a sequence without a document.
 * Use {@link assignSequenceWithDocument} instead, which assigns the sequence and
 * persists the document in a single atomic step, guaranteeing that every assigned
 * sequence belongs to a persisted document.
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
  // Emit deprecation warning
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "WARNING: getNextSequence() is a legacy operation that assigns a sequence without a document. " +
        "Use assignSequenceWithDocument() instead, which guarantees every assigned sequence " +
        "belongs to a persisted document. See https://github.com/DojoCodingLabs/hacienda-cr for migration guide.",
    );
  }

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
    sequences[key] = value;
    await writeSequenceFile(sequences, options.configDir);
  } finally {
    await unlock();
  }
}

/** Extended sequences file name */
const EXTENDED_SEQUENCES_FILE_NAME = "sequences-ext.json";

/** Reads the extended sequences file from disk. */
async function readExtendedSequenceFile(configDir?: string): Promise<ExtendedSequenceFile> {
  const filePath = join(getConfigDir(configDir), EXTENDED_SEQUENCES_FILE_NAME);

  try {
    const content = await readFile(filePath, "utf-8");

    if (content.trim() === "") {
      return { sequences: {}, assignments: [], discards: [] };
    }

    const parsed: unknown = JSON.parse(content);

    const result = ExtendedSequenceFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid extended sequences file at ${filePath}: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    // File doesn't exist — start fresh
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { sequences: {}, assignments: [], discards: [] };
    }
    throw error;
  }
}

/** Writes the extended sequences file atomically using a rename-based strategy. */
async function writeExtendedSequenceFile(
  data: ExtendedSequenceFile,
  configDir?: string,
): Promise<void> {
  await ensureConfigDir(configDir);
  const filePath = join(getConfigDir(configDir), EXTENDED_SEQUENCES_FILE_NAME);
  const uniqueSuffix = randomBytes(6).toString("hex");
  const tempPath = `${filePath}.${uniqueSuffix}.tmp`;

  const content = JSON.stringify(data, null, 2) + "\n";
  await writeFile(tempPath, content, { encoding: "utf-8", mode: 0o600 });
  await rename(tempPath, filePath);
}

/**
 * Migrates legacy sequences.json to the extended format.
 * This runs automatically when using the new assignment functions.
 */
async function migrateLegacySequences(configDir?: string): Promise<void> {
  const legacyPath = join(getConfigDir(configDir), SEQUENCES_FILE_NAME);
  const extendedPath = join(getConfigDir(configDir), EXTENDED_SEQUENCES_FILE_NAME);

  // Check if extended file already exists
  try {
    await access(extendedPath);
    return; // Already migrated
  } catch {
    // Extended file doesn't exist, check for legacy
  }

  try {
    const content = await readFile(legacyPath, "utf-8");
    let legacy: SequenceFile = {};
    if (content.trim() !== "") {
      legacy = JSON.parse(content);
    }
    await writeExtendedSequenceFile(
      { sequences: legacy, assignments: [], discards: [] },
      configDir,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      // No legacy file either, start fresh
      await writeExtendedSequenceFile({ sequences: {}, assignments: [], discards: [] }, configDir);
    } else {
      throw error;
    }
  }
}

/**
 * Assigns a sequence number and persists the document in a single atomic step.
 * This is the recommended way to assign a sequence — it guarantees that
 * every assigned sequence belongs to a persisted document.
 *
 * @param docType - Document type code (e.g. "01" for Factura)
 * @param branch - Branch/sucursal code (default: "001")
 * @param pos - Point-of-sale code (default: "00001")
 * @param clave - The 50-digit clave numerica of the document
 * @param options - Optional overrides
 * @returns The assigned sequence number
 * @throws {SequenceOverflowError} If the sequence exceeds MAX_SEQUENCE
 * @throws {Error} If the clave already has a different sequence assigned
 * @throws {Error} If the clave's sequence doesn't match the assigned sequence
 */
export async function assignSequenceWithDocument(
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
  clave: string,
  options: SequenceStoreOptions = {},
): Promise<number> {
  const configDir = getConfigDir(options.configDir);
  await ensureConfigDir(options.configDir);
  await migrateLegacySequences(configDir);

  const lockPath = join(configDir, ".sequences.lock");
  const unlock = await acquireLock(lockPath);

  try {
    const key = buildSequenceKey(docType, branch, pos);
    const data = await readExtendedSequenceFile(options.configDir);

    // Check if this clave already has an assignment
    const existingAssignment = data.assignments.find((a) => a.clave === clave);
    if (existingAssignment) {
      throw new Error(
        `Clave ${clave} already has sequence ${existingAssignment.sequence} assigned. ` +
          `Cannot assign a different sequence.`,
      );
    }

    const current = data.sequences[key] ?? 0;

    if (current >= MAX_SEQUENCE) {
      throw new SequenceOverflowError(key, current);
    }

    const next = current + 1;

    // Verify that the clave's sequence matches the assigned sequence
    // Clave format: [country:3][date:6][taxpayer:12][branch:3][pos:5][docType:2][sequence:10][situation:1][security:8]
    // Sequence is at positions 31-40 (0-indexed: 31-40)
    // Allow sequence 0 as a placeholder for "not yet assigned"
    if (clave.length === 50) {
      const claveSequence = parseInt(clave.substring(31, 41), 10);
      if (!Number.isNaN(claveSequence) && claveSequence !== 0 && claveSequence !== next) {
        throw new Error(
          `Clave sequence mismatch: clave contains sequence ${claveSequence} but assigned sequence is ${next}. ` +
            `The clave's sequence must match the assigned sequence.`,
        );
      }
    }

    data.sequences[key] = next;

    // Record the assignment
    const assignment: SequenceAssignment = {
      sequence: next,
      clave,
      docType,
      branch,
      pos,
      assignedAt: new Date().toISOString(),
      emitted: false,
      haciendaStatus: "pendiente",
    };
    data.assignments.push(assignment);

    await writeExtendedSequenceFile(data, options.configDir);

    return next;
  } finally {
    await unlock();
  }
}

/**
 * Marks a sequence as emitted (successfully sent to Hacienda).
 * Updates the assignment record with emission timestamp and status.
 *
 * @param clave - The 50-digit clave numerica
 * @param haciendaStatus - The Hacienda status ("aceptado" | "rechazado" | "pendiente")
 * @param options - Optional overrides
 */
export async function markSequenceEmitted(
  clave: string,
  haciendaStatus: "aceptado" | "rechazado" | "pendiente" = "pendiente",
  options: SequenceStoreOptions = {},
): Promise<void> {
  const configDir = getConfigDir(options.configDir);
  await ensureConfigDir(options.configDir);
  await migrateLegacySequences(configDir);

  const lockPath = join(configDir, ".sequences.lock");
  const unlock = await acquireLock(lockPath);

  try {
    const data = await readExtendedSequenceFile(options.configDir);
    const assignment = data.assignments.find((a) => a.clave === clave);

    if (!assignment) {
      throw new Error(`No assignment found for clave ${clave}`);
    }

    assignment.emitted = true;
    assignment.emittedAt = new Date().toISOString();
    assignment.haciendaStatus = haciendaStatus;

    await writeExtendedSequenceFile(data, options.configDir);
  } finally {
    await unlock();
  }
}

/**
 * Discards a sequence that was assigned but will not be emitted.
 * The sequence is recorded as discarded with a reason and will never
 * be reused.
 *
 * @param clave - The 50-digit clave numerica of the document (optional if never persisted)
 * @param docType - Document type code
 * @param branch - Branch/sucursal code
 * @param pos - Point-of-sale code
 * @param reason - Reason for discarding
 * @param options - Optional overrides
 * @returns The discarded sequence number
 */
export async function discardSequence(
  clave: string | undefined,
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
  reason: string,
  options: SequenceStoreOptions = {},
): Promise<number> {
  const configDir = getConfigDir(options.configDir);
  await ensureConfigDir(options.configDir);
  await migrateLegacySequences(configDir);

  const lockPath = join(configDir, ".sequences.lock");
  const unlock = await acquireLock(lockPath);

  try {
    const key = buildSequenceKey(docType, branch, pos);
    const data = await readExtendedSequenceFile(options.configDir);

    // Find the assignment for this clave (if it was persisted)
    let sequence: number;
    if (clave) {
      const assignment = data.assignments.find((a) => a.clave === clave);
      if (!assignment) {
        throw new Error(`No assignment found for clave ${clave}`);
      }
      if (assignment.emitted) {
        throw new Error(`Cannot discard sequence ${assignment.sequence}: already emitted`);
      }
      sequence = assignment.sequence;
    } else {
      // If no clave, discard the current sequence (last assigned)
      sequence = data.sequences[key] ?? 0;
      if (sequence === 0) {
        throw new Error(`No sequence to discard for ${key}`);
      }
    }

    // Record the discard
    const discard: SequenceDiscard = {
      sequence,
      clave,
      docType,
      branch,
      pos,
      reason,
      discardedAt: new Date().toISOString(),
    };
    data.discards.push(discard);

    await writeExtendedSequenceFile(data, options.configDir);

    return sequence;
  } finally {
    await unlock();
  }
}

/**
 * Queries the series for a given document type, branch, and POS.
 * Returns both assigned (emitted and pending) and discarded sequences.
 *
 * @param docType - Document type code
 * @param branch - Branch/sucursal code
 * @param pos - Point-of-sale code
 * @param options - Optional overrides
 * @returns Object with current sequence, assignments, and discards
 */
export interface SeriesQueryResult {
  key: string;
  currentSequence: number;
  assignments: {
    sequence: number;
    clave: string;
    emitted: boolean;
    emittedAt?: string;
    haciendaStatus: "aceptado" | "rechazado" | "pendiente";
    assignedAt: string;
  }[];
  discards: {
    sequence: number;
    clave?: string;
    reason: string;
    discardedAt: string;
  }[];
}

export async function querySeries(
  docType: string,
  branch: string = DEFAULT_BRANCH,
  pos: string = DEFAULT_POS,
  options: SequenceStoreOptions = {},
): Promise<SeriesQueryResult> {
  const configDir = getConfigDir(options.configDir);
  await ensureConfigDir(options.configDir);
  await migrateLegacySequences(configDir);

  const key = buildSequenceKey(docType, branch, pos);
  const data = await readExtendedSequenceFile(options.configDir);

  const currentSequence = data.sequences[key] ?? 0;
  const relevantAssignments = data.assignments.filter(
    (a) => a.docType === docType && a.branch === branch && a.pos === pos,
  );
  const relevantDiscards = data.discards.filter(
    (d) => d.docType === docType && d.branch === branch && d.pos === pos,
  );

  return {
    key,
    currentSequence,
    assignments: relevantAssignments.map((a) => ({
      sequence: a.sequence,
      clave: a.clave,
      emitted: a.emitted,
      emittedAt: a.emittedAt,
      haciendaStatus: a.haciendaStatus,
      assignedAt: a.assignedAt,
    })),
    discards: relevantDiscards.map((d) => ({
      sequence: d.sequence,
      clave: d.clave,
      reason: d.reason,
      discardedAt: d.discardedAt,
    })),
  };
}

/**
 * Error thrown when trying to use the legacy getNextSequence for a new document
 * without persisting it. This helps enforce the new pattern.
 */
export class LegacySequenceWarning extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LegacySequenceWarning";
  }
}
