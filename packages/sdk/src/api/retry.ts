/**
 * Exponential backoff retry logic for HTTP requests.
 *
 * Retries only on 5xx server errors and network failures.
 * Never retries on 4xx client errors.
 *
 * Default strategy: 1s, 2s, 4s delays (3 retries max).
 *
 * @module api/retry
 */

import { ApiError } from "../errors.js";
import { isRetryableStatus } from "./error-codes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the retry strategy. */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3). */
  readonly maxRetries?: number;
  /** Initial delay in milliseconds before the first retry (default: 1000). */
  readonly initialDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2). */
  readonly backoffMultiplier?: number;
  /** Maximum delay cap in milliseconds (default: 8000). */
  readonly maxDelayMs?: number;
}

/** Default retry configuration. */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 8000,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes an async function with exponential backoff retry.
 *
 * Retries are triggered only for:
 * - Network errors (TypeError from fetch)
 * - Server errors (HTTP 5xx) surfaced as {@link ApiError}
 *
 * Client errors (4xx) are NOT retried and are immediately rethrown.
 *
 * @param fn - The async operation to execute (and possibly retry).
 * @param options - Optional retry configuration.
 * @returns The result of the successful operation.
 * @throws The last error if all retries are exhausted.
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => httpClient.post("/recepcion", body),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Only retry on retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Wait with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determines if an error is retryable.
 *
 * Retryable errors are:
 * - Network errors (TypeError from fetch, or ApiError with no status code)
 * - Server errors (ApiError with 5xx status code)
 */
function isRetryableError(error: unknown): boolean {
  // Network errors from fetch (e.g., DNS resolution failure, connection refused)
  if (error instanceof TypeError) {
    return true;
  }

  // ApiError with a status code — check if it's a server error
  if (error instanceof ApiError) {
    if (error.statusCode === undefined) {
      // Network-level failure (no HTTP response)
      return true;
    }
    return isRetryableStatus(error.statusCode);
  }

  return false;
}

/** Promise-based sleep. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
