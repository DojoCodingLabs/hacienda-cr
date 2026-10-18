/** Internal exact nonnegative decimal primitives; no tax policy or identity. */
const SCALE = 100000n;
const MAX = 999999999999999999n;
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
