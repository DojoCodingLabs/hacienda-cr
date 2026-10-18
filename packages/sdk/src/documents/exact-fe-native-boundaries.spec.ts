import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  ExactFeInputSchema,
  RetainedExactFeInputSchema,
  ExactFeCalculatedSchema,
  ExactFePaymentSchema,
  ExactTeInputSchema,
} from "@dojocoding/hacienda-shared";
import retained from "../__fixtures__/retained-fe-native-090.json" with { type: "json" };
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
import { exactTeFixture } from "../__fixtures__/exact-te.js";
import { calculateExactFe, calculateRetainedExactFe } from "../tax/exact-fe.js";
import { buildExactFacturaXml } from "./exact-fe-builder.js";
import { buildExactTiqueteXml } from "./exact-te-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing synthetic payment fact");
  return value;
}
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
describe("strict current FE without tightening retained 0.9 custody", () => {
  it("enforces native issuer/receiver/commercial bounds with actual Unicode character counts", () => {
    for (const [party, field, min, max] of [
      ["emisor", "nombre", 5, 100],
      ["receptor", "nombre", 3, 100],
      ["emisor", "nombreComercial", 3, 80],
      ["receptor", "nombreComercial", 3, 80],
    ] as const) {
      for (const length of [min - 1, min, max, max + 1]) {
        const source = exactNcFixture().original;
        source[party][field] = "😀".repeat(length);
        const before = JSON.stringify(source),
          parsed = ExactFeInputSchema.safeParse(source);
        expect(parsed.success, `${party}.${field}:${length}`).toBe(length >= min && length <= max);
        if (parsed.success) {
          const xml = buildExactFacturaXml(parsed.data);
          expect(xml).toContain("😀".repeat(length));
          expect(
            validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true })
              .valid,
          ).toBe(true);
        } else expect(() => buildExactFacturaXml(source)).toThrow();
        expect(JSON.stringify(source)).toBe(before);
      }
    }
  });
  it("preserves lexemes, combining characters and omitted commercial fields without fabricated data", () => {
    const source = exactNcFixture().original;
    source.emisor.nombre = " a\u0301bc ";
    source.receptor.nombre = "a\u0301b";
    delete source.emisor.nombreComercial;
    delete source.receptor.nombreComercial;
    const parsed = ExactFeInputSchema.parse(source),
      xml = buildExactFacturaXml(parsed);
    expect(parsed.emisor.nombre).toBe(source.emisor.nombre);
    expect(parsed.receptor.nombre).toBe(source.receptor.nombre);
    expect(xml).toContain(`<Nombre>${source.emisor.nombre}</Nombre>`);
    expect(xml).not.toContain("NombreComercial");
    expect(
      validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true }).valid,
    ).toBe(true);
    for (const party of ["emisor", "receptor"] as const) {
      const bad = structuredClone(source);
      bad[party].nombreComercial = "";
      expect(ExactFeInputSchema.safeParse(bad).success).toBe(false);
      bad[party].nombre = "     ";
      expect(ExactFeInputSchema.safeParse(bad).success).toBe(false);
    }
  });
  it("rejects zero allocations through public payment/current FE/new TE exports while exact positive splits retain math", () => {
    for (const value of ["0", "0.00000", 0, -1, "-1", "1e-5", undefined])
      expect(
        ExactFePaymentSchema.safeParse({ tipoMedioPago: "01", totalMedioPago: value }).success,
      ).toBe(false);
    const source = exactNcFixture().original;
    source.medioPago = [
      { tipoMedioPago: "01", totalMedioPago: "0.00001" },
      { tipoMedioPago: "04", totalMedioPago: "112.99999" },
    ];
    expect(ExactFePaymentSchema.parse(source.medioPago[0]).totalMedioPago).toBe("0.00001");
    const expected = execFileSync(
      "python3",
      ["-c", "from decimal import Decimal;print(Decimal('0.00001')+Decimal('112.99999'))"],
      { encoding: "utf8" },
    ).trim();
    expect(calculateExactFe(source).resumenFactura.totalComprobante).toBe(expected);
    expect(calculateExactFe(source).resumenFactura.medioPago.map((p) => p.totalMedioPago)).toEqual([
      "0.00001",
      "112.99999",
    ]);
    const te = exactTeFixture();
    te.medioPago = structuredClone(source.medioPago);
    expect(ExactTeInputSchema.safeParse(te).success).toBe(true);
    for (const badValue of ["0", "0.00000"]) {
      required(source.medioPago[0]).totalMedioPago = badValue;
      required(te.medioPago[0]).totalMedioPago = badValue;
      expect(() => calculateExactFe(source)).toThrow("allocation must be positive");
      expect(() => buildExactFacturaXml(source)).toThrow("allocation must be positive");
      expect(() => buildExactTiqueteXml(te)).toThrow("allocation must be positive");
    }
    const mismatch = exactNcFixture().original;
    mismatch.medioPago = [{ tipoMedioPago: "01", totalMedioPago: "112" }];
    expect(() => calculateExactFe(mismatch)).toThrow("must equal invoice total");
  });
  it("preserves genuine published 0.9 schema/math/original bytes including formerly accepted invalid current facts", () => {
    expect(retained.producer.version).toBe("0.9.0");
    expect(retained.producer.sourceCommit).toBe("d6b647512eb0e216cf65e6727da06dcf9ead3db2");
    for (const row of retained.rows) {
      const before = JSON.stringify(row),
        source = RetainedExactFeInputSchema.parse(row.source),
        calculated = calculateRetainedExactFe(source);
      expect(calculated, row.kind).toEqual(row.calculated);
      expect(ExactFeCalculatedSchema.parse(calculated)).toEqual(row.calculated);
      expect(hash(row.xml)).toBe(row.sha256);
      expect(JSON.stringify(row)).toBe(before);
      const current = ExactFeInputSchema.safeParse(row.source);
      if (row.kind === "unicode-valid") {
        expect(current.success).toBe(true);
        expect(buildExactFacturaXml(source)).toBe(row.xml);
      } else {
        expect(current.success, row.kind).toBe(false);
        expect(() => buildExactFacturaXml(source)).toThrow();
      }
      // Native validity and historical math/custody are distinct. Zero is structurally valid;
      // published 0.9 omitted its unused empty commercial-name input from actual XML.
      expect(
        validateAgainstXsd(row.xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true })
          .valid,
        row.kind,
      ).toBe(
        row.kind.startsWith("zero") ||
          row.kind === "unicode-valid" ||
          row.kind === "issuer-commercial-empty",
      );
    }
  });
  it("signs a valid current edge without changing exact source or claiming fiscal acceptance", async () => {
    const source = exactNcFixture().original;
    source.emisor.nombre = "abcde";
    source.receptor.nombre = "abc";
    source.emisor.nombreComercial = "xyz";
    source.receptor.nombreComercial = "a😀b";
    const before = JSON.stringify(source),
      xml = buildExactFacturaXml(source),
      password = "synthetic-current-fe-edge";
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    const signed = await signXml(xml, createTestP12(password), password);
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
  });
});
