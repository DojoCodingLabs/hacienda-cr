/**
 * XSD conformance suite: every builder's output must validate against the
 * official v4.4 XSD schemas vendored in packages/sdk/schemas/2024/v4.4.
 *
 * The schemas require 1-5 ds:Signature elements; builders emit unsigned
 * XML, so the missing signature is the one tolerated deviation
 * (see validateAgainstXsd's allowMissingSignature option).
 *
 * Requires the `xmllint` binary (ships with macOS; on CI install
 * libxml2-utils). Skips gracefully when unavailable.
 */

import { buildFacturaXml } from "./factura-builder.js";
import { buildTiqueteXml } from "./tiquete-builder.js";
import { buildNotaCreditoXml } from "./nota-credito-builder.js";
import { buildNotaDebitoXml } from "./nota-debito-builder.js";
import { buildFacturaCompraXml } from "./factura-compra-builder.js";
import { buildFacturaExportacionXml } from "./factura-exportacion-builder.js";
import { buildReciboPagoXml } from "./recibo-pago-builder.js";
import { buildMensajeReceptorXml } from "./mensaje-receptor-builder.js";
import { validateAgainstXsd, xmllintAvailable } from "../__testing__/xsd.js";
import {
  SIMPLE_FACTURA,
  SIMPLE_TIQUETE,
  TIQUETE_WITH_RECEPTOR,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
  MENSAJE_ACEPTACION_TOTAL,
  MENSAJE_MINIMAL,
} from "../__fixtures__/document-fixtures.js";
import {
  MULTI_ITEM_INVOICE,
  DISCOUNT_INVOICE,
  EXONERATED_INVOICE,
  CREDIT_INVOICE,
  REFERENCE_INVOICE,
} from "../__fixtures__/invoices.js";

const run = xmllintAvailable() ? describe : describe.skip;

interface ConformanceCase {
  name: string;
  xsd: string;
  build: () => string;
}

const CASES: ConformanceCase[] = [
  {
    name: "Factura Electronica (simple)",
    xsd: "FacturaElectronica_V4.4.xsd",
    build: () => buildFacturaXml(SIMPLE_FACTURA),
  },
  {
    name: "Factura Electronica (multi-item)",
    xsd: "FacturaElectronica_V4.4.xsd",
    build: () => buildFacturaXml(MULTI_ITEM_INVOICE),
  },
  {
    name: "Factura Electronica (discounts)",
    xsd: "FacturaElectronica_V4.4.xsd",
    build: () => buildFacturaXml(DISCOUNT_INVOICE),
  },
  {
    name: "Factura Electronica (exonerated)",
    xsd: "FacturaElectronica_V4.4.xsd",
    build: () => buildFacturaXml(EXONERATED_INVOICE),
  },
  {
    name: "Factura Electronica (credit sale)",
    xsd: "FacturaElectronica_V4.4.xsd",
    build: () => buildFacturaXml(CREDIT_INVOICE),
  },
  {
    name: "Factura Electronica (with reference)",
    xsd: "FacturaElectronica_V4.4.xsd",
    build: () => buildFacturaXml(REFERENCE_INVOICE),
  },
  {
    name: "Tiquete Electronico (no receptor)",
    xsd: "TiqueteElectronico_V4.4.xsd",
    build: () => buildTiqueteXml(SIMPLE_TIQUETE),
  },
  {
    name: "Tiquete Electronico (with receptor)",
    xsd: "TiqueteElectronico_V4.4.xsd",
    build: () => buildTiqueteXml(TIQUETE_WITH_RECEPTOR),
  },
  {
    name: "Nota de Credito Electronica",
    xsd: "NotaCreditoElectronica_V4.4.xsd",
    build: () => buildNotaCreditoXml(SIMPLE_NOTA_CREDITO),
  },
  {
    name: "Nota de Debito Electronica",
    xsd: "NotaDebitoElectronica_V4.4.xsd",
    build: () => buildNotaDebitoXml(SIMPLE_NOTA_DEBITO),
  },
  {
    name: "Factura Electronica de Compra",
    xsd: "FacturaElectronicaCompra_V4.4.xsd",
    build: () => buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA),
  },
  {
    name: "Factura Electronica de Exportacion",
    xsd: "FacturaElectronicaExportacion_V4.4.xsd",
    build: () => buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION),
  },
  {
    name: "Recibo Electronico de Pago",
    xsd: "ReciboElectronicoPago_V4.4.xsd",
    build: () => buildReciboPagoXml(SIMPLE_RECIBO_PAGO),
  },
  {
    name: "Mensaje Receptor (full)",
    xsd: "MensajeReceptor_V4.4.xsd",
    build: () => buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL),
  },
  {
    name: "Mensaje Receptor (minimal)",
    xsd: "MensajeReceptor_V4.4.xsd",
    build: () => buildMensajeReceptorXml(MENSAJE_MINIMAL),
  },
];

run("XSD conformance against official v4.4 schemas", () => {
  it.each(CASES.map((c) => [c.name, c] as const))("%s validates", (_name, c) => {
    const result = validateAgainstXsd(c.build(), c.xsd, { allowMissingSignature: true });
    expect(result.errors).toBe("");
    expect(result.valid).toBe(true);
  });

  it("rejects structurally invalid XML (harness sanity check)", () => {
    const bogus = `<?xml version="1.0" encoding="utf-8"?><FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"><Clave>123</Clave></FacturaElectronica>`;
    const result = validateAgainstXsd(bogus, "FacturaElectronica_V4.4.xsd", {
      allowMissingSignature: true,
    });
    expect(result.valid).toBe(false);
  });
});
