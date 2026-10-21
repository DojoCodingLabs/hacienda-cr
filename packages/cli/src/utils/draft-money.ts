/**
 * Exact monetary arithmetic for `hacienda draft`.
 *
 * The interactive draft keeps money and quantities as bounded decimal text.
 * It never parses them with `Number`, `parseFloat` or `toFixed`, and it never
 * applies a local rounding rule: multiplication and the IVA percentage are
 * delegated to the SDK's exact decimal kernel. The one rounding rule — five
 * decimals, HALF_UP — lives in the shared decimal-text boundary and the kernel,
 * cited from the Hacienda v4.4 annex (pp. 13-14).
 */

import {
  MAX_MONEY_SCALED,
  MONEY_SCALE,
  formatScaledDecimal,
  normalizeMonetaryInput,
  parseMonetaryText,
  scaledFromPlainDecimal,
} from "@dojocoding/hacienda-shared";
import {
  EXACT_MONEY_SCALE,
  multiplyExactDecimal,
  percentExactDecimal,
} from "@dojocoding/hacienda-sdk";

/** Quantity scale required by the v4.4 XSD (`fractionDigits: 3`). */
export const DRAFT_QUANTITY_SCALE = 3;

/** A line's monetary calculation, all values as canonical decimal text. */
export interface DraftLineMoneyResult {
  /** Canonical quantity text, at most three decimal places. */
  cantidad: string;
  /** Canonical unit-price text, at most five decimal places. */
  precioUnitario: string;
  /** Quantity × unit price, rounded HALF_UP to five decimals. */
  montoTotal: string;
  /** Line subtotal (no discounts in the interactive draft). */
  subTotal: string;
  /** IVA amount, rounded HALF_UP to five decimals. */
  impuestoMonto: string;
  /** Net IVA for the line. */
  impuestoNeto: string;
  /** Subtotal + net IVA. */
  montoTotalLinea: string;
  /** Whether the line carries a positive IVA rate. */
  taxable: boolean;
}

/** Input for one exact draft line. */
export interface DraftLineMoneyInput {
  /** Quantity entered by the user, as decimal text. */
  cantidad: string;
  /** Unit price entered by the user, as decimal text. */
  precioUnitario: string;
  /** IVA percentage (0 for an exempt line). */
  tarifa: number;
}

interface ParsedQuantity {
  scaled: bigint;
  text: string;
}

interface ParsedMoney {
  scaled: bigint;
  text: string;
}

/**
 * Validate and canonicalize a draft quantity.
 *
 * Quantities are positive, unsigned, plain decimal text with at most three
 * fractional digits and at most sixteen significant digits. Precision beyond
 * three decimals is rejected, not rounded.
 */
export function normalizeDraftQuantity(value: string): ParsedQuantity {
  const text = value.trim();
  if (text === "") throw new Error("Quantity is required.");

  // totalDigits=16, fractionDigits=3 for the official quantity type.
  if (!/^(?:0|[1-9]\d{0,15})(?:\.\d{1,3})?$/.test(text)) {
    throw new Error(
      `Quantity "${text}" must be unsigned plain decimal text with at most 3 decimals.`,
    );
  }

  const [whole = "", fraction = ""] = text.split(".");
  const significant = (whole + fraction).replace(/^0+/, "").replace(/0+$/, "");
  if (significant.length > 16) {
    throw new Error(`Quantity "${text}" exceeds 16 significant digits.`);
  }

  const scaled = scaledFromPlainDecimal(text, DRAFT_QUANTITY_SCALE);
  if (scaled <= 0n) throw new Error("Quantity must be greater than zero.");

  return { scaled, text: formatScaledDecimal(scaled, DRAFT_QUANTITY_SCALE) };
}

/**
 * Validate and canonicalize a monetary amount entered by the user.
 *
 * This uses the shared bounded-decimal boundary. A value with more than five
 * decimals is rejected; it is never silently rounded at this input boundary.
 */
export function normalizeDraftMoney(value: string): ParsedMoney {
  const text = value.trim();
  if (text === "") throw new Error("A monetary amount is required.");

  // `normalizeMonetaryInput` handles only text here; no Number branch is used.
  const canonical = normalizeMonetaryInput(text);
  return { text: canonical, scaled: parseMonetaryText(canonical) };
}

