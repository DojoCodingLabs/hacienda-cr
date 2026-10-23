import { describe, expect, it } from "vitest";
import {
  ExactFeInputSchema,
  RetainedExactFeInputSchema,
  EmisorSchema,
  ReceptorSchema,
  ExactNdInputSchema,
  ExactTeInputSchema,
} from "@dojocoding/hacienda-shared";
import { exactNdFixture } from "../__fixtures__/exact-nd.js";
import { exactTeFixture } from "../__fixtures__/exact-te.js";
import { buildExactNotaDebitoXml } from "./exact-nd-builder.js";
import { buildExactTiqueteXml } from "./exact-te-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";

for (const family of ["TE", "ND"] as const) {
  describe(`${family} copied party native Unicode bounds`, () => {
    function fixture() {
      const nd = exactNdFixture();
      const te = exactTeFixture();
      te.receptor = structuredClone(nd.original.receptor);
      return {
        original: family === "ND" ? nd.original : te,
        parse: () =>
          family === "ND" ? ExactNdInputSchema.parse(nd) : ExactTeInputSchema.parse(te),
        build: () => (family === "ND" ? buildExactNotaDebitoXml(nd) : buildExactTiqueteXml(te)),
      };
    }
    it("rejects 4-character issuer, 2-character receiver and short supplied commercial names before XML", () => {
      for (const [party, field, value] of [
        ["emisor", "nombre", "abcd"],
        ["receptor", "nombre", "ab"],
        ["emisor", "nombreComercial", "ab"],
        ["receptor", "nombreComercial", "ab"],
        ["emisor", "nombre", "😀".repeat(101)],
        ["receptor", "nombre", "😀".repeat(101)],
        ["emisor", "nombreComercial", "😀".repeat(81)],
        ["receptor", "nombreComercial", "😀".repeat(81)],
      ] as const) {
        const f = fixture();
        const target = f.original[party];
        if (!target) throw new Error("Missing synthetic party");
        target[field] = value;
        expect(() => f.parse()).toThrow();
        expect(() => f.build()).toThrow();
      }
    });
    it("preserves native minimum/maximum Unicode names through calculation, exact XML and both native schemas", async () => {
      for (const [issuer, receiver, commercial] of [
        ["abcde", "abc", "abc"],
        ["😀".repeat(100), "😀".repeat(100), "😀".repeat(80)],
        ["  Empresa real  ", "  Persona real  ", "  Comercio real  "],
      ]) {
        const f = fixture();
        if (!f.original.receptor || !issuer || !receiver || !commercial)
          throw new Error("Missing synthetic party");
        f.original.emisor.nombre = issuer;
        f.original.receptor.nombre = receiver;
        f.original.emisor.nombreComercial = commercial;
        f.original.receptor.nombreComercial = commercial;
        const before = JSON.stringify(f.original);
        f.parse();
        const xml = f.build();
        expect(xml).toContain(`<Nombre>${issuer}</Nombre>`);
        expect(xml).toContain(`<Nombre>${receiver}</Nombre>`);
        expect(xml).toContain(`<NombreComercial>${commercial}</NombreComercial>`);
        expect(JSON.stringify(f.original)).toBe(before);
        for (const generation of ["2024"] as const)
          expect(
            validateAgainstXsd(
              xml,
              family === "ND" ? "NotaDebitoElectronica_V4.4.xsd" : "TiqueteElectronico_V4.4.xsd",
              { allowMissingSignature: true, generation },
            ).errors,
          ).toBe("");
        expect((await validateDocumentXml(xml)).valid).toBe(true);
      }
    });
  });
}
it("explicitly tightens current FE while preserving retained and legacy name validation/Unicode maximum", () => {
  const original = exactNdFixture().original;
  original.emisor.nombre = "a";
  original.receptor.nombre = "b";
  expect(ExactFeInputSchema.safeParse(original).success).toBe(false);
  expect(RetainedExactFeInputSchema.safeParse(original).success).toBe(true);
  expect(EmisorSchema.safeParse(original.emisor).success).toBe(true);
  expect(ReceptorSchema.safeParse(original.receptor).success).toBe(true);
  original.receptor.nombre = "abc";
  original.emisor.nombre = "😀".repeat(100);
  expect(ExactFeInputSchema.safeParse(original).success).toBe(true);
  original.emisor.nombre = "😀".repeat(101);
  expect(ExactFeInputSchema.safeParse(original).success).toBe(false);
  expect(RetainedExactFeInputSchema.safeParse(original).success).toBe(false);
  expect(EmisorSchema.safeParse(original.emisor).success).toBe(false);
});
