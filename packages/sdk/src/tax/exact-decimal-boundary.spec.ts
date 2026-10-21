import { it, expect } from "vitest";
import { parse } from "./exact-decimal.js";
it("validates grammar, field bounds and scale for every supported scale", () => {
  for (const scale of [0, 1, 2, 3, 4, 5])
    for (const value of ["-1", "1.2.3", "1000000000000000", "1e2", "+1"])
      expect(() => parse(value, scale)).toThrow();
  for (const scale of [-1, 0.5, 6, Infinity, NaN]) expect(() => parse("1", scale)).toThrow();
  expect(parse("9999999999999.99", 2)).toBe(999999999999999n);
});

import fc from "fast-check";
import { multiply, percent, ratio, money, scaled, sum } from "./exact-decimal.js";
import * as oracle from "../__testing__/decimal-oracle.js";
it("preserves decimal units when input and output scales differ", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 5 }),
      fc.integer({ min: 0, max: 5 }),
      fc.integer({ min: 0, max: 8 }),
      fc.integer({ min: 1, max: 9999 }),
      fc.integer({ min: 1, max: 9999 }),
      (aScale, bScale, outScale, a, b) => {
        const decimal = (value: number, scale: number) =>
          scale === 0
            ? String(value)
            : String(value)
                .padStart(scale + 1, "0")
                .slice(0, -scale) +
              "." +
              String(value)
                .padStart(scale + 1, "0")
                .slice(-scale);
        const left = decimal(a, aScale),
          right = decimal(b, bScale);
        const render = (value: bigint) =>
          oracle.parseDecimal(
            oracle.formatDecimal({
              sign: 1,
              int: (value / 10n ** BigInt(outScale)).toString(),
              frac: (value % 10n ** BigInt(outScale)).toString().padStart(outScale, "0"),
            }),
          );
        expect(
          oracle.equal(
            oracle.formatDecimal(render(multiply(BigInt(a), BigInt(b), aScale, bScale, outScale))),
            oracle.round(oracle.multiply(left, right), outScale),
          ),
        ).toBe(true);
        expect(
          oracle.equal(
            oracle.formatDecimal(render(percent(BigInt(a), BigInt(b), aScale, bScale, outScale))),
            oracle.round(oracle.divide(oracle.multiply(left, right), "100", outScale), outScale),
          ),
        ).toBe(true);
      },
    ),
    { numRuns: 500 },
  );
});
it("rounds ratios, preserves legacy kernel bounds and rejects zero denominators", () => {
  expect(ratio(100n, 1n, 3n, 2, 0, 2)).toBe(33n);
  expect(ratio(10000n, 1n, 3n, 2, 0, 0)).toBe(33n);
  expect(ratio(1n, 1n, 2n, 0, 0, 0)).toBe(1n);
  expect(() => ratio(1n, 1n, 0n, 0, 0, 0)).toThrow();
  expect(scaled("12.34", 2)).toBe(1234n);
  expect(sum([])).toBe(0n);
  expect(sum([1n, 2n, 3n])).toBe(6n);
  expect(money(999999999999999999n, "FE")).toBe("9999999999999.99999");
  expect(() => money(-1n, "FE")).toThrow();
  expect(() => money(1000000000000000000n, "FE")).toThrow();
  expect(() => parse("0.123", 2)).toThrow();
});
