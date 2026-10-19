/**
 * Independent decimal oracle for the monetary property tests.
 *
 * This is a **second implementation** of the monetary arithmetic, written on
 * purpose with a *different representation* from the kernel under test: plain
 * decimal strings with digit-by-digit arithmetic, no `BigInt`, no scaled
 * integers, no `Number` in the arithmetic path. An oracle that shared the
 * kernel's representation could reproduce its defects — a mis-scaled factor, a
 * rounding direction, a base error in the discount — and would then confirm
 * them instead of catching them.
 *
 * The oracle is deliberately small and boring: it is a reference, not a
 * production path. Nothing here is published; it exists so the property
 * battery has something to compare against.
 *
 * Supported grammar: optional sign, integer part, optional fractional part.
 * No exponent (the monetary path never accepts one).
 */

/** A parsed decimal: sign, integer digits and fractional digits. */
interface Decimal {
  /** 1 for positive, -1 for negative. */
  sign: number;
  /** Integer digits, without leading zeros (except a single "0"). */
  int: string;
  /** Fractional digits, without trailing zeros. */
  frac: string;
}

/** Strip the leading zeros of a digit string, keeping at least one digit. */
function stripLeadingZeros(digits: string): string {
  const stripped = digits.replace(/^0+/, "");
  return stripped === "" ? "0" : stripped;
}

/** Parse a plain decimal string into its parts. */
export function parseDecimal(text: string): Decimal {
  const trimmed = text.trim();
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(trimmed);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) {
    throw new Error(`Oracle cannot parse decimal: "${text}"`);
  }
  const [, signText = "", intText = "", fracText = ""] = match;
  const int = stripLeadingZeros(intText === "" ? "0" : intText);
  const frac = fracText.replace(/0+$/, "");
  const sign = signText === "-" ? -1 : 1;
  const isZero = int === "0" && frac === "";
  return { sign: isZero ? 1 : sign, int, frac };
}

/** Render a decimal as its canonical plain text (no forced zeros). */
export function formatDecimal(value: Decimal): string {
  if (value.int === "0" && value.frac === "") return "0";
  const body = value.frac === "" ? value.int : `${value.int}.${value.frac}`;
  return value.sign < 0 ? `-${body}` : body;
}

