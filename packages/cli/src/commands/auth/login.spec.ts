import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginCommand } from "./login.js";
import { runCommand } from "../../__fixtures__/run-command.js";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  saveConfig: vi.fn(),
  listProfiles: vi.fn(),
  loadConfig: vi.fn(),
}));
vi.mock("@dojocoding/hacienda-sdk", async (original) => {
  const sdk = await original<typeof HaciendaSdk>();
  return {
    ...sdk,
    TokenManager: class {
      authenticate = mocks.authenticate;
    },
    ensureConfigDir: vi.fn(),
    // Never read the user's real ~/.hacienda-cr from a test.
    listProfiles: mocks.listProfiles,
    loadConfig: mocks.loadConfig,
    saveConfig: mocks.saveConfig.mockImplementation(async (profile) => {
      sdk.ProfileSchema.parse(profile);
    }),
  };
});

const username = "cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr";
const args = {
  "cedula-type": "01",
  cedula: "112345678",
  password: "secret",
  environment: "sandbox",
  profile: "test",
  json: true,
};

describe("auth login issued usernames", () => {
  let originalExitCode: typeof process.exitCode;
  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.clearAllMocks();
    mocks.listProfiles.mockResolvedValue([]);
    vi.stubEnv("HACIENDA_USERNAME", username);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([undefined, "explicit-user@stag.comprobanteselectronicos.go.cr"])(
    "authenticates and saves the issued username with --username=%s",
    async (explicit) => {
      await runCommand(loginCommand, { ...args, username: explicit });
      const expected = explicit ?? username;
      expect(mocks.authenticate).toHaveBeenCalledWith({ username: expected, password: "secret" });
      expect(mocks.saveConfig).toHaveBeenCalledWith(
        {
          environment: "sandbox",
          cedula_type: "01",
          cedula: args.cedula,
          username: expected,
          p12_path: "",
        },
        "test",
      );
      expect(process.exitCode).toBeUndefined();
    },
  );

  it("saves --provider-id as the profile's provider_id", async () => {
    await runCommand(loginCommand, { ...args, "provider-id": "310ABC1234" });
    expect(mocks.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ provider_id: "310ABC1234" }),
      "test",
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("keeps the existing profile's provider_id when --provider-id is omitted", async () => {
    mocks.listProfiles.mockResolvedValue(["test"]);
    mocks.loadConfig.mockResolvedValue({ profile: { provider_id: "3101999999" } });
    await runCommand(loginCommand, args);
    expect(mocks.loadConfig).toHaveBeenCalledWith("test");
    expect(mocks.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ provider_id: "3101999999" }),
      "test",
    );
  });

  it("rejects a malformed --provider-id before authenticating", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await runCommand(loginCommand, { ...args, "provider-id": "31-01" });
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.saveConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("fails invalid explicit username before authentication or saving", async () => {
    await runCommand(loginCommand, { ...args, username: "" });
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.saveConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
