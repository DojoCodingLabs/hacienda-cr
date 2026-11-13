import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestP12 } from "../../../sdk/src/__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import { submitCommand } from "./submit.js";
import { validateCommand } from "./validate.js";
import { DraftFacturaSchema, type DraftFactura } from "../utils/draft-document.js";
import { buildDraftSummary, calculateDraftLineMoney } from "../utils/draft-money.js";

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

function exactDraftFixture(): DraftFactura {
  const sourceLine = SIMPLE_INVOICE.detalleServicio[0];
  const sourceTax = sourceLine?.impuesto?.[0];
  if (!sourceLine || !sourceTax) throw new Error("SIMPLE_INVOICE fixture is incomplete");

  const line = calculateDraftLineMoney({
    cantidad: "1",
    precioUnitario: "100",
    tarifa: 13,
  });
  const { baseImponible: _, ...simpleLine } = sourceLine;

  return DraftFacturaSchema.parse({
    ...SIMPLE_INVOICE,
    detalleServicio: [
      {
        ...simpleLine,
        cantidad: line.cantidad,
        precioUnitario: line.precioUnitario,
        montoTotal: line.montoTotal,
        subTotal: line.subTotal,
        impuesto: [{ ...sourceTax, tarifa: "13", monto: line.impuestoMonto }],
        impuestoNeto: line.impuestoNeto,
        montoTotalLinea: line.montoTotalLinea,
      },
    ],
    resumenFactura: buildDraftSummary(
      [{ subTotal: line.subTotal, impuestoNeto: line.impuestoNeto, taxable: true }],
      "01",
    ),
  });
}

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

  it("accepts a decimal-text draft in validate and submit --dry-run", async () => {
    const file = join(dir, "exact-draft.json");
    const draft = exactDraftFixture();
    await writeFile(file, JSON.stringify(draft));

    await validateCommand.run?.({ args: { file, json: true }, rawArgs: [], cmd: validateCommand });
    expect(process.exitCode).toBeUndefined();
    expect(JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]))).toMatchObject({
      valid: true,
      money: "decimal-text",
    });

    await submitCommand.run?.({
      args: { file, json: true, profile: "default", "dry-run": true },
      rawArgs: [],
      cmd: submitCommand,
    });
    expect(process.exitCode).toBeUndefined();
    const output = JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0])) as {
      success?: boolean;
      dryRun?: boolean;
      xml?: string;
    };
    expect(output).toMatchObject({ success: true, dryRun: true });
    expect(output.xml).toContain("<MontoTotal>100.00000</MontoTotal>");
    expect(output.xml).toContain("<TotalComprobante>113.00000</TotalComprobante>");
  });
});
