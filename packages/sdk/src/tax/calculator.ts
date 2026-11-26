/**
 * Tax calculation utilities for Hacienda v4.4 electronic invoicing.
 *
 * Implements IVA tax computation, line item total calculation,
 * and invoice summary aggregation per the Hacienda specification.
 *
 * All monetary amounts are rounded to 5 decimal places as required
 * by the Hacienda specification.
 */

import type {
  Impuesto,
  Descuento,
  CodigoComercial,
  Exoneracion,
  TotalDesgloseImpuesto,
  DatosImpuestoEspecifico,
} from "@dojocoding/hacienda-shared";
import {
  ImpuestoSchema,
  IvaRateCode,
  TaxCode,
  formatScaledDecimal,
  scaledFromNumber,
} from "@dojocoding/hacienda-shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of decimal places for monetary rounding (Hacienda requirement). */
const DECIMAL_PLACES = 5;

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/**
 * Round a number to 5 decimal places (Hacienda requirement).
 *
 * Uses JavaScript `Number.toFixed(5)` over binary floating-point values.
 * This is not an exact decimal or banker's-rounding implementation:
 * `toFixed` rounds the binary value, so an exact sixth-decimal half whose
 * nearest double sits just below the half rounds down (`20.203515` becomes
 * `20.20351`, where decimal HALF_UP gives `20.20352`). Non-finite input is
 * passed through (`NaN` stays `NaN`, `±Infinity` stays `±Infinity`).
 *
 * This is the `"legacy-tofixed"` rounding mode, the default of every legacy
 * Number calculator. Its bytes are preserved on purpose; see
 * {@link round5HalfUp} and {@link createLegacyCalculator} for the opt-in
 * decimal HALF_UP mode, and the exact `calculateDecimal*` path for
 * bit-exact decimal text.
 *
 * @param value - The numeric value to round.
 * @returns The value rounded to 5 decimal places.
 */
export function round5(value: number): number {
  return Number(value.toFixed(DECIMAL_PLACES));
}

/**
 * Round a number to 5 decimal places with decimal HALF_UP (opt-in
 * `"half-up"` rounding mode of the legacy Number calculators).
 *
 * The rule is the one in Hacienda's "Anexos y Estructuras" v4.4, section II
 * ("Especificaciones técnicas y formato de los comprobantes electrónicos"),
 * p. 13-14: amounts carry 5 decimals and round up when the sixth decimal is
 * 5 or more. It reuses the shared exact-decimal kernel
 * (`scaledFromNumber` + `formatScaledDecimal`), which reads the number
 * through its shortest round-trip decimal text (`String(value)`), so
 * `20.203515` rounds to `20.20352` even though its nearest double is
 * slightly below the half.
 *
 * - Negative values round half away from zero (`-20.203515` → `-20.20352`),
 *   the symmetric HALF_UP convention.
 * - The result is still a `number`: the decimal value follows HALF_UP, but
 *   only the exact `calculateDecimal*` path keeps the decimal text bit-exact.
 * - Non-finite input (`NaN`, `±Infinity`) throws `MonetaryValueError` from
 *   `@dojocoding/hacienda-shared` instead of propagating, because a
 *   non-finite amount can never be a valid Hacienda monetary value.
 *
 * @param value - The numeric value to round.
 * @returns The value rounded to 5 decimal places, HALF_UP.
 * @throws MonetaryValueError when `value` is not finite.
 */
export function round5HalfUp(value: number): number {
  return Number(formatScaledDecimal(scaledFromNumber(value, DECIMAL_PLACES), DECIMAL_PLACES));
}

/**
 * Rounding mode of the legacy Number calculators.
 *
 * - `"legacy-tofixed"` (default): {@link round5}, `Number.toFixed(5)`. Keeps
 *   the bytes every earlier release produced.
 * - `"half-up"`: {@link round5HalfUp}, decimal HALF_UP per the Anexo v4.4
 *   (p. 13-14). Changes the result of exact sixth-decimal halves.
 *
 * `"legacy-tofixed"` stays the default for all 0.x releases. It may stop
 * being the default only in a future major release (1.0); see MIGRATION.md.
 */
