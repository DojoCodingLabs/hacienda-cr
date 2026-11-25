/** Paridad del catálogo de referencias contra los XSD 2026 vendorizados. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  REFERENCE_CODES,
  REFERENCE_DOC_TYPES,
  REP_REFERENCE_CODES,
} from "@dojocoding/hacienda-shared";

const FacturaElectronicaXsd = readFileSync(
  new URL("../../schemas/2026/v4.4/FacturaElectronica_V4.4.xsd", import.meta.url),
  "utf-8",
);
const ReciboElectronicoPagoXsd = readFileSync(
  new URL("../../schemas/2026/v4.4/ReciboElectronicoPago_V4.4.xsd", import.meta.url),
  "utf-8",
);

function enumerationValues(xsd: string, typeName: string): string[] {
  const m = xsd.match(new RegExp(`name="${typeName}"[\\s\\S]*?</xs:simpleType>`, "s"));
  if (!m) throw new Error(`Tipo ${typeName} no encontrado en el XSD`);
  return [
    ...new Set(
      (m[0].match(/<xs:enumeration[^>]*value="([0-9]+)"/g) || []).map((v) => {
        const match = v.match(/([0-9]+)/);
        return match ? match[1] : "";
      }),
    ),
  ].sort();
}

describe("reference catalog parity against vendored XSD 2026", () => {
  const baseDocTypes = enumerationValues(FacturaElectronicaXsd, "TipoDocReferenciaType");
  const repDocTypes = enumerationValues(ReciboElectronicoPagoXsd, "TipoDocReferenciaType");
  const baseCodes = enumerationValues(FacturaElectronicaXsd, "CodigoReferenciaType");
  const repCodes = enumerationValues(ReciboElectronicoPagoXsd, "CodigoReferenciaType");

  it("REFERENCE_DOC_TYPES matches TipoDocReferenciaType (base and REP XSDs)", () => {
    const expected = [...new Set([...baseDocTypes, ...repDocTypes])].sort();
    expect([...REFERENCE_DOC_TYPES].sort()).toEqual(expected);
  });

  it("REFERENCE_CODES matches base CodigoReferenciaType", () => {
    expect([...REFERENCE_CODES].sort()).toEqual(baseCodes.sort());
  });

  it("REP_REFERENCE_CODES matches REP CodigoReferenciaType", () => {
    expect([...REP_REFERENCE_CODES].sort()).toEqual(repCodes.sort());
  });

  it("REP_REFERENCE_CODES is REFERENCE_CODES plus 17 only if base lacks 17", () => {
    const has17InBase = baseCodes.includes("17");
    if (has17InBase) {
      expect(REP_REFERENCE_CODES).toEqual(REFERENCE_CODES);
    } else {
      expect([...REP_REFERENCE_CODES].sort()).toEqual([...REFERENCE_CODES, "17"].sort());
    }
  });
});
