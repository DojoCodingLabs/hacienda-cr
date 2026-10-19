/** Internal exact nonnegative decimal primitives; no tax policy or identity.
 *
 * This kernel is the single place where the money path does arithmetic. It
 * runs on scaled integers (`bigint`), never on binary floating point, and it
 * applies the one rounding rule of the money path: **5 decimals, HALF_UP**
 * (increment when the sixth decimal is greater than or equal to 5). The rule
 * and its citation live in `shared/src/monetary/decimal-text.ts`; this module
 * only applies them.
 *
 * Generalization map (what the legacy families add on top of the exact ones):
 *
 * | Primitive   | Role                                                        |
 * | ----------- | ----------------------------------------------------------- |
 * | `scaled`    | text → scaled integer (exact families, permissive input)      |
 * | `round`     | HALF_UP division of two scaled integers                       |
 * | `money`     | scaled integer → text with the published 5-decimal format     |
 * | `sum`       | exact sum of scaled integers                                 |
 * | `parse`     | strict text → scaled integer (rejects what `scaled` assumes)  |
 * | `text`      | scaled integer → plain decimal text, without forced zeros     |
 * | `multiply`  | product of two scaled values, rounded at the target scale     |
 * | `percent`   | amount × percentage, rounded at the target scale              |
 * | `ratio`     | amount × numerator / denominator, rounded at the target scale |
 *
 * `scaled`, `round`, `money` and `sum` keep their exact behaviour: the
 * published 0.9.0 bytes and calculations of the exact families depend on
 * them. The new primitives extend the kernel to the legacy families without
 * touching that contract.
 */
import {
  MONEY_SCALE,
  MAX_MONEY_SCALED,
  formatScaledDecimal,
  parseMonetaryText,
  scaledFromNumber,
  scaledFromPlainDecimal,
} from "@dojocoding/hacienda-shared";

const SCALE = 100000n;
const MAX = 999999999999999999n;

/** Scale of every monetary amount, in decimal places. */
export { MONEY_SCALE };

/** Largest accepted monetary amount, as a scaled integer. */
export { MAX_MONEY_SCALED };

export function scaled(text: string, scale: number): bigint {
  const [whole = "", fraction = ""] = text.split(".");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
}
export function round(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}
export function money(n: bigint, family: "FE" | "TE" | "ND" | "FEC" | "NC"): string {
  if (n < 0n || n > MAX) throw new RangeError(`Exact ${family} monetary bound exceeded`);
  return `${n / SCALE}.${(n % SCALE).toString().padStart(5, "0")}`;
}
export function sum(items: readonly bigint[]) {
  return items.reduce((a, b) => a + b, 0n);
}

/**
 * Strict text → scaled integer. Unlike `scaled`, it rejects a text with more
 * decimals than the requested scale, an exponent, a sign or a value above the
 * monetary bound, and it reads the text exactly (no binary float involved).
 */
export function parse(text: string, scale: number = MONEY_SCALE): bigint {
  if (scale === MONEY_SCALE) return parseMonetaryText(text);
  const fraction = text.split(".")[1] ?? "";
  if (fraction.length > scale) {
    throw new RangeError(`Decimal text exceeds ${scale} decimals: ${text}`);
  }
  const scaledValue = scaledFromPlainDecimal(text, scale);
  if (scaledValue > MAX_MONEY_SCALED) {
    throw new RangeError(`Monetary bound exceeded: ${text}`);
  }
  return scaledValue;
}

/**
 * Scaled integer → plain decimal text, without forced zeros and without
 * scientific notation (`113000`, not `113000.00000`).
 */
export function text(value: bigint, scale: number = MONEY_SCALE): string {
  return formatScaledDecimal(value, scale);
}

/**
 * Scale a finite number into a scaled integer at `scale` decimals, reading it
 * through its shortest round-trip representation and rounding HALF_UP. Used
 * for the quantities and the percentages that are not monetary amounts.
 */
export function fromNumber(value: number, scale: number = MONEY_SCALE): bigint {
  return scaledFromNumber(value, scale);
}

/**
 * Product of two scaled values, rounded HALF_UP at `outScale`.
 *
 * `a` carries `aScale` decimals and `b` carries `bScale` decimals; the
 * product carries `aScale + bScale` decimals before the rounding.
 */
export function multiply(
  a: bigint,
  b: bigint,
  aScale: number,
  bScale: number,
  outScale: number,
): bigint {
  const product = a * b;
  const excess = aScale + bScale - outScale;
  return excess <= 0 ? product * 10n ** BigInt(-excess) : round(product, 10n ** BigInt(excess));
}

/**
 * `amount × percentage / 100`, rounded HALF_UP at `outScale`.
 *
 * `amount` carries `amountScale` decimals and `percentage` carries
 * `percentScale` decimals.
 */
export function percent(
  amount: bigint,
  percentage: bigint,
  amountScale: number,
  percentScale: number,
  outScale: number,
): bigint {
  const product = amount * percentage;
  const excess = amountScale + percentScale + 2 - outScale;
  return excess <= 0 ? product * 10n ** BigInt(-excess) : round(product, 10n ** BigInt(excess));
}

/**
 * `amount × numerator / denominator`, rounded HALF_UP at `outScale`.
 *
 * Used for the exonerated share of a taxable amount, where the ratio between
 * two percentages decides the part. `amount` carries `amountScale` decimals,
 * `numerator` and `denominator` carry `ratioScale` decimals each.
 */
export function ratio(
  amount: bigint,
  numerator: bigint,
  denominator: bigint,
  amountScale: number,
  ratioScale: number,
  outScale: number,
): bigint {
  if (denominator === 0n) throw new RangeError("Division by zero in monetary ratio");
  const product = amount * numerator;
  const factor = ratioScale + outScale - amountScale - ratioScale;
  if (factor >= 0) return round(product * 10n ** BigInt(factor), denominator);
  return round(product, denominator * 10n ** BigInt(-factor));
}