export type LegacyRoundingMode = "legacy-tofixed" | "half-up";

/** Every accepted {@link LegacyRoundingMode}, in documentation order. */
export const LEGACY_ROUNDING_MODES: readonly LegacyRoundingMode[] = Object.freeze([
  "legacy-tofixed",
  "half-up",
]);

/** Default rounding mode of the legacy Number calculators. */
export const DEFAULT_LEGACY_ROUNDING_MODE: LegacyRoundingMode = "legacy-tofixed";

/** Options for {@link createLegacyCalculator}. */
export interface LegacyCalculationOptions {
  /** Rounding mode. Defaults to {@link DEFAULT_LEGACY_ROUNDING_MODE}. */
  readonly roundingMode?: LegacyRoundingMode;
}

type Rounder = (value: number) => number;

function resolveRounder(options: LegacyCalculationOptions | undefined): {
  mode: LegacyRoundingMode;
  round: Rounder;
} {
  if (options !== undefined && (typeof options !== "object" || options === null))
    throw new TypeError("Legacy calculation options must be an object");
  const mode: unknown = options?.roundingMode ?? DEFAULT_LEGACY_ROUNDING_MODE;
  if (mode === "legacy-tofixed") return { mode, round: round5 };
  if (mode === "half-up") return { mode, round: round5HalfUp };
  throw new TypeError(
    `Unknown roundingMode ${JSON.stringify(mode)}; expected one of ${LEGACY_ROUNDING_MODES.map((m) => `"${m}"`).join(", ")}`,
  );
}

/** Compute a tax amount without prematurely rounding the specific-tax factors. */
export function calculateTaxAmount(tax: TaxAmountInput, base: number, cantidad: number): number {
  return taxAmountWith(round5, tax, base, cantidad);
}

/** Tax fields read by {@link calculateTaxAmount}. */
type TaxAmountInput = Pick<
  LineItemTaxInput,
  "codigo" | "tarifa" | "monto" | "datosImpuestoEspecifico"
>;

function taxAmountWith(
  round: Rounder,
  tax: TaxAmountInput,
  base: number,
  cantidad: number,
): number {
  const data = tax.datosImpuestoEspecifico;
  if (["03", "04", "05", "06"].includes(tax.codigo)) {
    if (!data) throw new Error(`Specific tax ${tax.codigo} requires datosImpuestoEspecifico`);
    if (tax.codigo === "04") {
      if (data.proporcion === undefined || data.porcentaje === undefined)
        throw new Error("Alcohol tax requires porcentaje and proporcion");
      const expectedProportion = round((data.cantidadUnidadMedida * data.porcentaje) / 100);
      if (Math.abs(data.proporcion - expectedProportion) > 0.000001)
        throw new Error("Alcohol proporcion must equal cantidadUnidadMedida * porcentaje / 100");
      return round(cantidad * data.proporcion * data.impuestoUnidad);
    }
    // Code 05 has different formulas for beverages and toilet soap. Its amount
    // must be supplied by the caller rather than guessing the product category.
    if (tax.codigo === "05") {
      if (tax.monto === undefined || !Number.isFinite(tax.monto) || tax.monto < 0)
        throw new Error("Tax 05 requires an explicit monto calculated for the product category");
      return round(tax.monto);
    }
    return round(
      (tax.codigo === "06" ? cantidad : 1) * data.cantidadUnidadMedida * data.impuestoUnidad,
    );
  }
  if (tax.codigo === "02" && tax.tarifa === undefined && tax.monto !== undefined) {
    if (!Number.isFinite(tax.monto) || tax.monto < 0)
      throw new Error("ISC amount must be finite and non-negative");
    return round(tax.monto);
  }
  if (tax.tarifa === undefined) throw new Error(`Tax ${tax.codigo} requires tarifa`);
  const amount = round((base * tax.tarifa) / 100);
  if (tax.monto !== undefined && Math.abs(amount - tax.monto) > 0.000001)
    throw new Error("Tax amount does not match its percentage rate");
  return amount;
}

