import { describe, expect, it } from "vitest";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { calculateInvoiceSummary, calculateLineItemTotals } from "../tax/calculator.js";
import { validateFacturaInput } from "./validator.js";

describe("IVA tariff code/percentage cross-validation", () => {
  it.each([
    ["01", 0],
    ["02", 1],
    ["03", 2],
    ["04", 4],
    ["08", 13],
    ["09", 0.5],
    ["10", 0],
    ["11", 0],
  ] as const)(
    "accepts code %s with its official %s percent and rejects a mismatched rate",
    (code, rate) => {
      const invoice = structuredClone(SIMPLE_INVOICE);
      const line = calculateLineItemTotals({
        numeroLinea: 1,
        cantidad: 1,
        precioUnitario: 10000,
        codigoCabys: "8313100000100",
        unidadMedida: "Sp",
        detalle: "Synthetic service",
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: code, tarifa: rate }],
      });
      invoice.detalleServicio = [line];
      invoice.resumenFactura = calculateInvoiceSummary([line]);
      expect(validateFacturaInput(invoice).valid).toBe(true);
      const mismatched = calculateLineItemTotals({
        ...line,
        impuesto: [{ codigo: "01", codigoTarifaIVA: code, tarifa: rate === 13 ? 0 : 13 }],
      });
      invoice.detalleServicio = [mismatched];
      invoice.resumenFactura = calculateInvoiceSummary([mismatched]);
      const result = validateFacturaInput(invoice);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((issue) => issue.path === "detalleServicio.0.impuesto.0.tarifa"),
      ).toBe(true);
    },
  );
  it.each([
    ["05", 0],
    ["06", 4],
    ["07", 8],
  ] as const)("rejects transitional code %s on a new FE", (code, rate) => {
    const invoice = structuredClone(SIMPLE_INVOICE);
    const line = calculateLineItemTotals({
      numeroLinea: 1,
      cantidad: 1,
      precioUnitario: 10000,
      codigoCabys: "8313100000100",
      unidadMedida: "Sp",
      detalle: "Synthetic service",
      esServicio: true,
      impuesto: [{ codigo: "01", codigoTarifaIVA: code, tarifa: rate }],
    });
    invoice.detalleServicio = [line];
    invoice.resumenFactura = calculateInvoiceSummary([line]);
    expect(
      validateFacturaInput(invoice).errors.some(
        (issue) => issue.path === "detalleServicio.0.impuesto.0.codigoTarifaIVA",
      ),
    ).toBe(true);
  });
});
