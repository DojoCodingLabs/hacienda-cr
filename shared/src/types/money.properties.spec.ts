/**
 * Property-based tests for the `Money` value object.
 *
 * These run in the normal suite with a modest number of cases and, via
 * `pnpm test:properties`, with a much larger `PROPERTY_RUNS` budget. The
 * properties assert the decimal-exactness and rounding contract that the whole
 * invoicing pipeline relies on.
 *
 * Amounts are generated as exact decimal strings with five fractional digits,
 * so expectations can be checked with integer (`BigInt`) arithmetic — an
 * independent oracle that never touches binary floating point.
 */

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { Money } from "./money.js";

/** Number of generated cases; the CI `test:properties` run raises this. */
const PROPERTY_RUNS = Number(process.env.PROPERTY_RUNS ?? 250);

// The exhaustive `test:properties` budget (10k+ cases per property) can exceed
// Vitest's default 5s per-test timeout, so raise it for this file.
vi.setConfig({ testTimeout: 120_000 });

/** Exact value in units of 1e-5, derived from the fixed 5-decimal rendering. */
function units5(value: Money): bigint {
  return BigInt(value.toFixed(5).replace(".", ""));
}

/** Decimal string with exactly five fractional digits. */
const decimal5 = (maxIntegerDigits = 9): fc.Arbitrary<string> =>
  fc
    .tuple(fc.nat({ max: 10 ** maxIntegerDigits - 1 }), fc.nat({ max: 99999 }))
    .map(([whole, fraction]) => `${whole}.${fraction.toString().padStart(5, "0")}`);

const money5 = (maxIntegerDigits = 9): fc.Arbitrary<Money> =>
  decimal5(maxIntegerDigits).map((value) => Money.fromString(value));

describe("Money properties (arithmetic)", () => {
  it("adds exactly and commutatively, never via binary floating point", () => {
    fc.assert(
      fc.property(money5(), money5(), (a, b) => {
        const sum = a.plus(b);
        expect(units5(sum)).toBe(units5(a) + units5(b));
        expect(sum.toString()).toBe(b.plus(a).toString());
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("keeps subtraction as the exact inverse of addition", () => {
    fc.assert(
      fc.property(money5(), money5(), (a, b) => {
        expect(a.plus(b).minus(b).equals(a)).toBe(true);
        expect(units5(a.minus(b))).toBe(units5(a) - units5(b));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("multiplies exactly by an integer", () => {
    fc.assert(
      fc.property(money5(), fc.integer({ min: 0, max: 10_000 }), (a, factor) => {
        expect(units5(a.times(factor))).toBe(units5(a) * BigInt(factor));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("is immutable: operations never mutate the receiver", () => {
    fc.assert(
      fc.property(money5(), money5(), (a, b) => {
        const before = a.toString();
        a.plus(b);
        a.minus(b);
        a.times(3);
        a.round(2);
        expect(a.toString()).toBe(before);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("reproduces the classic 0.1 + 0.2 = 0.3 case exactly", () => {
    expect(Money.fromNumber(0.1).plus(Money.fromNumber(0.2)).equals(Money.fromString("0.3"))).toBe(
      true,
    );
  });
});

describe("Money properties (rounding)", () => {
  it("is idempotent at five decimals and preserves values already at five decimals", () => {
    fc.assert(
      fc.property(money5(), (a) => {
        const once = a.round(5);
        expect(once.round(5).equals(once)).toBe(true);
        expect(units5(once)).toBe(units5(a));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("rounds an exact sixth-decimal tie half away from zero", () => {
    const tie = fc.tuple(fc.nat({ max: 9999 }), fc.nat({ max: 99999 })).map(([whole, prefix]) => ({
      input: `${whole}.${prefix.toString().padStart(5, "0")}5`,
      expected: BigInt(whole) * 100000n + BigInt(prefix) + 1n,
    }));

    fc.assert(
      fc.property(tie, ({ input, expected }) => {
        expect(units5(Money.fromString(input).round(5))).toBe(expected);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("never returns a value with more than five decimal places", () => {
    fc.assert(
      fc.property(fc.nat({ max: 10 ** 12 }), fc.nat({ max: 10 ** 12 }), (whole, fraction) => {
        const value = Money.fromString(`${whole}.${fraction.toString().padStart(12, "0")}`);
        const rounding = value.round(5);
        expect(rounding.toFixed(5)).toMatch(/^-?\d+\.\d{5}$/);
        // Rounding is bounded by the original magnitude.
        expect(rounding.abs().greaterThan(value.abs().plus(Money.fromString("0.00001")))).toBe(
          false,
        );
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe("Money properties (XML serialization)", () => {
  it("emits plain notation with at most five decimals", () => {
    fc.assert(
      fc.property(money5(15), (a) => {
        const xml = a.toXMLString();
        expect(xml).toMatch(/^\d+(\.\d{1,5})?$/);
        expect(xml).not.toMatch(/[eE]/);
        // The emitted string denotes exactly the 5-decimal-rounded value.
        expect(Money.fromString(xml).round(5).equals(a.round(5))).toBe(true);
        expect(units5(Money.fromString(xml))).toBe(units5(a.round(5)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("never emits scientific notation for very small or very large amounts", () => {
    const tiny = fc.nat({ max: 99999 }).map((f) => `0.${f.toString().padStart(5, "0")}`);
    fc.assert(
      fc.property(tiny, money5(15), (small, large) => {
        expect(Money.fromString(small).toXMLString()).not.toMatch(/[eE]/);
        expect(large.toXMLString()).not.toMatch(/[eE]/);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("rounds a six-decimal input to within half a unit of the fifth decimal", () => {
    const decimal6 = fc
      .tuple(fc.nat({ max: 10 ** 6 }), fc.nat({ max: 10 ** 6 }))
      .map(([whole, fraction]) => `${whole}.${fraction.toString().padStart(6, "0")}`);

    fc.assert(
      fc.property(decimal6, (value) => {
        const original = Money.fromString(value);
        const xml = original.toXMLString();
        expect(xml).toMatch(/^\d+(\.\d{1,5})?$/);
        expect(
          original.minus(Money.fromString(xml)).abs().greaterThan(Money.fromString("0.000005")),
        ).toBe(false);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