// ---------------------------------------------------------------------------
// Line Item Input (simplified — for calculation, before computed fields)
// ---------------------------------------------------------------------------

/** Tax input for a line item before calculation. */
export interface LineItemTaxInput {
  /** Tax type code (e.g., "01" for IVA). */
  codigo: string;

  /** IVA rate code (CodigoTarifaIVA). Required for IVA taxes. */
  codigoTarifaIVA?: string;

  /** Tax rate percentage (e.g., 13 for 13%). */
  tarifa?: number;

  /** Explicit amount for ISC (02) or product-specific tax 05. */
  monto?: number;

  datosImpuestoEspecifico?: DatosImpuestoEspecifico;

  /** Exoneration information (v4.4 shape). Optional. */
  exoneracion?: {
    /** Exoneration document type (TipoDocumentoEX1). */
    tipoDocumento: string;
    /** Exoneration document number. */
    numeroDocumento: string;
    /** Issuing institution code (NombreInstitucion, coded in v4.4). */
    nombreInstitucion: string;
    /** Issue date (ISO 8601). */
    fechaEmision: string;
    /**
     * Exonerated tariff percentage points (TarifaExonerada, 0..tarifa).
     * The exonerated amount is subTotal * tarifaExonerada / 100.
     */
    tarifaExonerada: number;
  };
}

/**
 * Input for a single line item before tax/total calculation.
 *
 * The caller provides the core values; computed fields
 * (montoTotal, subTotal, impuestoNeto, montoTotalLinea) are calculated.
 */
export interface LineItemInput {
  /** Line number (1-based). */
  numeroLinea: number;

  /** CABYS code (13 digits). */
  codigoCabys: string;

  /** Commercial codes. Optional. */
  codigoComercial?: CodigoComercial[];

  /** Quantity. Must be positive. */
  cantidad: number;

  /** Unit of measure code. */
  unidadMedida: string;

  /** Item description. */
  detalle: string;

  /** Unit price (before taxes and discounts). */
  precioUnitario: number;

  /**
   * Discounts applied to this line item. Optional.
   * Each discount has an amount and a reason.
   */
  descuento?: Descuento[];

  /**
   * Taxes to apply. Each specifies the tax code, rate code, and rate.
   * The `monto` field will be calculated.
   */
  impuesto?: LineItemTaxInput[];

  /**
   * Whether this item is a service (true) or merchandise (false).
   * Used for the ResumenFactura breakdown. Defaults to false (merchandise).
   */
  esServicio?: boolean;
}

/**
 * A fully calculated line item with all computed fields.
 * Mirrors the LineaDetalle interface but adds the esServicio flag.
 */
export interface CalculatedLineItem {
  /** Line number (1-based, sequential). */
  numeroLinea: number;

  /** CABYS code (13 digits). */
  codigoCabys: string;

  /** Commercial codes. Optional. */
  codigoComercial?: CodigoComercial[];

  /** Quantity. */
  cantidad: number;

  /** Unit of measure. */
  unidadMedida: string;

  /** Item description. */
  detalle: string;

  /** Unit price (before taxes and discounts). */
  precioUnitario: number;

  /** Total line amount (cantidad * precioUnitario). */
  montoTotal: number;

  /** Discounts applied. Optional. */
  descuento?: Descuento[];

  /** Subtotal after discounts. */
  subTotal: number;

  /** Base taxable amount. */
  baseImponible?: number;

  /** Taxes applied to this line item (v4.4 requires at least one). */
  impuesto: Impuesto[];

  /** Net tax amount. */
  impuestoNeto?: number;

  /** Total line amount including taxes. */
  montoTotalLinea: number;

  /**
   * Whether this item is a service (true) or merchandise (false).
   * Carried through for invoice summary calculation.
   */
  esServicio: boolean;
}

/** IVA-related tax codes. */
const IVA_TAX_CODES: string[] = [
  TaxCode.IVA,
  TaxCode.IVA_CALCULO_ESPECIAL,
  TaxCode.IVA_BIENES_USADOS,
];

