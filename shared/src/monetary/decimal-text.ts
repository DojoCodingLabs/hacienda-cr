/**
 * Exact decimal text primitives for the public monetary type.
 *
 * The public monetary value of the SDK is a **bounded decimal text**: a
 * non-negative decimal with at most 13 integer digits and at most 5 decimal
 * places. Every step of the money path runs on scaled integers (`bigint`),
 * never on binary floating point, so a value keeps its exact digits from the
 * input boundary to the emitted XML.
 *
 * Rounding rule (single source of truth for the money path): **5 decimals,
 * HALF_UP** — increment when the sixth decimal is greater than or equal to 5.
 * The rule is cited from the Hacienda annex vendored in the SDK
 * (`packages/sdk/schemas/2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf`, "II.
 * Especificaciones técnicas y formato de los comprobantes electrónicos",
 * p. 13-14), which shows `20.203518 ≈ 20.20352`.
 *
 * This module holds the *representation* primitives (parse, format, bounds).
 * The arithmetic lives in the SDK kernel (`packages/sdk/src/tax/exact-decimal.ts`).
 */

/** Number of decimal places every monetary amount carries. */
export const MONEY_SCALE = 5;

/** `10 ** MONEY_SCALE` — the factor between a scaled integer and its text form. */
export const MONEY_FACTOR = 100000n;

/**
 * Largest accepted monetary amount, as a scaled integer:
 * `9999999999999.99999` (13 integer digits plus 5 decimals).
 */
export const MAX_MONEY_SCALED = 999999999999999999n;

/** Smallest accepted monetary amount, as a scaled integer. */
export const MIN_MONEY_SCALED = 0n;

/**
 * Bounded decimal text: non-negative, at most 13 integer digits and at most
 * 5 decimal places, in plain notation (no sign, no exponent, no leading
 * zeros beyond a single `0`).
 */
export const MONETARY_TEXT_PATTERN = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,5})?$/;

/** Error raised when a monetary value falls outside the accepted domain. */
export class MonetaryValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonetaryValueError";
  }
}

/**
 * Expand an exponential decimal representation into plain notation.
 *
 * `String(1e-7)` is `"1e-7"`; the money path needs `"0.0000001"`.
 * Returns the input unchanged when it is not in exponential form.
 */
function expandExponential(text: string): string {
  const match = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(text);
  if (!match) return text;
  const [, whole = "0", fraction = "", exponentText = "0"] = match;
  const exponent = Number(exponentText);
  const digits = whole + fraction;
  const pointIndex = whole.length + exponent;
  if (pointIndex <= 0) return `0.${"0".repeat(-pointIndex)}${digits}`;
  if (pointIndex >= digits.length) return `${digits}${"0".repeat(pointIndex - digits.length)}`;
  return `${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}

/**
 * Scale a plain decimal string to an integer, rounding at `scale` decimals
 * with HALF_UP. The input must be a plain, non-negative decimal string.
 */
export function scaledFromPlainDecimal(text: string, scale: number): bigint {
  const [whole = "0", fraction = ""] = text.split(".");
  const kept = fraction.slice(0, scale).padEnd(scale, "0");
  const rest = fraction.slice(scale);
  const base = BigInt(whole) * 10n ** BigInt(scale) + BigInt(kept);
  const firstDropped = rest.charAt(0);
  return rest.length > 0 && firstDropped >= "5" ? base + 1n : base;
}

/**
 * Render a scaled integer as plain decimal text, without forced zeros
 * (`113000`, not `113000.00000`) and without scientific notation.
 */
export function formatScaledDecimal(scaled: bigint, scale: number): string {
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const factor = 10n ** BigInt(scale);
  const whole = absolute / factor;
  const fraction = (absolute % factor).toString().padStart(scale, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/**
 * Scale a finite number to an integer at `scale` decimals, rounding HALF_UP.
 * The number is read through its shortest round-trip decimal representation,
 * so binary artifacts such as `0.1 + 0.2` do not survive the conversion.
 */
export function scaledFromNumber(value: number, scale: number): bigint {
  if (!Number.isFinite(value)) {
    throw new MonetaryValueError(`Valor no finito: ${value}.`);
  }
  const negative = value < 0;
  const plain = expandExponential(String(Math.abs(value)));
  const scaled = scaledFromPlainDecimal(plain, scale);
  return negative ? -scaled : scaled;
}

/** Describe why a decimal text is outside the accepted monetary domain. */
function describeMonetaryTextError(text: string): string {
  if (/[eE]/.test(text)) {
    return `Monto en notación exponencial no admitido: "${text}". Use texto decimal plano.`;
  }
  if (text.startsWith("-")) {
    return `Monto negativo no admitido: "${text}".`;
  }
  const [whole = "", fraction = ""] = text.split(".");
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction)) {
    return `Monto no numérico: "${text}".`;
  }
  if (whole.length > 13) {
    return `Monto fuera de cota: "${text}" (máximo 9999999999999.99999).`;
  }
  if (fraction.length > MONEY_SCALE) {
    return `Monto con más de ${MONEY_SCALE} decimales: "${text}".`;
  }
  return `Monto fuera del dominio acotado (0..9999999999999.99999): "${text}".`;
}

/**
 * Parse a bounded monetary text into its scaled integer.
 *
 * @throws {MonetaryValueError} when the text is not a bounded decimal.
 */
export function parseMonetaryText(text: string): bigint {
  if (!MONETARY_TEXT_PATTERN.test(text)) {
    throw new MonetaryValueError(describeMonetaryTextError(text));
  }
  const scaled = scaledFromPlainDecimal(text, MONEY_SCALE);
  if (scaled > MAX_MONEY_SCALED) {
    throw new MonetaryValueError(`Monto fuera de cota: "${text}" (máximo 9999999999999.99999).`);
  }
  return scaled;
}

/**
 * Normalize a monetary input into its canonical bounded decimal text.
 *
 * Accepts the legacy JSON number (a binary float that carries no decimal
 * contract) or a bounded decimal text. A number is read through its shortest
 * round-trip representation and rounded HALF_UP at five decimals; a text is
 * validated strictly and canonicalized (trailing zeros dropped).
 *
 * @throws {MonetaryValueError} when the value is outside the accepted domain.
 */
export function normalizeMonetaryInput(value: number | string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new MonetaryValueError(`Monto no finito: ${value}.`);
    }
    if (value < 0) {
      throw new MonetaryValueError(`Monto negativo no admitido: ${value}.`);
    }
    const plain = expandExponential(String(value));
    const scaled = scaledFromPlainDecimal(plain, MONEY_SCALE);
    if (scaled > MAX_MONEY_SCALED) {
      throw new MonetaryValueError(`Monto fuera de cota: ${value} (máximo 9999999999999.99999).`);
    }
    return formatScaledDecimal(scaled, MONEY_SCALE);
  }
  return formatScaledDecimal(parseMonetaryText(value), MONEY_SCALE);
}

/**
 * Whether a decimal text denotes a strictly positive amount.
 * Used by the schemas that require a positive amount.
 */
export function isPositiveMonetaryText(text: string): boolean {
  return /[1-9]/.test(text);
}
