import { it, expect } from "vitest";
import { parseDocumentXml } from "./parser.js";
import { buildFacturaXml } from "./factura-builder.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
it("rejects namespace substitution, invalid decimals, unknown fields and precision loss", () => {
  const xml = buildFacturaXml(SIMPLE_INVOICE);
  for (const changed of [
    xml.replace(/xmlns="[^"]+"/, 'xmlns="urn:attacker"'),
    xml.replace(/<TotalComprobante>[^<]+/, "<TotalComprobante>NaN"),
    xml.replace(/<TotalComprobante>[^<]+/, "<TotalComprobante>9999999999999.99999"),
    xml.replace("</FacturaElectronica>", "<Unsupported>hidden</Unsupported></FacturaElectronica>"),
  ])
    expect(() => parseDocumentXml(changed)).toThrow();
});
it("preserves specific tax factors introduced in 0.11", () => {
  const invoice = structuredClone(SIMPLE_INVOICE);
  required(invoice.detalleServicio[0]).impuesto = [
    {
      codigo: "04",
      monto: 13,
      datosImpuestoEspecifico: { cantidadUnidadMedida: 1, impuestoUnidad: 13, proporcion: 0.12345 },
    },
  ];
  const xml = buildFacturaXml(invoice);
  expect(buildFacturaXml(parseDocumentXml(xml).document as typeof invoice)).toBe(xml);
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing required value");
  return value;
}