/**
 * Calculate all computed fields for a single line item.
 *
 * Computes:
 * - `montoTotal` = cantidad * precioUnitario
 * - `subTotal` = montoTotal - sum(discounts)
 * - `baseImponible` = subTotal + applicable ISC and beverage taxes
 * - `impuesto[].monto` = applicable rate, specific-tax formula or explicit ISC amount
 * - `impuestoNeto` = sum of all tax amounts (after exonerations)
 * - `montoTotalLinea` = subTotal + impuestoNeto
 *
 * @param item - The line item input with core values.
 * @returns A fully calculated line item ready for XML generation.
 */
export function calculateLineItemTotals(item: LineItemInput): CalculatedLineItem {
  return lineItemTotalsWith(round5, item);
}

function lineItemTotalsWith(round: Rounder, item: LineItemInput): CalculatedLineItem {
  // MontoTotal = cantidad * precioUnitario
  const montoTotal = round(item.cantidad * item.precioUnitario);

  // Sum of discounts
  const totalDescuento = item.descuento
    ? round(item.descuento.reduce((sum: number, d: Descuento) => sum + d.montoDescuento, 0))
    : 0;

  // SubTotal = montoTotal - discounts
  const subTotal = round(montoTotal - totalDescuento);

  // ISC and beverage taxes are included in the IVA base.
  const baseImponible = round(
    subTotal +
      (item.impuesto ?? []).reduce(
        (sum, tax) =>
          sum +
          (["02", "04", "05"].includes(tax.codigo)
            ? taxAmountWith(round, tax, subTotal, item.cantidad)
            : 0),
        0,
      ),
  );

  // Calculate taxes. v4.4 requires at least one Impuesto per line, so an
  // untaxed line gets a synthetic exempt IVA entry (codigo 01, tarifa 0).
  const calculatedTaxes: Impuesto[] = [];
  let impuestoNeto = 0;

  const taxInputs: LineItemTaxInput[] =
    item.impuesto && item.impuesto.length > 0
      ? item.impuesto
      : [{ codigo: TaxCode.IVA, codigoTarifaIVA: IvaRateCode.EXENTO, tarifa: 0 }];

  for (const tax of taxInputs) {
    // Apply the applicable formula before monetary rounding.
    const fullTaxAmount = taxAmountWith(
      round,
      tax,
      IVA_TAX_CODES.includes(tax.codigo) ? baseImponible : subTotal,
      item.cantidad,
    );

    let taxAmount = fullTaxAmount;
    let exoneracion: Exoneracion | undefined;

    // Handle exoneration: the exonerated amount is the portion of the
    // taxable base covered by the exonerated tariff points.
    if (tax.exoneracion) {
      if (typeof tax.exoneracion.tarifaExonerada !== "number") {
        throw new TypeError(
          "exoneracion.tarifaExonerada must be a number (v4.4). " +
            "The v4.3 field porcentajeExoneracion was replaced by tarifaExonerada " +
            "(exonerated tariff percentage points, 0..tarifa).",
        );
      }
      const exonerationPortion = round(
        ((IVA_TAX_CODES.includes(tax.codigo) ? baseImponible : subTotal) *
          tax.exoneracion.tarifaExonerada) /
          100,
      );
      taxAmount = round(Math.max(0, fullTaxAmount - exonerationPortion));

      exoneracion = {
        tipoDocumento: tax.exoneracion.tipoDocumento as Exoneracion["tipoDocumento"],
        numeroDocumento: tax.exoneracion.numeroDocumento,
        nombreInstitucion: tax.exoneracion.nombreInstitucion as Exoneracion["nombreInstitucion"],
        fechaEmision: tax.exoneracion.fechaEmision,
        tarifaExonerada: tax.exoneracion.tarifaExonerada,
        montoExoneracion: exonerationPortion,
      };
    }

    const calculatedTax: Impuesto = {
      codigo: tax.codigo as Impuesto["codigo"],
      ...(tax.tarifa !== undefined ? { tarifa: tax.tarifa } : {}),
      ...(tax.datosImpuestoEspecifico
        ? { datosImpuestoEspecifico: tax.datosImpuestoEspecifico }
        : {}),
      monto: fullTaxAmount,
      ...(tax.codigoTarifaIVA
        ? { codigoTarifaIVA: tax.codigoTarifaIVA as Impuesto["codigoTarifaIVA"] }
        : {}),
      ...(exoneracion ? { exoneracion } : {}),
    };

    ImpuestoSchema.parse(calculatedTax);
    calculatedTaxes.push(calculatedTax);

    // Net tax includes all tax codes after exoneration.
    impuestoNeto = round(impuestoNeto + taxAmount);
  }

  impuestoNeto = round(impuestoNeto);

  // MontoTotalLinea = subTotal + impuestoNeto
  const montoTotalLinea = round(subTotal + impuestoNeto);

  const result: CalculatedLineItem = {
    numeroLinea: item.numeroLinea,
    codigoCabys: item.codigoCabys,
    cantidad: item.cantidad,
    unidadMedida: item.unidadMedida,
    detalle: item.detalle,
    precioUnitario: item.precioUnitario,
    montoTotal,
    subTotal,
    impuesto: calculatedTaxes,
    montoTotalLinea,
    esServicio: item.esServicio ?? false,
  };

  if (item.codigoComercial && item.codigoComercial.length > 0) {
    result.codigoComercial = item.codigoComercial;
  }

  if (item.descuento && item.descuento.length > 0) {
    result.descuento = item.descuento;
  }

  result.impuesto = calculatedTaxes;
  result.baseImponible = baseImponible;
  result.impuestoNeto = impuestoNeto;

  return result;
}

