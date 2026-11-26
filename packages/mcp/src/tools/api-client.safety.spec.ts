import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthErrorCode,
  ValidationError,
  bootstrapClient,
  loadConfig,
} from "@dojocoding/hacienda-sdk";
import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import type { BootstrapResult, ResolvedConfig } from "@dojocoding/hacienda-sdk";
import { MAX_CACHED_CLIENTS, clearClientCache, createMcpApiClient } from "./api-client.js";

vi.mock("@dojocoding/hacienda-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof HaciendaSdk>();
  return {
    ...actual,
    bootstrapClient: vi.fn(),
    loadConfig: vi.fn(),
  };
});
const bootstrap = vi.mocked(bootstrapClient);
const load = vi.mocked(loadConfig);
let profile: ResolvedConfig["profile"];
const config = (name = "default", env = process.env): ResolvedConfig => ({
  profile: { ...profile, username: env.HACIENDA_USERNAME ?? profile.username },
  profileName: name,
  password: env.HACIENDA_PASSWORD,
  p12Pin: env.HACIENDA_P12_PIN,
});
const result = (label: string, resolved = config()) =>
  ({ httpClient: { label }, config: resolved }) as unknown as BootstrapResult;

describe("MCP cached credential boundaries", () => {
  beforeEach(() => {
    clearClientCache();
    bootstrap.mockReset();
    load.mockReset();
    profile = { environment: "sandbox", cedula_type: "02", cedula: "3101234567", p12_path: "" };
    load.mockImplementation(async (name, options) => config(name, options?.env));
    bootstrap.mockImplementation(async (options) =>
      result("client", config(options?.profileName, options?.configOptions?.env)),
    );
  });
  afterEach(() => {
    clearClientCache();
    vi.unstubAllEnvs();
  });

  it("isolates different named profiles", async () => {
    expect(await createMcpApiClient("a")).not.toBe(await createMcpApiClient("b"));
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });
  it("reuses an unchanged authenticated profile", async () => {
    const first = await createMcpApiClient();
    expect(await createMcpApiClient()).toBe(first);
    expect(load).toHaveBeenCalledTimes(2);
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });
  it("allows explicit invalidation", async () => {
    const first = await createMcpApiClient();
    clearClientCache();
    expect(await createMcpApiClient()).not.toBe(first);
  });
  for (const name of ["HACIENDA_USERNAME", "HACIENDA_PASSWORD", "HACIENDA_P12_PIN"]) {
    it(`invalidates when ${name} changes`, async () => {
      vi.stubEnv(name, "first-fixture");
      const first = await createMcpApiClient();
      vi.stubEnv(name, "rotated-fixture");
      expect(await createMcpApiClient()).not.toBe(first);
      expect(bootstrap).toHaveBeenCalledTimes(2);
    });
  }
  for (const change of [
    { environment: "production" as const },
    { cedula: "3107654321" },
    { username: "changed@stag.comprobanteselectronicos.go.cr" },
    { p12_path: "/new/test.p12" },
  ]) {
    it(`invalidates a file change: ${Object.keys(change)[0]}`, async () => {
      const first = await createMcpApiClient();
      profile = { ...profile, ...change };
      expect(await createMcpApiClient()).not.toBe(first);
    });
  }
  it("does not use a cached identity after a profile is removed", async () => {
    await createMcpApiClient();
    load.mockRejectedValueOnce(new Error("profile removed"));
    await expect(createMcpApiClient()).rejects.toThrow("profile removed");
  });
  it("shares concurrent authentication only for the same snapshot", async () => {
    const [a, b] = await Promise.all([createMcpApiClient(), createMcpApiClient()]);
    expect(a).toBe(b);
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });
  it("does not cache rejected authentication", async () => {
    bootstrap.mockRejectedValueOnce(new Error("auth failed"));
    await expect(createMcpApiClient()).rejects.toThrow("auth failed");
    await createMcpApiClient();
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });
});

