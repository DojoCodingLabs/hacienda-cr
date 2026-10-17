import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client.js";
import { TokenManager } from "../auth/token-manager.js";
import { Environment } from "../auth/types.js";
import { getEnvironmentConfig } from "../auth/environment.js";

describe("HTTP retry safety at the transport boundary", () => {
  function client(fetchFn: typeof fetch, retryUnsafeRequests = false) {
    const tokenManager = new TokenManager({ envConfig: getEnvironmentConfig(Environment.Sandbox) });
    vi.spyOn(tokenManager, "getAccessToken").mockResolvedValue("fixture-token");
    return new HttpClient({
      envConfig: getEnvironmentConfig(Environment.Sandbox),
      tokenManager,
      fetchFn,
      retryUnsafeRequests,
      rateLimiterOptions: false,
      retryOptions: { maxRetries: 1, initialDelayMs: 1 },
    });
  }

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
    "does not replay %s on a lost response",
    async (method) => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new TypeError("Simulated connection lost"));
      await expect(
        client(fetchFn).request({ method, path: "/recepcion", body: {} }),
      ).rejects.toThrow();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
  );

  it("still retries GET on a transient server failure", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } }),
      );
    expect((await client(fetchFn).get("/recepcion/fixture")).data).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("requires explicit opt-in to retry a mutation and honors skipRetry", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response("unavailable", { status: 503 }));
    await expect(client(fetchFn, true).post("/idempotent-example", {})).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    fetchFn.mockClear();
    await expect(
      client(fetchFn, true).post("/idempotent-example", {}, { skipRetry: true }),
    ).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("HTTP reflected-token diagnostics", () => {
  it("redacts a programmatically supplied bearer token echoed without its prefix", async () => {
    const envConfig = getEnvironmentConfig(Environment.Sandbox);
    const tokenManager = new TokenManager({ envConfig });
    vi.spyOn(tokenManager, "getAccessToken").mockResolvedValue("programmatic-fixture-secret");
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("echo: programmatic-fixture-secret"));
    const client = new HttpClient({ envConfig, tokenManager, fetchFn, rateLimiterOptions: false });
    try {
      await client.post("/recepcion", {});
      throw new Error("Request unexpectedly succeeded");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("[REDACTED]");
      expect((error as Error).message).not.toContain("programmatic-fixture-secret");
    }
  });
});