// ---------------------------------------------------------------------------
// Invoice Summary Calculation
// ---------------------------------------------------------------------------

/**
 * Result of invoice summary calculation, matching the ResumenFactura structure.
 */
export interface InvoiceSummary {
  /** Total taxable services. */
  totalServGravados: number;
  /** Total exempt services. */
  totalServExentos: number;
  /** Total exonerated services. */
  totalServExonerado: number;
  /** Total taxable merchandise. */
  totalMercanciasGravadas: number;
  /** Total exempt merchandise. */
  totalMercanciasExentas: number;
  /** Total exonerated merchandise. */
  totalMercExonerada: number;
  /** Total taxable (services + merchandise). */
  totalGravado: number;
  /** Total exempt (services + merchandise). */
  totalExento: number;
  /** Total exonerated (services + merchandise). */
  totalExonerado: number;
  /** Total sales (before discounts). */
  totalVenta: number;
  /** Total discounts. */
  totalDescuentos: number;
  /** Net sales (totalVenta - totalDescuentos). */
  totalVentaNeta: number;
  /** Per-tax-code totals breakdown (v4.4 TotalDesgloseImpuesto). */
  totalDesgloseImpuesto: TotalDesgloseImpuesto[];
  /** Total net tax across all tax codes. */
  totalImpuesto: number;
  /** Grand total. */
  totalComprobante: number;
}

/**
 * Classify a line item as gravado (taxed), exento (exempt), or exonerado (exonerated).
 *
 * A line is:
 * - **Exento**: no taxes at all, or all tax rates are 0
 * - **Exonerado**: has an exoneration with 100% exoneration percentage
 * - **Gravado**: has taxes with rate > 0
 *
 * For mixed scenarios (partial exoneration), the item is classified
 * as gravado with the exonerated portion tracked separately.
 */