describe("MCP explicit scope", () => {
  const issuer = { idType: "02" as const, idNumber: "3101234567" };
  beforeEach(() => {
    clearClientCache();
    bootstrap.mockReset();
    load.mockReset();
    profile = { environment: "sandbox", cedula_type: "02", cedula: "3101234567", p12_path: "" };
    load.mockImplementation(async (name, options) => config(name, options?.env));
    bootstrap.mockImplementation(async (options) =>
      result("client", config(options?.profileName, options?.configOptions?.env)),
    );
  });
  afterEach(() => {
    clearClientCache();
    vi.unstubAllEnvs();
  });

  it.each([
    ["environment", { environment: "production" as const, issuer }],
    [
      "issuer number",
      { environment: "sandbox" as const, issuer: { ...issuer, idNumber: "3107654321" } },
    ],
    [
      "issuer type",
      { environment: "sandbox" as const, issuer: { ...issuer, idType: "01" as const } },
    ],
  ])(
    "rejects a scope whose %s differs from the profile with SCOPE_IDENTITY_MISMATCH",
    async (_n, scope) => {
      await expect(createMcpApiClient("default", scope)).rejects.toMatchObject({
        name: "AuthError",
        code: AuthErrorCode.SCOPE_IDENTITY_MISMATCH,
      });
      expect(bootstrap).not.toHaveBeenCalled();
    },
  );

  it("rejects a mismatch that appears while authenticating and does not cache it", async () => {
    bootstrap.mockImplementationOnce(async (options) =>
      result("client", {
        ...config(options?.profileName),
        profile: { ...profile, cedula: "3107654321" },
      }),
    );
    await expect(
      createMcpApiClient("default", { environment: "sandbox", issuer }),
    ).rejects.toMatchObject({ code: AuthErrorCode.SCOPE_IDENTITY_MISMATCH });
    await createMcpApiClient("default", { environment: "sandbox", issuer });
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "unknown idType",
      { environment: "sandbox", issuer: { idType: "99", idNumber: "3101234567" } },
    ],
    ["empty tenantId", { tenantId: "", environment: "sandbox", issuer }],
    ["unknown environment", { environment: "staging", issuer }],
  ])("validates the scope with ScopeSchema: %s", async (_n, scope) => {
    await expect(
      createMcpApiClient("default", scope as unknown as Parameters<typeof createMcpApiClient>[1]),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("isolates tenants that share a profile", async () => {
    const a = await createMcpApiClient("default", {
      tenantId: "a",
      environment: "sandbox",
      issuer,
    });
    const b = await createMcpApiClient("default", {
      tenantId: "b",
      environment: "sandbox",
      issuer,
    });
    const unscoped = await createMcpApiClient("default");
    expect(a).not.toBe(b);
    expect(unscoped).not.toBe(a);
    expect(unscoped).not.toBe(b);
    expect(bootstrap).toHaveBeenCalledTimes(3);
    expect(
      await createMcpApiClient("default", { tenantId: "a", environment: "sandbox", issuer }),
    ).toBe(a);
    expect(bootstrap).toHaveBeenCalledTimes(3);
  });

  it("derives the same scope from the profile when none is passed", async () => {
    const derived = await createMcpApiClient("default");
    expect(await createMcpApiClient("default", { environment: "sandbox", issuer })).toBe(derived);
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it("invalidates a scoped client when a secret rotates", async () => {
    const scope = { tenantId: "a", environment: "sandbox" as const, issuer };
    vi.stubEnv("HACIENDA_PASSWORD", "first-fixture");
    const first = await createMcpApiClient("default", scope);
    vi.stubEnv("HACIENDA_PASSWORD", "rotated-fixture");
    const second = await createMcpApiClient("default", scope);
    expect(second).not.toBe(first);
    expect(await createMcpApiClient("default", scope)).toBe(second);
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });

  it("bounds the client cache and evicts the least recently used entry", async () => {
    const tenant = (i: number) => ({
      tenantId: `t${String(i)}`,
      environment: "sandbox" as const,
      issuer,
    });
    const first = await createMcpApiClient("default", tenant(0));
    const second = await createMcpApiClient("default", tenant(1));
    for (let i = 2; i < MAX_CACHED_CLIENTS; i++) await createMcpApiClient("default", tenant(i));
    // Touch tenant 0 so tenant 1 becomes the least recently used.
    expect(await createMcpApiClient("default", tenant(0))).toBe(first);
    await createMcpApiClient("default", tenant(MAX_CACHED_CLIENTS));
    expect(bootstrap).toHaveBeenCalledTimes(MAX_CACHED_CLIENTS + 1);
    expect(await createMcpApiClient("default", tenant(0))).toBe(first);
    expect(await createMcpApiClient("default", tenant(1))).not.toBe(second);
    expect(bootstrap).toHaveBeenCalledTimes(MAX_CACHED_CLIENTS + 2);
  });
});
