/** Regression tests for fiscal identity and reference validation. */
import { describe, expect, it } from "vitest";
import { InformacionReferenciaSchema } from "@dojocoding/hacienda-shared";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildClave } from "../clave/build-clave.js";
import { validateFacturaInput } from "./validator.js";
import { DocumentType, Situation } from "../clave/types.js";

function validIdentityInvoice() {
  const invoice = structuredClone(SIMPLE_INVOICE);
  invoice.clave = buildClave({
    date: new Date(invoice.fechaEmision),
    taxpayerId: invoice.emisor.identificacion.numero,
    branch: "001",
    pos: "00001",
    documentType: DocumentType.FACTURA_ELECTRONICA,
    sequence: 1,
    situation: Situation.NORMAL,
  });
  expect(validateFacturaInput(invoice).valid).toBe(true);
  return invoice;
}

describe("Resolved integrity and reference regressions", () => {
  it("rejects an issuer identification different from the clave", () => {
    const invoice = validIdentityInvoice();
    invoice.emisor.identificacion.numero = "3109876543";
    expect(validateFacturaInput(invoice).valid).toBe(false);
  });
  it("rejects a consecutive different from the clave", () => {
    const invoice = validIdentityInvoice();
    invoice.numeroConsecutivo = "00100001010000000099";
    expect(validateFacturaInput(invoice).valid).toBe(false);
  });
  it("rejects 13 percent IVA paired with the zero-rate code", () => {
    const invoice = validIdentityInvoice();
    const tax = invoice.detalleServicio[0]?.impuesto?.[0];
    if (!tax) throw new Error("Fixture requires IVA");
    tax.codigoTarifaIVA = "01";
    expect(validateFacturaInput(invoice).valid).toBe(false);
  });
  it("accepts existing official reference reason 06 (return of merchandise)", () => {
    expect(
      InformacionReferenciaSchema.safeParse({
        tipoDoc: "01",
        numero: SIMPLE_INVOICE.clave,
        fechaEmision: SIMPLE_INVOICE.fechaEmision,
        codigo: "06",
        razon: "Devolución de mercancía",
      }).success,
    ).toBe(true);
  });
});
