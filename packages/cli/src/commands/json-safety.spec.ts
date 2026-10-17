import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import { submitCommand } from "./submit.js";
import { validateCommand } from "./validate.js";
import { createAuthenticatedClient } from "../utils/api-client.js";

vi.mock("../utils/api-client.js", () => ({
  createAuthenticatedClient: vi.fn(() => {
    throw new Error("Authentication must never run in these local checks");
  }),
}));

describe("CLI machine-readable local failures and dry-run boundary", () => {
  let directory: string;
  let priorExitCode: typeof process.exitCode;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "hacienda-cli-json-"));
    priorExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(createAuthenticatedClient).mockClear();
  });
  afterEach(async () => {
    process.exitCode = priorExitCode;
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it.each([
    ["submit", "missing"],
    ["submit", "malformed"],
    ["validate", "missing"],
    ["validate", "malformed"],
  ] as const)("%s --json returns parseable JSON for %s input", async (name, condition) => {
    const file = join(directory, "invoice.json");
    if (condition === "malformed") await writeFile(file, "{not valid JSON");
    const command = name === "submit" ? submitCommand : validateCommand;
    await command.run?.({
      args: { file, json: true, "dry-run": true, profile: "default" },
      rawArgs: [],
      cmd: command,
    });
    expect(process.exitCode).toBe(1);
    expect(console.log).toHaveBeenCalledOnce();
    const result = JSON.parse(String(vi.mocked(console.log).mock.calls[0]?.[0]));
    expect(result).toMatchObject(name === "submit" ? { success: false } : { valid: false });
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
  });

  it("submit --dry-run validates real XML without authentication or signing", async () => {
    const file = join(directory, "invoice.json");
    await writeFile(file, JSON.stringify(SIMPLE_INVOICE));
    await submitCommand.run?.({
      args: { file, json: true, "dry-run": true, profile: "nonexistent" },
      rawArgs: [],
      cmd: submitCommand,
    });
    expect(process.exitCode).toBeUndefined();
    const result = JSON.parse(String(vi.mocked(console.log).mock.calls[0]?.[0]));
    expect(result).toMatchObject({ success: true, dryRun: true });
    expect(result.xml).toContain("FacturaElectronica");
    expect(result.xml).not.toContain("SignatureValue");
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
  });
});
