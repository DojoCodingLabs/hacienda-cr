import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestP12 } from "../../../sdk/src/__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import type { FacturaElectronica } from "@dojocoding/hacienda-shared";
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

/**
 * A draft exactly as 0.13.0 saved it: decimal-text money, a JSON-number IVA
 * `tarifa`, and the 0.13.0 `buildDraftSummary` totals. Values are literal so
 * later helper changes cannot silently reshape the fixture.
 */
function draft0130Fixture(tarifa: unknown = 13): Record<string, unknown> {
  const { detalleServicio: _lines, resumenFactura: _summary, ...header } = SIMPLE_INVOICE;
  return {
    ...header,
    detalleServicio: [
      {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: "1",
        unidadMedida: "Sp",
        detalle: "Servicio de consultoria en TI",
        precioUnitario: "100",
        montoTotal: "100",
        subTotal: "100",
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa, monto: "13" }],
        impuestoNeto: "13",
        montoTotalLinea: "113",
      },
    ],
    resumenFactura: {
      totalServGravados: "0",
      totalServExentos: "0",
      totalMercanciasGravadas: "100",
      totalMercanciasExentas: "0",
      totalGravado: "100",
      totalExento: "0",
      totalVenta: "100",
      totalDescuentos: "0",
      totalVentaNeta: "100",
      totalImpuesto: "13",
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
      totalComprobante: "113",
    },
  };
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

  it("keeps loading a 0.13.0 draft with a numeric tarifa and its verbatim XML bytes", async () => {
    const file = join(dir, "draft-0.13.0.json");
    const legacy = draft0130Fixture();
    await writeFile(file, JSON.stringify(legacy));

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
      xml?: string;
    };
    expect(output.success).toBe(true);
    // 0.13.0 serialized the validated draft verbatim through buildFacturaXml.
    const { buildFacturaXml } = await import("@dojocoding/hacienda-sdk");
    expect(output.xml).toBe(buildFacturaXml(legacy as unknown as FacturaElectronica));
    expect(output.xml).toContain("<Tarifa>13</Tarifa>");
    expect(output.xml).toContain("<MontoTotal>100</MontoTotal>");
    expect(output.xml).toContain("<TotalComprobante>113</TotalComprobante>");
  });

  it.each([
    ["an inconsistent rate", 12],
    ["an exponent rate", 1e-7],
    ["a negative rate", -13],
  ])("rejects a 0.13.0 draft with %s", async (_label, tarifa) => {
    const file = join(dir, "draft-0.13.0-bad.json");
    await writeFile(file, JSON.stringify(draft0130Fixture(tarifa)));
    await submitCommand.run?.({
      args: { file, json: true, profile: "default", "dry-run": true },
      rawArgs: [],
      cmd: submitCommand,
    });
    expect(process.exitCode).toBe(1);
    expect(JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]))).toMatchObject({
      success: false,
    });
  });
});
