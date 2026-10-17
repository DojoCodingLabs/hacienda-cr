/** Primary vendored XSD tokens, not a second hand-written catalog oracle. */
import { readFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import {
  DocumentTypeCode,
  ExonerationType,
  ExonerationTypeSchema,
  LineaDetalleSchema,
  UNITS_OF_MEASURE,
} from "@dojocoding/hacienda-shared";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
const xs = "http://www.w3.org/2001/XMLSchema";
const schema = new DOMParser().parseFromString(
  readFileSync(
    new URL("../../schemas/2026/v4.4/FacturaElectronica_V4.4.xsd", import.meta.url),
    "utf8",
  ),
  "application/xml",
);
function tokens(type: string): string[] {
  const matches = Array.from(schema.getElementsByTagNameNS(xs, "simpleType")).filter(
    (node) => node.getAttribute("name") === type,
  );
  expect(matches).toHaveLength(1);
  const match = matches[0];
  if (!match) throw new Error("Missing XSD type");
  return Array.from(match.getElementsByTagNameNS(xs, "enumeration")).map((node) => {
    const value = node.getAttribute("value");
    if (value === null) throw new Error("Missing XSD enumeration value");
    return value;
  });
}
describe("reviewed A2 catalog alignment", () => {
  it("exposes only official exoneration values and preserves the historical06 alias", () => {
    expect([...new Set(Object.values(ExonerationType))].sort()).toEqual(
      tokens("TipoExoneracionType").sort(),
    );
    expect(ExonerationTypeSchema.safeParse("12").success).toBe(false);
    expect(ExonerationTypeSchema.safeParse("06").success).toBe(true);
    expect(ExonerationType.SERVICIOS_TURISTICOS_ICT).toBe("06");
    expect(ExonerationType.TRANSITORIO_IX).toBe("06");
  });
  it("uses exact XSD unit bytes including OHM SIGN rather than a normalized homograph", () => {
    expect([...UNITS_OF_MEASURE].sort()).toEqual(tokens("UnidadMedidaType").sort());
    expect(
      LineaDetalleSchema.safeParse({ ...SIMPLE_INVOICE.detalleServicio[0], unidadMedida: "\u2126" })
        .success,
    ).toBe(true);
    expect(
      LineaDetalleSchema.safeParse({ ...SIMPLE_INVOICE.detalleServicio[0], unidadMedida: "\u03A9" })
        .success,
    ).toBe(false);
  });
  it("keeps published0.4.2 fiscal identities and deprecated aliases intact", () => {
    expect(new Set(Object.values(DocumentTypeCode)).size).toBe(10);
    expect(DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA).toBe("08");
    expect(DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION).toBe("09");
    expect(DocumentTypeCode.RECIBO_ELECTRONICO_PAGO).toBe("10");
    expect(DocumentTypeCode.COMPRA_PAGO).toBe("08");
    expect(DocumentTypeCode.GASTO_VIAJE).toBe("09");
  });
});
