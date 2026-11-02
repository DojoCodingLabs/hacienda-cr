/** Shared fetch wrapper with a bounded timeout and safe redirect defaults. */
export interface FetchWithTimeoutOptions {
  /** Per-request timeout in milliseconds (default: 30000). */
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

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  validateTimeout(timeoutMs);
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const redirect = options.redirect ?? "error";

  const controller = new AbortController();
  const combinedSignal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  const timer = setTimeout(
    () => controller.abort(new DOMException("HTTP request timed out.", "TimeoutError")),
    timeoutMs,
  );

  const onAbort = () => {
    // no-op; handled by the abort promise below
  };
  void onAbort;

  const abortPromise = new Promise<never>((_, reject) => {
    const rejectOnAbort = () => reject(combinedSignal.reason);
    if (combinedSignal.aborted) {
      rejectOnAbort();
      return;
    }
    combinedSignal.addEventListener("abort", rejectOnAbort, { once: true });
  });

  try {
    return await Promise.race([
      fetchFn(input, {
        ...init,
        redirect,
        signal: combinedSignal,
      }),
      abortPromise,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
