import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestP12 } from "../../../sdk/src/__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import { submitCommand } from "./submit.js";
import { validateCommand } from "./validate.js";

const mocks = vi.hoisted(() => ({ submitAndWait: vi.fn(), signAndEncode: vi.fn() }));
vi.mock("@dojocoding/hacienda-sdk", async (original) => ({
  ...(await original<typeof HaciendaSdk>()),
  submitAndWait: mocks.submitAndWait,
  signAndEncode: mocks.signAndEncode,
}));
vi.mock("../utils/api-client.js", () => ({
  createAuthenticatedClient: vi.fn(async () => ({
    httpClient: {},
    config: { profile: {}, p12Pin: "test-pin" },
  })),
}));

describe("CLI submission and XML validation", () => {
  let dir: string;
  let originalExitCode: typeof process.exitCode;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hacienda-cli-audit-"));
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.submitAndWait.mockReset();
    mocks.signAndEncode.mockReset();
  });
  afterEach(async () => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it.each([true, false])("fails rejected submissions with json=%s", async (json) => {
    const file = join(dir, "invoice.json");
    const p12 = join(dir, "cert.p12");
    await writeFile(file, JSON.stringify(SIMPLE_INVOICE));
    await writeFile(p12, "mock-certificate");
    // Keep XML building, signing, and both schema validations real.
    const { signXml } = await import("@dojocoding/hacienda-sdk");
    const buffer = createTestP12("test-pin");
    const { buildFacturaXml } = await import("@dojocoding/hacienda-sdk");
    mocks.signAndEncode.mockResolvedValue(
      Buffer.from(await signXml(buildFacturaXml(SIMPLE_INVOICE), buffer, "test-pin")).toString(
        "base64",
      ),
    );
    mocks.submitAndWait.mockResolvedValue({
      accepted: false,
      status: "rechazado",
      clave: SIMPLE_INVOICE.clave,
      pollAttempts: 1,
    });
    await submitCommand.run?.({
      args: { file, p12, json, profile: "default", "dry-run": false },
      rawArgs: [],
      cmd: submitCommand,
    });
    expect(mocks.submitAndWait).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(1);
    if (json)
      expect(JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]))).toMatchObject({
        success: false,
        status: "rechazado",
      });
  });

  it("rejects malformed XML with the actual validate command", async () => {
    const file = join(dir, "malformed.xml");
    await writeFile(file, "<FacturaElectronica><Clave><NumeroConsecutivo><FechaEmision><Emisor>");
    await validateCommand.run?.({ args: { file, json: true }, rawArgs: [], cmd: validateCommand });
    expect(process.exitCode).toBe(1);
    expect(JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]))).toMatchObject({
      valid: false,
    });
  });
});
