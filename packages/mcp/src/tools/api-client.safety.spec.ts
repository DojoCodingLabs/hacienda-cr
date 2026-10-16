import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapClient, loadConfig } from "@dojocoding/hacienda-sdk";
import type { BootstrapResult, ResolvedConfig } from "@dojocoding/hacienda-sdk";
import { clearClientCache, createMcpApiClient } from "./api-client.js";

vi.mock("@dojocoding/hacienda-sdk", () => ({ bootstrapClient: vi.fn(), loadConfig: vi.fn() }));
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
