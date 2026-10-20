/** Internal exact nonnegative decimal primitives; no tax policy or identity. */
const SCALE = 100000n;
const MAX = 999999999999999999n;

/**
 * Parse a decimal string into a scaled bigint (5 decimal places by default).
 *
 * @param text - Decimal string, e.g. "1234.56789".
 * @param scale - Fractional digits to preserve.
 * @returns The value scaled by 10^scale, preserving leading-zero lexemes.
 */
export function scaled(text: string, scale: number): bigint {
  const [whole = "", fraction = ""] = text.split(".");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
}

/**
 * Round a fraction HALF_UP: `(numerator + denominator / 2) / denominator`.
 *
 * @param numerator - Scaled bigint numerator.
 * @param denominator - Scaled bigint denominator.
 * @returns Rounded bigint quotient.
 */
export function round(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

/**
 * Format a scaled bigint as a 5-decimal-place canonical money string.
 *
 * @param n - Scaled bigint amount.
 * @param family - Document family used only for the bound-error message.
 * @throws {RangeError} When the amount is negative or exceeds the monetary bound.
 * @returns Canonical string `${whole}.${fraction padded to 5}`.
 */
export function money(n: bigint, family: "FE" | "TE" | "ND" | "FEC" | "NC"): string {
  if (n < 0n || n > MAX) throw new RangeError(`Exact ${family} monetary bound exceeded`);
  return `${n / SCALE}.${(n % SCALE).toString().padStart(5, "0")}`;
}

/**
 * Sum a list of scaled bigints using exact integer arithmetic.
 *
 * @param items - Scaled bigint amounts.
 * @returns Exact bigint sum (no floating point).
 */
export function sum(items: readonly bigint[]) {
  return items.reduce((a, b) => a + b, 0n);
}
