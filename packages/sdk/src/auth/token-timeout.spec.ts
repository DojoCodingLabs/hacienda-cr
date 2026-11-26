import { describe, expect, it, vi } from "vitest";
import { TokenManager } from "./token-manager.js";
import { Environment } from "./types.js";
import { getEnvironmentConfig } from "./environment.js";

const envConfig = getEnvironmentConfig(Environment.Sandbox);
const credentials = { username: "cpj-02-3101234567", password: "fixture-password" };

/** A response whose headers arrive immediately and whose body never finishes. */
function stalledBody(status: number, signals: AbortSignal[]): typeof fetch {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal) signals.push(init.signal);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"access_token":'));
      },
    });
    return new Response(body, { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

describe("TokenManager request deadline", () => {
  it("bounds a token response whose body stalls after the headers", async () => {
    const signals: AbortSignal[] = [];
    const tm = new TokenManager({
      envConfig,
      fetchFn: stalledBody(200, signals),
      requestTimeoutMs: 30,
    });
    const started = Date.now();
    const error = await tm
      .authenticate(credentials)
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ name: "TimeoutError" });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(tm.isAuthenticated).toBe(false);
  });

  it("bounds a stalled error body and still reports the HTTP failure", async () => {
    const tm = new TokenManager({
      envConfig,
      fetchFn: stalledBody(401, []),
      requestTimeoutMs: 30,
    });
    await expect(tm.authenticate(credentials)).rejects.toMatchObject({
      name: "AuthError",
      message: "Token request failed with status 401",
    });
  });

  it("wraps a header timeout as a token request network failure", async () => {
    const fetchFn = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    ) as typeof fetch;
    const tm = new TokenManager({ envConfig, fetchFn, requestTimeoutMs: 20 });
    const error = await tm
      .authenticate(credentials)
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({
      name: "AuthError",
      message: "Token request failed: network error.",
    });
    expect((error as Error).cause).toMatchObject({ name: "TimeoutError" });
  });
});
