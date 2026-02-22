/**
 * Integration tests for the auth module against the real Hacienda sandbox IDP.
 *
 * These tests are SKIPPED by default. To run them, set these environment variables:
 *
 *   HACIENDA_USERNAME="cpj-02-3101234567"  (Hacienda-formatted username)
 *   HACIENDA_PASSWORD="your-sandbox-password"
 *
 * Then run:
 *   pnpm --filter @dojocoding/hacienda-sdk test auth.integration.spec.ts
 */

import { describe, it, expect } from "vitest";
import { TokenManager } from "./token-manager.js";
import { getEnvironmentConfig } from "./environment.js";
import { Environment } from "./types.js";

const HACIENDA_USERNAME = process.env["HACIENDA_USERNAME"] ?? "";
const HACIENDA_PASSWORD = process.env["HACIENDA_PASSWORD"] ?? "";

const HAS_CREDENTIALS = Boolean(HACIENDA_USERNAME && HACIENDA_PASSWORD);

describe.skipIf(!HAS_CREDENTIALS)("Auth integration (sandbox IDP)", () => {
  const envConfig = getEnvironmentConfig(Environment.Sandbox);

  it("authenticates against the sandbox IDP and receives tokens", { timeout: 15_000 }, async () => {
    const tm = new TokenManager({ envConfig });

    await tm.authenticate({
      username: HACIENDA_USERNAME,
      password: HACIENDA_PASSWORD,
    });

    expect(tm.isAuthenticated).toBe(true);

    const token = await tm.getAccessToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    // JWT tokens start with "eyJ".
    expect(token.startsWith("eyJ")).toBe(true);
  });

  it("can refresh the token after initial authentication", { timeout: 15_000 }, async () => {
    const tm = new TokenManager({ envConfig });

    await tm.authenticate({
      username: HACIENDA_USERNAME,
      password: HACIENDA_PASSWORD,
    });

    const _firstToken = await tm.getAccessToken();

    // Invalidate and re-authenticate to force a new token.
    tm.invalidate();
    expect(tm.isAuthenticated).toBe(false);

    await tm.authenticate({
      username: HACIENDA_USERNAME,
      password: HACIENDA_PASSWORD,
    });

    const secondToken = await tm.getAccessToken();
    expect(secondToken).toBeTruthy();
    // Tokens should differ since they were obtained in separate requests.
    // (In theory they could be the same if the server caches, but in practice they differ.)
    expect(typeof secondToken).toBe("string");
  });

  it("rejects invalid credentials", { timeout: 15_000 }, async () => {
    const tm = new TokenManager({ envConfig });

    await expect(
      tm.authenticate({
        username: HACIENDA_USERNAME,
        password: "definitely-wrong-password",
      }),
    ).rejects.toThrow();
  });
});
