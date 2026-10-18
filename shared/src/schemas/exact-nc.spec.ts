import { ExactNcTotalReferenceSchema } from "./exact-nc.js";
const reference = {
  tipoDoc: "01",
  numero: "5".repeat(50),
  fechaEmision: "2026-10-17T12:00:00-06:00",
  codigo: "01",
  razon: "Anulación total",
};
it("exact total NC requires explicit bound-reference fields and no unsupported keys", () => {
  expect(ExactNcTotalReferenceSchema.parse(reference)).toEqual(reference);
  for (const value of [
    { ...reference, numero: undefined },
    { ...reference, codigo: undefined },
    { ...reference, fechaEmision: "invalid" },
    { ...reference, codigo: "16" },
    { ...reference, tipoDoc: "10" },
    { ...reference, total: "113" },
  ])
    expect(ExactNcTotalReferenceSchema.safeParse(value).success).toBe(false);
});
it("reason obeys current annex3..180 Unicode characters, beyond weaker XSD cardinality", () => {
  expect(ExactNcTotalReferenceSchema.parse({ ...reference, razon: "😀".repeat(180) }).razon).toBe(
    "😀".repeat(180),
  );
  expect(ExactNcTotalReferenceSchema.parse({ ...reference, razon: "a😀b" }).razon).toBe("a😀b");
  for (const razon of [
    undefined,
    "",
    " ",
    "a",
    "ab",
    "😀",
    "😀😀",
    "a".repeat(181),
    "😀".repeat(181),
  ])
    expect(ExactNcTotalReferenceSchema.safeParse({ ...reference, razon }).success).toBe(false);
});
