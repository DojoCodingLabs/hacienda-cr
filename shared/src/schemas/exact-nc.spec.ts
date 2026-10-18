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
it("reason case constraint is nonblank and uses the XSD180 Unicode-character maximum", () => {
  expect(ExactNcTotalReferenceSchema.parse({ ...reference, razon: "😀".repeat(180) }).razon).toBe(
    "😀".repeat(180),
  );
  for (const razon of [undefined, "", " ", "a".repeat(181), "😀".repeat(181)])
    expect(ExactNcTotalReferenceSchema.safeParse({ ...reference, razon }).success).toBe(false);
});