/** Compare two digit strings as unsigned integers. */
function compareDigits(a: string, b: string): number {
  const left = stripLeadingZeros(a);
  const right = stripLeadingZeros(b);
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Add two unsigned digit strings. */
function addDigits(a: string, b: string): string {
  const width = Math.max(a.length, b.length);
  const left = a.padStart(width, "0");
  const right = b.padStart(width, "0");
  let carry = 0;
  let out = "";
  for (let i = width - 1; i >= 0; i--) {
    const sum = Number(left[i]) + Number(right[i]) + carry;
    out = String(sum % 10) + out;
    carry = Math.floor(sum / 10);
  }
  return stripLeadingZeros((carry > 0 ? String(carry) : "") + out);
}

/** Subtract two unsigned digit strings, assuming `a >= b`. */
function subtractDigits(a: string, b: string): string {
  const width = Math.max(a.length, b.length);
  const left = a.padStart(width, "0");
  const right = b.padStart(width, "0");
  let borrow = 0;
  let out = "";
  for (let i = width - 1; i >= 0; i--) {
    let diff = Number(left[i]) - Number(right[i]) - borrow;
    if (diff < 0) {
      diff += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
    out = String(diff) + out;
  }
  return stripLeadingZeros(out);
}

/** Multiply two unsigned digit strings. */
function multiplyDigits(a: string, b: string): string {
  if (a === "0" || b === "0") return "0";
  const digits = new Array(a.length + b.length).fill(0);
  for (let i = a.length - 1; i >= 0; i--) {
    let carry = 0;
    for (let j = b.length - 1; j >= 0; j--) {
      const index = i + j + 1;
      const current = digits[index] + Number(a[i]) * Number(b[j]) + carry;
      digits[index] = current % 10;
      carry = Math.floor(current / 10);
    }
    digits[i] = carry;
  }
  return stripLeadingZeros(digits.join(""));
}

/** Append `count` zeros to a digit string (multiply by 10^count). */
function shiftDigits(digits: string, count: number): string {
  return count <= 0 ? digits : `${digits}${"0".repeat(count)}`;
}

/** Divide two unsigned digit strings, returning quotient and remainder. */
function divideDigits(a: string, b: string): { quotient: string; remainder: string } {
  let quotient = "";
  let remainder = "0";
  for (const digit of a) {
    remainder = stripLeadingZeros(`${remainder}${digit}`);
    let found = 0;
    for (let candidate = 9; candidate >= 0; candidate--) {
      if (compareDigits(multiplyDigits(b, String(candidate)), remainder) <= 0) {
        found = candidate;
        break;
      }
    }
    quotient += String(found);
    remainder = subtractDigits(remainder, multiplyDigits(b, String(found)));
  }
  return { quotient: stripLeadingZeros(quotient), remainder };
}

/** Split a digit string back into a decimal at the given scale. */
function fromDigits(digits: string, scale: number, sign: number): string {
  const padded = digits.padStart(scale + 1, "0");
  return formatDecimal({
    sign,
    int: padded.slice(0, padded.length - scale),
    frac: padded.slice(padded.length - scale),
  });
}

/** Scale both decimals to a common number of fractional digits. */
function align(a: Decimal, b: Decimal): { left: string; right: string; scale: number } {
  const scale = Math.max(a.frac.length, b.frac.length);
  return {
    left: `${a.int}${a.frac.padEnd(scale, "0")}`,
    right: `${b.int}${b.frac.padEnd(scale, "0")}`,
    scale,
  };
}

/** Negate a decimal text. */
export function negate(value: string): string {
  const parsed = parseDecimal(value);
  if (parsed.int === "0" && parsed.frac === "") return "0";
  return formatDecimal({ sign: -parsed.sign, int: parsed.int, frac: parsed.frac });
}

/** Add two decimals. */
export function add(a: string, b: string): string {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const aligned = align(left, right);
  if (left.sign === right.sign) {
    return fromDigits(addDigits(aligned.left, aligned.right), aligned.scale, left.sign);
  }
  const order = compareDigits(aligned.left, aligned.right);
  if (order === 0) return "0";
  if (order > 0) {
    return fromDigits(subtractDigits(aligned.left, aligned.right), aligned.scale, left.sign);
  }
  return fromDigits(subtractDigits(aligned.right, aligned.left), aligned.scale, right.sign);
}

/** Subtract `b` from `a`. */
export function subtract(a: string, b: string): string {
  return add(a, negate(b));
}

/** Multiply two decimals exactly. */
export function multiply(a: string, b: string): string {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  // value(a) = A / 10^na and value(b) = B / 10^nb, so the product is
  // (A * B) / 10^(na + nb): the digit product carries the summed scale.
  const product = multiplyDigits(`${left.int}${left.frac}`, `${right.int}${right.frac}`);
  const scale = left.frac.length + right.frac.length;
  return fromDigits(product, scale, left.sign * right.sign);
}

/** Divide two decimals to `scale` fractional digits, rounded HALF_UP. */
export function divide(a: string, b: string, scale: number): string {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  if (right.int === "0" && right.frac === "") {
    throw new Error("Oracle division by zero");
  }
  const numerator = shiftDigits(`${left.int}${left.frac}`, right.frac.length + scale);
  const denominator = shiftDigits(`${right.int}${right.frac}`, left.frac.length);
  const { quotient, remainder } = divideDigits(numerator, denominator);
  // HALF_UP: round up when the remainder is at least half of the divisor.
  const doubled = addDigits(remainder, remainder);
  const roundUp = compareDigits(doubled, denominator) >= 0;
  const result = roundUp ? addDigits(quotient, "1") : quotient;
  return fromDigits(result, scale, left.sign * right.sign);
}

/** Round a decimal HALF_UP at `scale` fractional digits. */
export function round(value: string, scale: number): string {
  const parsed = parseDecimal(value);
  if (parsed.frac.length <= scale) {
    return formatDecimal({
      sign: parsed.sign,
      int: parsed.int,
      frac: parsed.frac.padEnd(scale, "0"),
    });
  }
  const kept = parsed.frac.slice(0, scale);
  const dropped = parsed.frac.slice(scale);
  const roundUp = dropped[0] !== undefined && Number(dropped[0]) >= 5;
  const digits = `${parsed.int}${kept}`;
  const result = roundUp ? addDigits(digits, "1") : digits;
  return fromDigits(result, scale, parsed.sign);
}

/** Compare two decimals: -1, 0 or 1. */
export function compare(a: string, b: string): number {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const leftZero = left.int === "0" && left.frac === "";
  const rightZero = right.int === "0" && right.frac === "";
  if (leftZero && rightZero) return 0;
  if (left.sign !== right.sign) return left.sign < right.sign ? -1 : 1;
  const aligned = align(left, right);
  const order = compareDigits(aligned.left, aligned.right);
  return left.sign < 0 ? -order : order;
}

/** Whether two decimals denote the same value. */
export function equal(a: string, b: string): boolean {
  return compare(a, b) === 0;
}

/** Sum a list of decimals exactly. */
export function sum(values: readonly string[]): string {
  return values.reduce((total, value) => add(total, value), "0");
}
