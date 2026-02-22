/**
 * Token bucket rate limiter for Hacienda API requests.
 *
 * Hacienda has undocumented rate limits. This module implements a simple
 * token bucket algorithm with conservative defaults (10 requests/second)
 * to avoid triggering 429 responses.
 *
 * The rate limiter is automatically integrated with the {@link HttpClient}
 * so all outbound requests are throttled transparently.
 *
 * @module api/rate-limiter
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the rate limiter. */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed per window (default: 10). */
  readonly maxRequests?: number;
  /** Time window in milliseconds (default: 1000 — i.e., per second). */
  readonly windowMs?: number;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Conservative default: 10 requests per second. */
const DEFAULT_RATE_LIMITER_OPTIONS: Required<RateLimiterOptions> = {
  maxRequests: 10,
  windowMs: 1000,
};

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

/**
 * Token bucket rate limiter.
 *
 * Tracks request timestamps in a sliding window and delays execution
 * when the rate limit would be exceeded. This prevents overwhelming
 * the Hacienda API with concurrent requests.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });
 *
 * // Will automatically delay if rate limit is exceeded
 * const result = await limiter.execute(() => fetch(url));
 * ```
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly timestamps: number[];

  constructor(options?: RateLimiterOptions) {
    const config = { ...DEFAULT_RATE_LIMITER_OPTIONS, ...options };
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.timestamps = [];
  }

  /**
   * Executes an async function, waiting if necessary to stay within
   * the rate limit.
   *
   * @param fn - The async operation to execute.
   * @returns The result of the operation.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    this.recordRequest();
    return fn();
  }

  /**
   * Returns the number of requests available in the current window.
   */
  get availableTokens(): number {
    this.pruneExpired();
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  /**
   * Resets the rate limiter, clearing all tracked timestamps.
   */
  reset(): void {
    this.timestamps.length = 0;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Waits until a request slot is available within the current window.
   */
  private async waitForSlot(): Promise<void> {
    this.pruneExpired();

    if (this.timestamps.length < this.maxRequests) {
      return;
    }

    // Calculate how long to wait until the oldest request falls outside
    // the window
    const oldest = this.timestamps[0];
    if (oldest === undefined) {
      return;
    }

    const now = Date.now();
    const waitMs = oldest + this.windowMs - now;

    if (waitMs > 0) {
      await sleep(waitMs);
      // After waiting, prune again to free the slot
      this.pruneExpired();
    }
  }

  /**
   * Records the current request timestamp.
   */
  private recordRequest(): void {
    this.timestamps.push(Date.now());
  }

  /**
   * Removes timestamps that are outside the current sliding window.
   */
  private pruneExpired(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && (this.timestamps[0] ?? Infinity) <= cutoff) {
      this.timestamps.shift();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Promise-based sleep. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
