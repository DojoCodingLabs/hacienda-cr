import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client.js";
import { submitAndWait } from "./orchestrator.js";
import { withRetry } from "./retry.js";
import { RateLimiter } from "./rate-limiter.js";
import { withSignal } from "./cancellation.js";
import { TokenManager } from "../auth/token-manager.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";

const config = {
  name: "Test",
  apiBaseUrl: "https://example.invalid",
  idpTokenUrl: "https://idp.invalid",
  clientId: "test",
};
const request = {
  clave: SIMPLE_INVOICE.clave,
  fecha: SIMPLE_INVOICE.fechaEmision,
  emisor: { tipoIdentificacion: "02" as const, numeroIdentificacion: "3101234567" },
  comprobanteXml: "local-only",
};
function http(fetchFn: typeof fetch, requestTimeoutMs = 30000) {
  return new HttpClient({
    envConfig: config,
    fetchFn,
    requestTimeoutMs,
    rateLimiterOptions: false,
    retryOptions: { maxRetries: 2, initialDelayMs: 10 },
    tokenManager: { getAccessToken: async () => "local-secret" } as TokenManager,
  });
}
function pending(): Promise<never> {
  return new Promise(() => undefined);
}

describe("submission deadlines and cancellation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("expires before polling when the first wait exceeds the remaining budget", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }));
    const result = submitAndWait(http(fetchFn), request, { timeoutMs: 10, pollIntervalMs: 100 });
    const check = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(11);
    await check;
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("aborts a hanging submission and never retries it", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(pending);
    const check = expect(submitAndWait(http(fetchFn), request, { timeoutMs: 10 })).rejects.toThrow(
      "timed out",
    );
    await vi.advanceTimersByTimeAsync(11);
    await check;
    const signal = fetchFn.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects a late poll result and suppresses the callback", async () => {
    let finish: ((response: Response) => void) | undefined;
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    const onPoll = vi.fn();
    const check = expect(
      submitAndWait(http(fetchFn), request, { timeoutMs: 10, pollIntervalMs: 0, onPoll }),
    ).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(11);
    await check;
    finish?.(
      new Response(JSON.stringify({ clave: request.clave, "ind-estado": "aceptado" }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(onPoll).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not submit an already cancelled operation", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const fetchFn = vi.fn<typeof fetch>();
    await expect(
      submitAndWait(http(fetchFn), request, { signal: controller.signal }),
    ).rejects.toThrow("cancelled");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds a standalone HTTP request and response body read", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start() {
          /* never emits */
        },
      }),
    );
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    const check = expect(http(fetchFn, 10).get("/status")).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(11);
    await check;
    expect(response.body?.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels retry backoff without another attempt", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new TypeError("offline"));
    const check = expect(
      withRetry(fn, { signal: controller.signal, initialDelayMs: 1000 }),
    ).rejects.toThrow("cancelled");
    await vi.advanceTimersByTimeAsync(0);
    controller.abort(new Error("cancelled"));
    await check;
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels a rate-limit wait without executing the operation", async () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    await limiter.execute(async () => undefined);
    const controller = new AbortController();
    const fn = vi.fn();
    const check = expect(limiter.execute(fn, controller.signal)).rejects.toThrow("cancelled");
    controller.abort(new Error("cancelled"));
    await check;
    expect(fn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("removes listeners on successful and failed operations", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    await withSignal(async () => "ok", controller.signal);
    await expect(
      withSignal(async () => {
        throw new Error("failed");
      }, controller.signal),
    ).rejects.toThrow("failed");
    expect(remove).toHaveBeenCalledTimes(2);
  });
  it.each([0, -1, NaN, Infinity, 2147483648])("rejects invalid timeout %s", async (timeoutMs) => {
    await expect(submitAndWait(http(vi.fn()), request, { timeoutMs })).rejects.toThrow("Invalid");
  });
  it("bounds an unresponsive token endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(pending);
    const tm = new TokenManager({ envConfig: config, fetchFn });
    const check = expect(
      tm.authenticate({ username: "test", password: "never-log-this" }),
    ).rejects.toThrow("network error");
    await vi.advanceTimersByTimeAsync(30001);
    await check;
    expect(fetchFn.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("HTTP and credential security", () => {
  it("never automatically replays a failed POST", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("lost response"));
    await expect(http(fetchFn).post("/recepcion", request)).rejects.toThrow("Network error");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it("still retries safe GET requests", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(
        new Response("{}", { headers: { "Content-Type": "application/json" } }),
      );
    await http(fetchFn).get("/status");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
  it("disables redirects on authenticated API requests", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    await http(fetchFn).get("/status");
    expect(fetchFn.mock.calls[0]?.[1]?.redirect).toBe("error");
  });
  it("caps streamed decoded responses even without Content-Length", async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array(8 * 1024 * 1024 + 1));
        },
        cancel() {
          cancelled = true;
        },
      }),
    );
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(http(fetchFn).get("/status")).rejects.toThrow("limit");
    expect(cancelled).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it("does not expose malformed successful token responses", async () => {
    const tm = new TokenManager({
      envConfig: config,
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(new Response("never-log-this")),
    });
    const error = await tm
      .authenticate({ username: "test", password: "never-log-this" })
      .catch((error) => error as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Invalid token response from IDP.");
    expect((error as Error).cause).toBeUndefined();
    expect(tm.isAuthenticated).toBe(false);
  });
  it("does not expose echoed credentials from the token endpoint", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: "invalid_grant", error_description: "never-log-this" }),
          { status: 401 },
        ),
      );
    const tm = new TokenManager({ envConfig: config, fetchFn });
    const error = await tm
      .authenticate({ username: "test", password: "never-log-this" })
      .catch((error) => error as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("never-log-this");
    expect(fetchFn.mock.calls[0]?.[1]?.redirect).toBe("error");
  });
});
