import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginCommand } from "./login.js";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), saveConfig: vi.fn() }));
vi.mock("@dojocoding/hacienda-sdk", async (original) => {
  const sdk = await original<typeof HaciendaSdk>();
  return {
    ...sdk,
    TokenManager: class {
      authenticate = mocks.authenticate;
    },
    ensureConfigDir: vi.fn(),
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
      await loginCommand.run?.({
        args: { ...args, username: explicit },
        rawArgs: [],
        cmd: loginCommand,
      });
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

  it("fails invalid explicit username before authentication or saving", async () => {
    await loginCommand.run?.({ args: { ...args, username: "" }, rawArgs: [], cmd: loginCommand });
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.saveConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
