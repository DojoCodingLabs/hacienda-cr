import { describe, expect, it } from "vitest";
import { buildFacturaXml, validateDocumentXml } from "@dojocoding/hacienda-sdk";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import {
  DraftFacturaSchema,
  DraftMoneyTextSchema,
  draftForXml,
  hasDecimalTextMoney,
  validateDraftFactura,
  type DraftFactura,
} from "./draft-document.js";
import { buildDraftSummary, calculateDraftLineMoney } from "./draft-money.js";

function exactDraftFixture(): DraftFactura {
  const line = calculateDraftLineMoney({
    cantidad: "1",
    precioUnitario: "100",
    tarifa: 13,
  });
  const sourceLine = SIMPLE_INVOICE.detalleServicio[0];
  const sourceTax = sourceLine?.impuesto?.[0];
  if (!sourceLine || !sourceTax) throw new Error("SIMPLE_INVOICE fixture is incomplete");
  const { baseImponible: _, ...simpleLine } = sourceLine;
  const exact = {
    ...SIMPLE_INVOICE,
    detalleServicio: [
      {
        ...simpleLine,
        cantidad: line.cantidad,
        precioUnitario: line.precioUnitario,
        montoTotal: line.montoTotal,
        subTotal: line.subTotal,
        impuesto: [{ ...sourceTax, monto: line.impuestoMonto }],
        impuestoNeto: line.impuestoNeto,
        montoTotalLinea: line.montoTotalLinea,
      },
    ],
    resumenFactura: buildDraftSummary(
      [{ subTotal: line.subTotal, impuestoNeto: line.impuestoNeto, taxable: true }],
      "01",
    ),
  };

  return DraftFacturaSchema.parse(exact);
}

describe("draft decimal-text document", () => {
  it("detects text amounts and validates an exact draft", () => {
    const draft = exactDraftFixture();

    expect(hasDecimalTextMoney(draft)).toBe(true);
    expect(typeof draft.detalleServicio[0]?.precioUnitario).toBe("string");
    expect(validateDraftFactura(draft)).toEqual([]);
  });

  it("rejects a line total that was edited without updating the exact result", () => {
    const draft = exactDraftFixture();
    const firstLine = draft.detalleServicio[0];
    if (!firstLine) throw new Error("fixture has no line");
    firstLine.montoTotalLinea = "113.00001";

    expect(validateDraftFactura(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "detalleServicio.0.montoTotalLinea" }),
      ]),
    );
  });

  it("rejects a summary that no longer matches the exact lines", () => {
    const draft = exactDraftFixture();
    draft.resumenFactura.totalComprobante = "113.00001";

    expect(validateDraftFactura(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "resumenFactura.totalComprobante" }),
      ]),
    );
  });

  it("builds XML with the text amounts unchanged and passes the XSD", async () => {
    const draft = exactDraftFixture();
    const xml = buildFacturaXml(draftForXml(draft));
    const validation = await validateDocumentXml(xml);

    expect(xml).toContain("<MontoTotal>100</MontoTotal>");
    expect(xml).toContain("<MontoTotalLinea>113</MontoTotalLinea>");
    expect(xml).toContain("<TotalComprobante>113</TotalComprobante>");
    expect(validation.valid).toBe(true);
  });

  it("rejects precision above the five-decimal money boundary", () => {
    expect(DraftMoneyTextSchema.safeParse("1.000005").success).toBe(false);
    expect(DraftMoneyTextSchema.safeParse("9999999999999.99999").success).toBe(true);
  });
});
