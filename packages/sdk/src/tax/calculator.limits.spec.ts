import { describe, expect, it } from "vitest";
import { round5 } from "./calculator.js";
import { scaledFromNumber, formatScaledDecimal } from "@dojocoding/hacienda-shared";

/**
 * Decimal oracle for `round5`: every case compares the legacy `number` result
 * against the exact-decimal kernel (HALF_UP on the round-trip decimal
 * representation). Cases are split into:
 *   - divergent (pre-correction `toFixed` disagreed with HALF_UP) and
 *   - controls (no divergence) that anchor the absence of drift.
 *
 * Negative inputs are included to verify the sign chain (D1).
 */
describe("round5 vs exact-decimal oracle (limites)", () => {
  const oracle = (value: number): number =>
    Number(formatScaledDecimal(scaledFromNumber(value, 5), 5));

  const divergent: { label: string; value: number }[] = [
    { label: "20.203515", value: 20.203515 },
    { label: "0.123455", value: 0.123455 },
    { label: "1.234565", value: 1.234565 },
    { label: "8.686375", value: 8.686375 },
    { label: "-20.203515", value: -20.203515 },
    { label: "-0.123455", value: -0.123455 },
  ];

  const controls: { label: string; value: number }[] = [
    { label: "0.000005", value: 0.000005 },
    { label: "-0.000005", value: -0.000005 },
    { label: "0.1 + 0.2", value: 0.1 + 0.2 },
    { label: "-(0.1 + 0.2)", value: -(0.1 + 0.2) },
    { label: "1 / 3", value: 1 / 3 },
    { label: "2 / 3", value: 2 / 3 },
    { label: "0.7 + 0.1", value: 0.7 + 0.1 },
  ];

  for (const { label, value } of [...divergent, ...controls]) {
    it(`round5(${label}) matches the HALF_UP oracle`, () => {
      expect(round5(value)).toBe(oracle(value));
    });
  }

  it("is idempotent on the whole grid", () => {
    for (const { value } of [...divergent, ...controls]) {
      expect(round5(round5(value))).toBe(round5(value));
    }
  });

  it("does not throw or clip at the upper DecimalDineroType frontier (D5)", () => {
    // `round5` is an arithmetic primitive: no domain validation, no clipping.
    // Values beyond the XSD max (9999999999999.99999) pass through unchanged.
    expect(round5(10000000000000)).toBe(10000000000000);
    expect(round5(9999999999999.5)).toBe(9999999999999.5);
  });

  // Documented limitation of the `number` contract (not curable by the kernel):
  // above ~6.87e10 the float ULP exceeds 1e-5, so distinct decimals collapse to
  // a single float (e.g. 9999999999999.123455 collapses to 9999999999999.123).
  // The exact path (DecimalDocument*) does not suffer this; only the legacy
  // `number` path does. No assertion here: the collapse is inherent to float64.
});
