/**
 * Shared fetch wrapper with a bounded timeout and safe redirect defaults.
 *
 * @module api/fetch-with-timeout
 */

import { withSignal } from "./cancellation.js";

/** Options for {@link fetchWithTimeout}. */
export interface FetchWithTimeoutOptions {
  /** Timeout in milliseconds until response headers arrive (default: 30000). */
  readonly timeoutMs?: number;
  /** Fetch implementation to use (default: global fetch). */
  readonly fetchFn?: typeof fetch;
  /** Redirect handling (default: "error"). */
  readonly redirect?: RequestRedirect;
}

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_TIMEOUT_MS = 2147483647;

function validateTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new RangeError("Invalid HTTP request timeout.");
  }
}

/**
 * Calls `fetch` with a timeout, `redirect: "error"` by default and support for
 * an external `init.signal`.
 *
 * The timeout covers the request until the response headers arrive; the timer
 * and the listener on `init.signal` are removed when this function settles.
 * Reading the body is NOT covered: callers that read it must pass a
 * request-scoped signal as `init.signal` and the same signal to the body
 * reader (for example `readResponseText(response, max, signal)`), so a
 * stalled body is still bounded.
 *
 * @throws The abort reason (a `TimeoutError` DOMException on timeout, or the
 *   external signal's reason), or the underlying fetch error.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  validateTimeout(timeoutMs);
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const redirect = options.redirect ?? "error";
  const external = init.signal ?? undefined;
  external?.throwIfAborted();

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(external?.reason);
  external?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new DOMException("HTTP request timed out.", "TimeoutError")),
    timeoutMs,
  );

  try {
    return await withSignal(
      () => fetchFn(input, { ...init, redirect, signal: controller.signal }),
      controller.signal,
    );
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }
}