function classifyLineItem(
  item: CalculatedLineItem,
  round: Rounder,
): {
  gravado: number;
  exento: number;
  exonerado: number;
} {
  const grossAmount = item.montoTotal;

  if (!item.impuesto || item.impuesto.length === 0) {
    // No taxes at all => exempt
    return { gravado: 0, exento: grossAmount, exonerado: 0 };
  }

  // A positive rate/factor remains taxable even if its computed tax rounds to zero.
  // Amount-only taxes use their supplied amount to determine taxability.
  const allZeroRate = item.impuesto.every((tax: Impuesto) =>
    tax.tarifa !== undefined
      ? tax.tarifa === 0
      : tax.factorCalculoIVA !== undefined
        ? tax.factorCalculoIVA === 0
        : tax.monto === 0,
  );
  if (allZeroRate) {
    return { gravado: 0, exento: grossAmount, exonerado: 0 };
  }

  // Check for exonerations
  const hasExoneration = item.impuesto.some((t: Impuesto) => t.exoneracion !== undefined);

  if (hasExoneration) {
    // The exonerated base portion is the ratio of exonerated tariff points
    // to the full tariff, applied to gross sales.
    let totalExonerado = 0;
    for (const tax of item.impuesto) {
      if (tax.exoneracion && tax.tarifa !== undefined && tax.tarifa > 0) {
        totalExonerado = round(
          totalExonerado + (grossAmount * tax.exoneracion.tarifaExonerada) / tax.tarifa,
        );
      }
    }
    totalExonerado = round(totalExonerado);

    // If 100% exonerated, all goes to exonerado
    if (totalExonerado >= grossAmount) {
      return { gravado: 0, exento: 0, exonerado: grossAmount };
    }

    // Partial exoneration: the non-exonerated portion is gravado
    return {
      gravado: round(grossAmount - totalExonerado),
      exento: 0,
      exonerado: totalExonerado,
    };
  }

  // Standard taxed item
  return { gravado: grossAmount, exento: 0, exonerado: 0 };
}

/**
 * Calculate the complete invoice summary (ResumenFactura) from calculated line items.
 *
 * Separates totals by service vs merchandise, and by gravado/exento/exonerado.
 * Computes total discounts, net sales, total tax, and grand total.
 *
 * @param items - Array of calculated line items (from `calculateLineItemTotals`).
 * @param otrosCargos - Optional total of other charges to add to the grand total.
 * @returns The complete invoice summary.
 */
export function calculateInvoiceSummary(
  items: CalculatedLineItem[],
  otrosCargos?: number,
): InvoiceSummary {
  return invoiceSummaryWith(round5, items, otrosCargos);
}

function invoiceSummaryWith(
  round: Rounder,
  items: CalculatedLineItem[],
  otrosCargos?: number,
): InvoiceSummary {
  let totalServGravados = 0;
  let totalServExentos = 0;
  let totalServExonerado = 0;
  let totalMercanciasGravadas = 0;
  let totalMercanciasExentas = 0;
  let totalMercExonerada = 0;
  let totalDescuentos = 0;
  let totalImpuesto = 0;

  for (const item of items) {
    const classification = classifyLineItem(item, round);

    if (item.esServicio) {
      totalServGravados = round(totalServGravados + classification.gravado);
      totalServExentos = round(totalServExentos + classification.exento);
      totalServExonerado = round(totalServExonerado + classification.exonerado);
    } else {
      totalMercanciasGravadas = round(totalMercanciasGravadas + classification.gravado);
      totalMercanciasExentas = round(totalMercanciasExentas + classification.exento);
      totalMercExonerada = round(totalMercExonerada + classification.exonerado);
    }

    // Sum discounts
    if (item.descuento) {
      for (const d of item.descuento) {
        totalDescuentos = round(totalDescuentos + d.montoDescuento);
      }
    }

    // Sum taxes (impuestoNeto is the net IVA after exoneration)
    if (item.impuestoNeto !== undefined) {
      totalImpuesto = round(totalImpuesto + item.impuestoNeto);
    }
  }

  // Per-(codigo, codigoTarifaIVA) net tax breakdown (v4.4 TotalDesgloseImpuesto)
  const desglose = new Map<string, TotalDesgloseImpuesto>();
  for (const item of items) {
    for (const tax of item.impuesto) {
      const netAmount = round(Math.max(0, tax.monto - (tax.exoneracion?.montoExoneracion ?? 0)));
      const key = `${tax.codigo}|${tax.codigoTarifaIVA ?? ""}`;
      const existing = desglose.get(key);
      if (existing) {
        existing.totalMontoImpuesto = round(existing.totalMontoImpuesto + netAmount);
      } else {
        desglose.set(key, {
          codigo: tax.codigo,
          ...(tax.codigoTarifaIVA ? { codigoTarifaIVA: tax.codigoTarifaIVA } : {}),
          totalMontoImpuesto: netAmount,
        });
      }
    }
  }

  const totalGravado = round(totalServGravados + totalMercanciasGravadas);
  const totalExento = round(totalServExentos + totalMercanciasExentas);
  const totalExonerado = round(totalServExonerado + totalMercExonerada);
  const totalVenta = round(totalGravado + totalExento + totalExonerado);
  const totalVentaNeta = round(totalVenta - totalDescuentos);
  const totalOtrosCargos = otrosCargos ? round(otrosCargos) : 0;
  const totalComprobante = round(totalVentaNeta + totalImpuesto + totalOtrosCargos);

  return {
    totalServGravados,
    totalServExentos,
    totalServExonerado,
    totalMercanciasGravadas,
    totalMercanciasExentas,
    totalMercExonerada,
    totalGravado,
    totalExento,
    totalExonerado,
    totalVenta,
    totalDescuentos,
    totalVentaNeta,
    totalDesgloseImpuesto: [...desglose.values()],
    totalImpuesto,
    totalComprobante,
  };
}

