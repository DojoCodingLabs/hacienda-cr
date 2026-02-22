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
} from "@dojocoding/hacienda-shared";
import { TaxCode } from "@dojocoding/hacienda-shared";

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
 * Uses `Number.toFixed(5)` which implements "round half to even"
 * (banker's rounding) per the ECMAScript spec. This avoids
 * floating-point multiplication artifacts that can occur with
 * the `Math.round(value * factor) / factor` approach (e.g.,
 * 1.0000025 * 100000 = 100000.24999999999 in IEEE 754).
 *
 * @param value - The numeric value to round.
 * @returns The value rounded to 5 decimal places.
 */
export function round5(value: number): number {
  return Number(value.toFixed(DECIMAL_PLACES));
}

// ---------------------------------------------------------------------------
// Line Item Input (simplified — for calculation, before computed fields)
// ---------------------------------------------------------------------------

/** Tax input for a line item before calculation. */
export interface LineItemTaxInput {
  /** Tax type code (e.g., "01" for IVA). */
  codigo: string;

  /** IVA rate code. Required for IVA taxes. */
  codigoTarifa?: string;

  /** Tax rate percentage (e.g., 13 for 13%). */
  tarifa: number;

  /** Exoneration information. Optional. */
  exoneracion?: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombreInstitucion: string;
    fechaEmision: string;
    porcentajeExoneracion: number;
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

  /** Base taxable amount. Optional. */
  baseImponible?: number;

  /** Taxes applied to this line item. */
  impuesto?: Impuesto[];

  /** Net IVA tax amount. Optional. */
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
 * - `baseImponible` = subTotal (or adjusted for exonerations)
 * - `impuesto[].monto` = subTotal * tarifa / 100
 * - `impuestoNeto` = sum of all IVA tax amounts (after exonerations)
 * - `montoTotalLinea` = subTotal + impuestoNeto
 *
 * @param item - The line item input with core values.
 * @returns A fully calculated line item ready for XML generation.
 */
export function calculateLineItemTotals(item: LineItemInput): CalculatedLineItem {
  // MontoTotal = cantidad * precioUnitario
  const montoTotal = round5(item.cantidad * item.precioUnitario);

  // Sum of discounts
  const totalDescuento = item.descuento
    ? round5(item.descuento.reduce((sum: number, d: Descuento) => sum + d.montoDescuento, 0))
    : 0;

  // SubTotal = montoTotal - discounts
  const subTotal = round5(montoTotal - totalDescuento);

  // BaseImponible = subTotal (taxable base)
  const baseImponible = subTotal;

  // Calculate taxes
  const calculatedTaxes: Impuesto[] = [];
  let impuestoNeto = 0;

  if (item.impuesto && item.impuesto.length > 0) {
    for (const tax of item.impuesto) {
      // Full tax amount = subTotal * tarifa / 100
      const fullTaxAmount = round5((subTotal * tax.tarifa) / 100);

      let taxAmount = fullTaxAmount;
      let exoneracion: Exoneracion | undefined;

      // Handle exoneration
      if (tax.exoneracion) {
        const exonerationPortion = round5(
          (fullTaxAmount * tax.exoneracion.porcentajeExoneracion) / 100,
        );
        taxAmount = round5(fullTaxAmount - exonerationPortion);

        exoneracion = {
          tipoDocumento: tax.exoneracion.tipoDocumento as Exoneracion["tipoDocumento"],
          numeroDocumento: tax.exoneracion.numeroDocumento,
          nombreInstitucion: tax.exoneracion.nombreInstitucion,
          fechaEmision: tax.exoneracion.fechaEmision,
          porcentajeExoneracion: tax.exoneracion.porcentajeExoneracion,
          montoExoneracion: exonerationPortion,
        };
      }

      const calculatedTax: Impuesto = {
        codigo: tax.codigo as Impuesto["codigo"],
        tarifa: tax.tarifa,
        monto: fullTaxAmount,
        ...(tax.codigoTarifa ? { codigoTarifa: tax.codigoTarifa as Impuesto["codigoTarifa"] } : {}),
        ...(exoneracion ? { exoneracion } : {}),
      };

      calculatedTaxes.push(calculatedTax);

      // ImpuestoNeto counts only the net IVA amount (after exoneration)
      if (IVA_TAX_CODES.includes(tax.codigo)) {
        impuestoNeto = round5(impuestoNeto + taxAmount);
      }
    }
  }

  impuestoNeto = round5(impuestoNeto);

  // MontoTotalLinea = subTotal + impuestoNeto
  const montoTotalLinea = round5(subTotal + impuestoNeto);

  const result: CalculatedLineItem = {
    numeroLinea: item.numeroLinea,
    codigoCabys: item.codigoCabys,
    cantidad: item.cantidad,
    unidadMedida: item.unidadMedida,
    detalle: item.detalle,
    precioUnitario: item.precioUnitario,
    montoTotal,
    subTotal,
    montoTotalLinea,
    esServicio: item.esServicio ?? false,
  };

  if (item.codigoComercial && item.codigoComercial.length > 0) {
    result.codigoComercial = item.codigoComercial;
  }

  if (item.descuento && item.descuento.length > 0) {
    result.descuento = item.descuento;
  }

  if (calculatedTaxes.length > 0) {
    result.impuesto = calculatedTaxes;
    result.baseImponible = baseImponible;
    result.impuestoNeto = impuestoNeto;
  }

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
  /** Total IVA tax. */
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
function classifyLineItem(item: CalculatedLineItem): {
  gravado: number;
  exento: number;
  exonerado: number;
} {
  const subTotal = item.subTotal;

  if (!item.impuesto || item.impuesto.length === 0) {
    // No taxes at all => exempt
    return { gravado: 0, exento: subTotal, exonerado: 0 };
  }

  // Check if all taxes have rate 0 => exempt
  const allZeroRate = item.impuesto.every((t: Impuesto) => t.tarifa === 0);
  if (allZeroRate) {
    return { gravado: 0, exento: subTotal, exonerado: 0 };
  }

  // Check for exonerations
  const hasExoneration = item.impuesto.some((t: Impuesto) => t.exoneracion !== undefined);

  if (hasExoneration) {
    // Calculate the exonerated portion based on exoneration percentages
    let totalExonerado = 0;
    for (const tax of item.impuesto) {
      if (tax.exoneracion) {
        totalExonerado = round5(
          totalExonerado + (subTotal * tax.exoneracion.porcentajeExoneracion) / 100,
        );
      }
    }
    totalExonerado = round5(totalExonerado);

    // If 100% exonerated, all goes to exonerado
    if (totalExonerado >= subTotal) {
      return { gravado: 0, exento: 0, exonerado: subTotal };
    }

    // Partial exoneration: the non-exonerated portion is gravado
    return {
      gravado: round5(subTotal - totalExonerado),
      exento: 0,
      exonerado: totalExonerado,
    };
  }

  // Standard taxed item
  return { gravado: subTotal, exento: 0, exonerado: 0 };
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
  let totalServGravados = 0;
  let totalServExentos = 0;
  let totalServExonerado = 0;
  let totalMercanciasGravadas = 0;
  let totalMercanciasExentas = 0;
  let totalMercExonerada = 0;
  let totalDescuentos = 0;
  let totalImpuesto = 0;

  for (const item of items) {
    const classification = classifyLineItem(item);

    if (item.esServicio) {
      totalServGravados = round5(totalServGravados + classification.gravado);
      totalServExentos = round5(totalServExentos + classification.exento);
      totalServExonerado = round5(totalServExonerado + classification.exonerado);
    } else {
      totalMercanciasGravadas = round5(totalMercanciasGravadas + classification.gravado);
      totalMercanciasExentas = round5(totalMercanciasExentas + classification.exento);
      totalMercExonerada = round5(totalMercExonerada + classification.exonerado);
    }

    // Sum discounts
    if (item.descuento) {
      for (const d of item.descuento) {
        totalDescuentos = round5(totalDescuentos + d.montoDescuento);
      }
    }

    // Sum taxes (impuestoNeto is the net IVA after exoneration)
    if (item.impuestoNeto !== undefined) {
      totalImpuesto = round5(totalImpuesto + item.impuestoNeto);
    }
  }

  const totalGravado = round5(totalServGravados + totalMercanciasGravadas);
  const totalExento = round5(totalServExentos + totalMercanciasExentas);
  const totalExonerado = round5(totalServExonerado + totalMercExonerada);
  const totalVenta = round5(totalGravado + totalExento + totalExonerado);
  const totalVentaNeta = round5(totalVenta - totalDescuentos);
  const totalOtrosCargos = otrosCargos ? round5(otrosCargos) : 0;
  const totalComprobante = round5(totalVentaNeta + totalImpuesto + totalOtrosCargos);

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
    totalImpuesto,
    totalComprobante,
  };
}
