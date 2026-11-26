import { describe, it, expect } from "vitest";
import { buildDecimalDocumentXml, buildFacturaXml, signXml } from "@dojocoding/hacienda-sdk";
import { createTestP12 } from "../../../sdk/src/__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import { DraftFacturaSchema, draftToSource } from "./draft-document.js";
import { buildDraftSummary, calculateDraftLineMoney } from "./draft-money.js";
import { signedXmlMatchesUnsigned, submissionSituation } from "./submission-state.js";

const P12 = createTestP12("test-pin");

function decimalDraftXml(): string {
  const sourceLine = SIMPLE_INVOICE.detalleServicio[0];
  const sourceTax = sourceLine?.impuesto?.[0];
  if (!sourceLine || !sourceTax) throw new Error("SIMPLE_INVOICE fixture is incomplete");
  const line = calculateDraftLineMoney({ cantidad: "1", precioUnitario: "100", tarifa: 13 });
  const { baseImponible: _, ...simpleLine } = sourceLine;
  const draft = DraftFacturaSchema.parse({
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
  return buildDecimalDocumentXml(draftToSource(draft));
}

describe("signedXmlMatchesUnsigned", () => {
  it.each([
    ["legacy Number XML", () => buildFacturaXml(SIMPLE_INVOICE)],
    ["decimal-text draft XML", decimalDraftXml],
  ])("matches the SDK signer output for %s and nothing else", async (_name, build) => {
    const unsigned = build();
    const signed = await signXml(unsigned, P12, "test-pin");
    expect(signedXmlMatchesUnsigned(signed, unsigned)).toBe(true);
    // Any content change is a different draft.
    expect(signedXmlMatchesUnsigned(signed, unsigned.replace("<Clave>", "<Clave> "))).toBe(false);
    // Two signatures, or none, fail closed.
    expect(signedXmlMatchesUnsigned(unsigned, unsigned)).toBe(false);
    const doubled = signed.replace(
      "<ds:Signature ",
      '<ds:Signature x="1"></ds:Signature><ds:Signature ',
    );
    expect(signedXmlMatchesUnsigned(doubled, unsigned)).toBe(false);
  });
});

describe("submissionSituation", () => {
  const withSituation = (digit: string) =>
    SIMPLE_INVOICE.clave.slice(0, 41) + digit + SIMPLE_INVOICE.clave.slice(42);

  it("derives normal and sin_internet from the clave", () => {
    expect(submissionSituation(withSituation("1"), undefined)).toEqual({ situation: "normal" });
    expect(submissionSituation(withSituation("3"), undefined)).toEqual({
      situation: "sin_internet",
    });
  });

  it("requires the provisional comprobante (codigo 05) for contingencia", () => {
    expect(() => submissionSituation(withSituation("2"), [])).toThrow(/codigo 05/);
    expect(() => submissionSituation(withSituation("2"), [{ codigo: "04", numero: "1" }])).toThrow(
      /codigo 05/,
    );
    expect(submissionSituation(withSituation("2"), [{ codigo: "05", numero: "P-001" }])).toEqual({
      situation: "contingencia",
      provisionalReference: "P-001",
    });
  });
});
