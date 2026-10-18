import { expect, it } from "vitest";
import { ExactNdReferenceSchema } from "./exact-nd.js";
const reference = {
  tipoDoc: "01",
  numero: "5".repeat(50),
  fechaEmision: "2026-10-17T12:00:00.0000000009-06:00",
  codigo: "02",
  razon: "Ajuste de monto",
};
it("requires one explicit ordinary FE amount-correction reference, not the weaker XSD optional fields", () => {
  expect(ExactNdReferenceSchema.parse(reference)).toEqual(reference);
  for (const patch of [
    { tipoDoc: "03" },
    { codigo: "01" },
    { numero: undefined },
    { fechaEmision: "invalid" },
    { codigo: undefined },
    { extra: true },
  ])
    expect(ExactNdReferenceSchema.safeParse({ ...reference, ...patch }).success).toBe(false);
});
it("preserves required 3–180 Unicode reason characters without normalization", () => {
  for (const razon of ["a😀b", "😀".repeat(180), "  Motivo explícito  "])
    expect(ExactNdReferenceSchema.parse({ ...reference, razon }).razon).toBe(razon);
  for (const razon of [undefined, "ab", "😀😀", " ".repeat(5), "a".repeat(181), "😀".repeat(181)])
    expect(ExactNdReferenceSchema.safeParse({ ...reference, razon }).success).toBe(false);
});
