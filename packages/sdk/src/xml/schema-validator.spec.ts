import { describe, it, expect } from "vitest";
import { validateDocumentXml } from "./schema-validator.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { buildTiqueteXml } from "../documents/tiquete-builder.js";
import { buildNotaCreditoXml } from "../documents/nota-credito-builder.js";
import { buildNotaDebitoXml } from "../documents/nota-debito-builder.js";
import { buildFacturaCompraXml } from "../documents/factura-compra-builder.js";
import { buildFacturaExportacionXml } from "../documents/factura-exportacion-builder.js";
import { buildReciboPagoXml } from "../documents/recibo-pago-builder.js";
import { buildMensajeReceptorXml } from "../documents/mensaje-receptor-builder.js";
import { SIMPLE_INVOICE, DISCOUNT_INVOICE, EXONERATED_INVOICE } from "../__fixtures__/invoices.js";
import {
  SIMPLE_TIQUETE,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
  MENSAJE_ACEPTACION_TOTAL,
} from "../__fixtures__/document-fixtures.js";

const cases = [
  ["Factura", () => buildFacturaXml(SIMPLE_INVOICE)],
  ["Discount", () => buildFacturaXml(DISCOUNT_INVOICE)],
  ["Exoneration", () => buildFacturaXml(EXONERATED_INVOICE)],
  ["Tiquete", () => buildTiqueteXml(SIMPLE_TIQUETE)],
  ["Credit", () => buildNotaCreditoXml(SIMPLE_NOTA_CREDITO)],
  ["Debit", () => buildNotaDebitoXml(SIMPLE_NOTA_DEBITO)],
  ["Purchase", () => buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA)],
  ["Export", () => buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION)],
  ["Payment", () => buildReciboPagoXml(SIMPLE_RECIBO_PAGO)],
  ["Receiver", () => buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL)],
] as const;

describe("official v4.4 schemas", () => {
  it.each(cases)("validates %s against its XSD", async (_name, build) => {
    const result = await validateDocumentXml(build());
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it.each([
    ["namespace", (xml: string) => xml.replaceAll("/facturaElectronica", "/FacturaElectronica")],
    [
      "provider",
      (xml: string) => xml.replace(/\s*<ProveedorSistemas>.*?<\/ProveedorSistemas>/, ""),
    ],
    ["activity", (xml: string) => xml.replaceAll("CodigoActividadEmisor", "CodigoActividad")],
    ["CABYS", (xml: string) => xml.replaceAll("CodigoCABYS", "Codigo")],
    [
      "date",
      (xml: string) =>
        xml.replace(/<FechaEmision>.*?<\/FechaEmision>/, "<FechaEmision>invalid</FechaEmision>"),
    ],
  ])("rejects invalid %s", async (_name, mutate) => {
    expect((await validateDocumentXml(mutate(buildFacturaXml(SIMPLE_INVOICE)))).valid).toBe(false);
  });

  it("rejects malformed XML even when required tag strings are present", async () => {
    expect(
      (
        await validateDocumentXml(
          "<FacturaElectronica><Clave><NumeroConsecutivo><FechaEmision><Emisor>",
        )
      ).valid,
    ).toBe(false);
    expect((await validateDocumentXml("<MensajeReceptor>")).valid).toBe(false);
  });

  it("requires the signature when requested", async () => {
    expect(
      (await validateDocumentXml(buildFacturaXml(SIMPLE_INVOICE), { requireSignature: true }))
        .valid,
    ).toBe(false);
  });

  it("rejects external entities before parsing", async () => {
    expect(
      (
        await validateDocumentXml(
          '<!DOCTYPE root [<!ENTITY x SYSTEM "file:///etc/passwd">]><root>&x;</root>',
        )
      ).valid,
    ).toBe(false);
  });
});
