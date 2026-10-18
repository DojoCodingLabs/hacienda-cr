import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import baseline from "../__fixtures__/exact-ordinary-090-baseline.json" with { type: "json" };
import retained from "../__fixtures__/retained-fe-credit-080.json" with { type: "json" };
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
import { RetainedExactFeInputSchema } from "@dojocoding/hacienda-shared";
import { calculateExactFe, calculateRetainedExactFe } from "./exact-fe.js";
import { calculateExactNcTotal } from "./exact-nc.js";
import { buildExactFacturaXml } from "../documents/exact-fe-builder.js";
import { buildExactNotaCreditoTotalXml } from "../documents/exact-nc-builder.js";
function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error("Missing synthetic fixture value");
  return value;
}
it("preserves actual published0.9 current FE/NC bytes/math and retained math after kernel extraction", () => {
  const hash = (value: unknown) =>
      createHash("sha256")
        .update(typeof value === "string" ? value : JSON.stringify(value))
        .digest("hex"),
    nc = exactNcFixture();
  expect(hash(buildExactFacturaXml(nc.original))).toBe(baseline.feXml);
  expect(hash(calculateExactFe(nc.original))).toBe(baseline.feCalculation);
  expect(hash(buildExactNotaCreditoTotalXml(nc))).toBe(baseline.ncXml);
  expect(hash(calculateExactNcTotal(nc))).toBe(baseline.ncCalculation);
  expect(
    hash(
      retained.rows.map((row) =>
        calculateRetainedExactFe(RetainedExactFeInputSchema.parse(row.source)),
      ),
    ),
  ).toBe(baseline.retainedCalculations);
  const unallocated = {
    ...nc.original,
    medioPago: [{ tipoMedioPago: "01" as const, totalMedioPago: "0" }],
  };
  expect(() => calculateExactFe(unallocated)).toThrow(
    "Supplied payment allocation must be positive",
  );
  // Historical broad input still reaches the former arithmetic reconciliation guard.
  expect(() => calculateRetainedExactFe(unallocated)).toThrow(
    "Exact ordinary FE payment allocation must equal invoice total",
  );
  const zero = structuredClone(nc.original);
  required(zero.detalleServicio[0]).descuento = [{ codigoDescuento: "07", porcentaje: "100" }];
  expect(() => calculateExactFe(zero)).toThrow(
    "Zero or negative net line is outside ordinary exact FE",
  );
});
