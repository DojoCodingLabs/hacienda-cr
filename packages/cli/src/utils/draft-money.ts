/**
 * Presentation wrappers for `hacienda draft`.
 *
 * The CLI no longer owns a monetary arithmetic or rounding rule. Line and
 * summary calculations are delegated to the SDK's exact decimal calculator;
 * this module only normalizes user text and maps SDK results into the small
 * shape the interactive prompts use.
 */

import {
  DecimalQuantitySchema,
  MAX_MONEY_SCALED,
  MONEY_SCALE,
  formatScaledDecimal,
  normalizeMonetaryInput,
  parseMonetaryText,
  scaledFromPlainDecimal,
  type DecimalCurrency,
  type DecimalTaxInput,
} from "@dojocoding/hacienda-shared";
import {
  calculateDecimalInvoiceSummary,
  calculateDecimalLineItemTotals,
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

/** Validate and canonicalize a draft quantity with the shared quantity schema. */
export function normalizeDraftQuantity(value: string): ParsedQuantity {
  const text = value.trim();
  const parsed = DecimalQuantitySchema.safeParse(text);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        `Quantity "${text}" must be positive unsigned decimal text with at most 3 decimals.`,
    );
  }
  const scaled = scaledFromPlainDecimal(text, DRAFT_QUANTITY_SCALE);
  return { scaled, text: formatScaledDecimal(scaled, DRAFT_QUANTITY_SCALE) };
}

/** Validate and canonicalize a monetary amount with the shared boundary. */
export function normalizeDraftMoney(value: string): ParsedMoney {
  const text = value.trim();
  if (text === "") throw new Error("A monetary amount is required.");
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

function percentageText(tarifa: number): string {
  if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 100) {
    throw new Error(`Invalid IVA percentage: ${String(tarifa)}.`);
  }
  return String(tarifa);
}

/**
 * Calculate one draft line through the shared exact line calculator.
 *
 * The synthetic CABYS/detail/unit values are only schema placeholders; the
 * amounts and quantity are the caller's values. The returned tax code is not
 * used for policy, only to let the shared schema run the same path as a
 * document line.
 */
export function calculateDraftLineMoney(input: DraftLineMoneyInput): DraftLineMoneyResult {
  const cantidad = normalizeDraftQuantity(input.cantidad);
  const precio = normalizeDraftMoney(input.precioUnitario);
  const tarifa = percentageText(input.tarifa);
  const payable = parseMonetaryText(tarifa) > 0n;
  const tax: DecimalTaxInput = {
    codigo: "01",
    codigoTarifaIVA: payable ? "08" : "01",
    tarifa,
  };
  const calculated = calculateDecimalLineItemTotals({
    numeroLinea: 1,
    codigoCabys: "0000000000000",
    cantidad: cantidad.text,
    unidadMedida: "Unid",
    detalle: "Draft line",
    precioUnitario: precio.text,
    impuesto: [tax],
    esServicio: false,
  });
  const calculatedTax = calculated.impuesto[0];
  return {
    cantidad: calculated.cantidad,
    precioUnitario: calculated.precioUnitario,
    montoTotal: calculated.montoTotal,
    subTotal: calculated.subTotal,
    impuestoMonto: calculatedTax?.monto ?? "0",
    impuestoNeto: calculated.impuestoNeto ?? "0",
    montoTotalLinea: calculated.montoTotalLinea,
    taxable: payable,
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

const CRC: DecimalCurrency = { codigoMoneda: "CRC", tipoCambio: "1" };

/**
 * Aggregate draft lines through the shared exact summary calculator.
 *
 * The interactive draft has no service/merchandise classifier, so every line
 * is merchandise. The synthetic tax carries the line's already-quantized net
 * amount; the calculator only classifies and sums, it does not re-round.
 */
export function buildDraftSummary(
  lines: readonly DraftSummaryLine[],
  medioPago: string,
): DraftSummary {
  const summary = calculateDecimalInvoiceSummary(
    lines.map((line) => ({
      montoTotal: line.subTotal,
      subTotal: line.subTotal,
      impuesto: [
        {
          codigo: "01" as const,
          codigoTarifaIVA: line.taxable ? ("08" as const) : ("01" as const),
          tarifa: line.taxable ? "13" : "0",
          monto: line.impuestoNeto,
        },
      ],
      impuestoNeto: line.impuestoNeto,
      esServicio: false,
    })),
    CRC,
  );
  return {
    totalServGravados: summary.totalServGravados ?? "0",
    totalServExentos: summary.totalServExentos ?? "0",
    totalMercanciasGravadas: summary.totalMercanciasGravadas ?? "0",
    totalMercanciasExentas: summary.totalMercanciasExentas ?? "0",
    totalGravado: summary.totalGravado ?? "0",
    totalExento: summary.totalExento ?? "0",
    totalVenta: summary.totalVenta,
    totalDescuentos: summary.totalDescuentos ?? "0",
    totalVentaNeta: summary.totalVentaNeta,
    totalImpuesto: summary.totalImpuesto ?? "0",
    medioPago: [{ tipoMedioPago: medioPago, totalMedioPago: summary.totalComprobante }],
    totalComprobante: summary.totalComprobante,
  };
}