// ---------------------------------------------------------------------------
// Rounding-mode-aware legacy calculator
// ---------------------------------------------------------------------------

/**
 * The legacy Number calculators bound to one {@link LegacyRoundingMode}.
 *
 * Every member has the same signature as the standalone export of the same
 * name, so it can replace it directly, including point-free use such as
 * `items.map(calculator.calculateLineItemTotals)`.
 */
export interface LegacyCalculator {
  /** The rounding mode every member applies. */
  readonly roundingMode: LegacyRoundingMode;
  /** {@link round5} or {@link round5HalfUp}, according to `roundingMode`. */
  readonly round5: (value: number) => number;
  /** {@link calculateTaxAmount} with this calculator's rounding mode. */
  readonly calculateTaxAmount: (tax: TaxAmountInput, base: number, cantidad: number) => number;
  /** {@link calculateLineItemTotals} with this calculator's rounding mode. */
  readonly calculateLineItemTotals: (item: LineItemInput) => CalculatedLineItem;
  /** {@link calculateInvoiceSummary} with this calculator's rounding mode. */
  readonly calculateInvoiceSummary: (
    items: CalculatedLineItem[],
    otrosCargos?: number,
  ) => InvoiceSummary;
}

/**
 * Create the legacy Number calculators bound to a rounding mode.
 *
 * The default mode, `"legacy-tofixed"`, returns results byte-identical to
 * the standalone `round5`, `calculateTaxAmount`, `calculateLineItemTotals`
 * and `calculateInvoiceSummary`. `"half-up"` rounds every intermediate and
 * final amount with {@link round5HalfUp} (Anexo v4.4, p. 13-14) and changes
 * the result of exact sixth-decimal halves, for example `0.999 × 1802.455`
 * (`1800.65254` → `1800.65255`) or 13% IVA on `80074.1975`
 * (`10409.64567` → `10409.64568`).
 *
 * Use one calculator for both the lines and the summary of a document so
 * the modes are never mixed. For new integrations prefer the exact
 * `calculateDecimal*` path, which already rounds HALF_UP on decimal text.
 *
 * @param options - Optional `{ roundingMode }`.
 * @throws TypeError when `options` is not an object or `roundingMode` is unknown.
 */
export function createLegacyCalculator(options?: LegacyCalculationOptions): LegacyCalculator {
  const { mode, round } = resolveRounder(options);
  return Object.freeze({
    roundingMode: mode,
    round5: round,
    calculateTaxAmount: (tax: TaxAmountInput, base: number, cantidad: number) =>
      taxAmountWith(round, tax, base, cantidad),
    calculateLineItemTotals: (item: LineItemInput) => lineItemTotalsWith(round, item),
    calculateInvoiceSummary: (items: CalculatedLineItem[], otrosCargos?: number) =>
      invoiceSummaryWith(round, items, otrosCargos),
  });
}
