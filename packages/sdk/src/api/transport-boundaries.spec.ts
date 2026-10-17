import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client.js";
import { TokenManager } from "../auth/token-manager.js";
import { Environment } from "../auth/types.js";
import { getEnvironmentConfig } from "../auth/environment.js";

const servers: Server[] = [];
async function listen(handler: Parameters<typeof createServer>[0]) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

describe("native HTTP transport boundaries", () => {
  it("does not forward credentials or bearer tokens across redirects", async () => {
    let destinationCalls = 0;
    const destination = await listen((_req, res) => {
      destinationCalls++;
      res.end("{}");
    });
    const source = await listen((_req, res) => {
      res.writeHead(307, { Location: destination });
      res.end();
    });
    const config = {
      ...getEnvironmentConfig(Environment.Sandbox),
      apiBaseUrl: source,
      idpTokenUrl: source,
    };
    const tm = new TokenManager({ envConfig: config });
    await expect(
      tm.authenticate({ username: "fixture", password: "fixture-password" }),
    ).rejects.toThrow("network error");
    vi.spyOn(tm, "getAccessToken").mockResolvedValue("fixture-bearer");
    const client = new HttpClient({
      envConfig: config,
      tokenManager: tm,
      rateLimiterOptions: false,
    });
    await expect(client.post("/recepcion", {})).rejects.toThrow("Network error");
    expect(destinationCalls).toBe(0);
  });

  it("bounds stalled authentication, mutation, and response-body reads", async () => {
    const source = await listen((req, res) => {
      if (req.url === "/body") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write('{"pending":');
      }
    });
    const config = {
      ...getEnvironmentConfig(Environment.Sandbox),
      apiBaseUrl: source,
      idpTokenUrl: source,
    };
    const tm = new TokenManager({ envConfig: config, requestTimeoutMs: 50 });
    await expect(
      tm.authenticate({ username: "fixture", password: "fixture-password" }),
    ).rejects.toThrow();
    vi.spyOn(tm, "getAccessToken").mockResolvedValue("fixture-bearer");
    const client = new HttpClient({
      envConfig: config,
      tokenManager: tm,
      requestTimeoutMs: 50,
      rateLimiterOptions: false,
    });
    await expect(client.post("/recepcion", {})).rejects.toThrow();
    await expect(client.get("/body", { skipRetry: true })).rejects.toThrow();
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid timeout %s", (requestTimeoutMs) => {
    const envConfig = getEnvironmentConfig(Environment.Sandbox);
    expect(() => new TokenManager({ envConfig, requestTimeoutMs })).toThrow(RangeError);
    const tokenManager = new TokenManager({ envConfig });
    expect(() => new HttpClient({ envConfig, tokenManager, requestTimeoutMs })).toThrow(RangeError);
  });
});
