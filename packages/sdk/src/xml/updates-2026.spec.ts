import { describe, expect, it } from "vitest";
import { ClaveNumericaSchema } from "@dojocoding/hacienda-shared";
import { buildClave } from "../clave/build-clave.js";
import { parseClave } from "../clave/parse-clave.js";
import { DocumentType, Situation } from "../clave/types.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import {
  calculateLineItemTotals,
  calculateInvoiceSummary,
  type LineItemTaxInput,
} from "../tax/calculator.js";
import { validateFacturaInput } from "./validator.js";
import { validateDocumentXml } from "./schema-validator.js";

function invoice(taxes: LineItemTaxInput[]) {
  const result = structuredClone(SIMPLE_INVOICE);
  const line = calculateLineItemTotals({
    numeroLinea: 1,
    codigoCabys: "2111100000000",
    cantidad: 2,
    unidadMedida: "Unid",
    detalle: "Producto",
    precioUnitario: 1000,
    impuesto: taxes,
  });
  result.detalleServicio = [line];
  result.resumenFactura = calculateInvoiceSummary([line]);
  return result;
}

describe("2026 v4.4 end-to-end regressions", () => {
  it("keeps a positive-rate line taxable when its tiny tax rounds to zero", () => {
    const line = calculateLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "2111100000000",
      cantidad: 1,
      unidadMedida: "Unid",
      detalle: "Tiny taxable amount",
      precioUnitario: 0.00001,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
    });
    expect(line.impuesto[0]?.monto).toBe(0);
    const summary = calculateInvoiceSummary([line]);
    expect(summary.totalMercanciasGravadas).toBe(0.00001);
    expect(summary.totalMercanciasExentas).toBe(0);
    line.impuesto = [{ codigo: "08", codigoTarifaIVA: "08", factorCalculoIVA: 0.13, monto: 0 }];
    expect(calculateInvoiceSummary([line]).totalMercanciasGravadas).toBe(0.00001);
  });

  it("preserves validation of an existing factor-only used-goods IVA document", () => {
    const input = structuredClone(SIMPLE_INVOICE);
    const line = input.detalleServicio[0];
    if (!line) throw new Error("Expected one fixture line");
    line.impuesto = [{ codigo: "08", codigoTarifaIVA: "08", factorCalculoIVA: 0.13, monto: 13000 }];
    expect(validateFacturaInput(input)).toMatchObject({ valid: true });
  });

  it("round-trips an alphanumeric legal entity through clave, input validation and XSD", async () => {
    const input = structuredClone(SIMPLE_INVOICE);
    input.emisor.identificacion = { tipo: "02", numero: "310ABC1234" };
    input.emisor.telefono = { codigoPais: "506", numTelefono: "911" };
    input.clave = buildClave({
      date: new Date(input.fechaEmision),
      taxpayerId: "310ABC1234",
      documentType: DocumentType.FACTURA_ELECTRONICA,
      sequence: 1,
      situation: Situation.NORMAL,
      securityCode: "12345678",
    });
    expect(parseClave(input.clave).taxpayerId).toBe("00310ABC1234");
    expect(ClaveNumericaSchema.safeParse(input.clave).success).toBe(true);
    expect(ClaveNumericaSchema.safeParse("A" + input.clave.slice(1)).success).toBe(false);
    expect(validateFacturaInput(input)).toMatchObject({ valid: true });
    const xml = buildFacturaXml(input);
    expect(xml).toContain("<NumTelefono>911</NumTelefono>");
    expect(
      (await validateDocumentXml(xml.replace("<Tipo>02</Tipo>", "<Tipo>01</Tipo>"))).valid,
    ).toBe(false);
    expect(await validateDocumentXml(xml)).toMatchObject({ valid: true });
  });

  it.each([
    { codigo: "02", monto: 100 },
    { codigo: "02", tarifa: 5 },
  ])("calculates and validates ISC $codigo with $monto / $tarifa", async (isc) => {
    const input = invoice([isc, { codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }]);
    const line = input.detalleServicio[0];
    if (!line) throw new Error("Expected one line item");
    expect(line.baseImponible).toBe(2100);
    expect(line.impuesto?.map((tax) => tax.monto)).toEqual([100, 273]);
    expect(line.impuestoNeto).toBe(373);
    expect(line.montoTotalLinea).toBe(2373);
    expect(input.resumenFactura.totalComprobante).toBe(2373);
    expect(validateFacturaInput(input)).toMatchObject({ valid: true });
    const xml = buildFacturaXml(input);
    if (isc.tarifa === undefined) expect(xml).not.toMatch(/<Codigo>02<\/Codigo>\s*<Tarifa>/);
    expect(await validateDocumentXml(xml)).toMatchObject({ valid: true });
  });

  it("preserves five alcohol proportion decimals through calculation and official XSD", async () => {
    const input = invoice([
      {
        codigo: "04",
        datosImpuestoEspecifico: {
          cantidadUnidadMedida: 333.33,
          porcentaje: 12.34,
          proporcion: 41.13292,
          impuestoUnidad: 1,
        },
      },
      { codigo: "01", codigoTarifaIVA: "08", tarifa: 13 },
    ]);
    const line = input.detalleServicio[0];
    if (!line) throw new Error("Expected one line item");
    expect(line.impuesto?.[0]?.monto).toBe(82.26584);
    expect(line.baseImponible).toBe(2082.26584);
    expect(line.impuesto?.[1]?.monto).toBe(270.69456);
    expect(line.montoTotalLinea).toBe(2352.9604);
    expect(validateFacturaInput(input)).toMatchObject({ valid: true });
    const xml = buildFacturaXml(input);
    expect(xml).toContain("<Proporcion>41.13292</Proporcion>");
    expect(await validateDocumentXml(xml)).toMatchObject({ valid: true });
    expect((await validateDocumentXml(xml.replace("41.13292", "41.132922"))).valid).toBe(false);
    const originalBase = line.baseImponible;
    line.baseImponible = line.subTotal;
    expect(validateFacturaInput(input).valid).toBe(false);
    line.baseImponible = originalBase;
    const specific = line.impuesto?.[0]?.datosImpuestoEspecifico;
    if (!specific) throw new Error("Expected alcohol tax data");
    specific.proporcion = 41;
    expect(validateFacturaInput(input).valid).toBe(false);
  });

  it.each([
    {
      codigo: "03",
      expected: 80,
      datosImpuestoEspecifico: { cantidadUnidadMedida: 8, impuestoUnidad: 10 },
    },
    {
      codigo: "06",
      expected: 40,
      datosImpuestoEspecifico: { cantidadUnidadMedida: 10, impuestoUnidad: 2 },
    },
    {
      codigo: "05",
      expected: 15,
      monto: 15,
      datosImpuestoEspecifico: {
        cantidadUnidadMedida: 500,
        volumenUnidadConsumo: 250,
        impuestoUnidad: 2,
      },
    },
  ])("serializes and calculates specific tax $codigo", async ({ expected, ...tax }) => {
    const input = invoice([tax]);
    expect(input.detalleServicio[0]?.impuesto?.[0]?.monto).toBe(expected);
    expect(input.resumenFactura.totalComprobante).toBe(2000 + expected);
    expect(validateFacturaInput(input).valid).toBe(true);
    expect((await validateDocumentXml(buildFacturaXml(input))).valid).toBe(true);
  });

  it("rejects incomplete taxes and inconsistent rate/amount combinations", () => {
    for (const tax of [
      { codigo: "02" },
      { codigo: "01", codigoTarifaIVA: "08" },
      { codigo: "04" },
      { codigo: "02", tarifa: 5, monto: 99 },
    ])
      expect(() => invoice([tax])).toThrow();
  });
});
