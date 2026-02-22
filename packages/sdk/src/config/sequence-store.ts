/**
 * Sequence number persistence for the clave numerica.
 *
 * Each document type requires a sequential number (up to 10 digits).
 * Sequences are persisted to ~/.hacienda-cr/sequences.json and keyed
 * by "{docType}-{branch}-{pos}".
 */

import { readFile, writeFile, rename, mkdir, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
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
          // Stale lock — force remove and retry
          try {
            await rm(lockPath, { recursive: true });
          } catch {
            throw new Error(
              `Failed to acquire sequence lock at ${lockPath} after ${String(LOCK_TIMEOUT_MS)}ms. ` +
                `If this persists, manually remove the lock directory.`,
            );
          }
          continue;
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
  const key = buildSequenceKey(docType, branch, pos);
  const sequences = await readSequenceFile(options.configDir);
  sequences[key] = value;
  await writeSequenceFile(sequences, options.configDir);
}