/** Render a scaled money integer as canonical bounded decimal text. */
export function formatDraftMoney(value: bigint): string {
  if (value < 0n || value > MAX_MONEY_SCALED) {
    throw new RangeError("Draft monetary amount is outside 0..9999999999999.99999.");
  }
  return formatScaledDecimal(value, MONEY_SCALE);
}

/** Scale an IVA percentage to the exact kernel's percentage representation. */
function scalePercentage(tarifa: number): bigint {
  if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 100) {
    throw new Error(`Invalid IVA percentage: ${String(tarifa)}.`);
  }
  // A percentage is not a monetary amount; its constant is a short decimal
  // literal. Convert its decimal spelling, never its binary representation.
  return scaledFromPlainDecimal(String(tarifa), EXACT_MONEY_SCALE);
}

/**
 * Calculate one draft line using the exact decimal kernel.
 *
 * Steps:
 * 1. quantity × unit price, rounded HALF_UP at five decimals;
 * 2. IVA = subtotal × percentage / 100, rounded HALF_UP at five decimals;
 * 3. line total = subtotal + IVA, exact integer addition.
 */
export function calculateDraftLineMoney(input: DraftLineMoneyInput): DraftLineMoneyResult {
  const cantidad = normalizeDraftQuantity(input.cantidad);
  const precio = normalizeDraftMoney(input.precioUnitario);

  const gross = multiplyExactDecimal(
    cantidad.scaled,
    precio.scaled,
    DRAFT_QUANTITY_SCALE,
    MONEY_SCALE,
    MONEY_SCALE,
  );
  const subTotal = formatDraftMoney(gross);

  const tarifa = scalePercentage(input.tarifa);
  const tax =
    input.tarifa > 0
      ? percentExactDecimal(gross, tarifa, MONEY_SCALE, EXACT_MONEY_SCALE, MONEY_SCALE)
      : 0n;
  const impuestoNeto = formatDraftMoney(tax);
  const total = gross + tax;

  return {
    cantidad: cantidad.text,
    precioUnitario: precio.text,
    montoTotal: subTotal,
    subTotal,
    impuestoMonto: impuestoNeto,
    impuestoNeto,
    montoTotalLinea: formatDraftMoney(total),
    taxable: input.tarifa > 0,
  };
}

/** Line fields needed to aggregate the invoice summary exactly. */
export interface DraftSummaryLine {
  subTotal: string;
  impuestoNeto: string;
  taxable: boolean;
}

/** Exact invoice summary emitted by the interactive draft. */
export interface DraftSummary {
  totalServGravados: string;
  totalServExentos: string;
  totalMercanciasGravadas: string;
  totalMercanciasExentas: string;
  totalGravado: string;
  totalExento: string;
  totalVenta: string;
  totalDescuentos: string;
  totalVentaNeta: string;
  totalImpuesto: string;
  medioPago: { tipoMedioPago: string; totalMedioPago: string }[];
  totalComprobante: string;
}

/**
 * Aggregate already-quantized line amounts without another rounding step.
 *
 * Each line's subtotal and tax are exact five-decimal integers, so the summary
 * is an integer sum. Re-rounding here would be a second, weaker money rule.
 */
export function buildDraftSummary(
  lines: readonly DraftSummaryLine[],
  medioPago: string,
): DraftSummary {
  let totalGravado = 0n;
  let totalExento = 0n;
  let totalImpuesto = 0n;

  for (const line of lines) {
    const subTotal = parseMonetaryText(line.subTotal);
    const tax = parseMonetaryText(line.impuestoNeto);
    if (line.taxable) totalGravado += subTotal;
    else totalExento += subTotal;
    totalImpuesto += tax;
  }

  const totalVenta = totalGravado + totalExento;
  const totalComprobante = totalVenta + totalImpuesto;

  return {
    totalServGravados: "0",
    totalServExentos: "0",
    totalMercanciasGravadas: formatDraftMoney(totalGravado),
    totalMercanciasExentas: formatDraftMoney(totalExento),
    totalGravado: formatDraftMoney(totalGravado),
    totalExento: formatDraftMoney(totalExento),
    totalVenta: formatDraftMoney(totalVenta),
    totalDescuentos: "0",
    totalVentaNeta: formatDraftMoney(totalVenta),
    totalImpuesto: formatDraftMoney(totalImpuesto),
    medioPago: [{ tipoMedioPago: medioPago, totalMedioPago: formatDraftMoney(totalComprobante) }],
    totalComprobante: formatDraftMoney(totalComprobante),
  };
}
