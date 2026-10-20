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
import { ImpuestoSchema, TaxCode } from "@dojocoding/hacienda-shared";

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
 * This is not an exact decimal or banker's-rounding implementation;
 * fiscal edge cases require separate decimal-oracle validation.
 *
 * @param value - The numeric value to round.
 * @returns The value rounded to 5 decimal places.
 */
export function round5(value: number): number {
  return Number(value.toFixed(DECIMAL_PLACES));
}

/** Compute a tax amount without prematurely rounding the specific-tax factors. */
export function calculateTaxAmount(
  tax: Pick<LineItemTaxInput, "codigo" | "tarifa" | "monto" | "datosImpuestoEspecifico">,
  base: number,
  cantidad: number,
): number {
  const data = tax.datosImpuestoEspecifico;
  if (["03", "04", "05", "06"].includes(tax.codigo)) {
    if (!data) throw new Error(`Specific tax ${tax.codigo} requires datosImpuestoEspecifico`);
    if (tax.codigo === "04") {
      if (data.proporcion === undefined || data.porcentaje === undefined)
        throw new Error("Alcohol tax requires porcentaje and proporcion");
      const expectedProportion = round5((data.cantidadUnidadMedida * data.porcentaje) / 100);
      if (Math.abs(data.proporcion - expectedProportion) > 0.000001)
        throw new Error("Alcohol proporcion must equal cantidadUnidadMedida * porcentaje / 100");
      return round5(cantidad * data.proporcion * data.impuestoUnidad);
    }
    // Code 05 has different formulas for beverages and toilet soap. Its amount
    // must be supplied by the caller rather than guessing the product category.
    if (tax.codigo === "05") {
      if (tax.monto === undefined || !Number.isFinite(tax.monto) || tax.monto < 0)
        throw new Error("Tax 05 requires an explicit monto calculated for the product category");
      return round5(tax.monto);
    }
    return round5(
      (tax.codigo === "06" ? cantidad : 1) * data.cantidadUnidadMedida * data.impuestoUnidad,
    );
  }
  if (tax.codigo === "02" && tax.tarifa === undefined && tax.monto !== undefined) {
    if (!Number.isFinite(tax.monto) || tax.monto < 0)
      throw new Error("ISC amount must be finite and non-negative");
    return round5(tax.monto);
  }
  if (tax.tarifa === undefined) throw new Error(`Tax ${tax.codigo} requires tarifa`);
  const amount = round5((base * tax.tarifa) / 100);
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
  // MontoTotal = cantidad * precioUnitario
  const montoTotal = round5(item.cantidad * item.precioUnitario);

  // Sum of discounts
  const totalDescuento = item.descuento
    ? round5(item.descuento.reduce((sum: number, d: Descuento) => sum + d.montoDescuento, 0))
    : 0;

  // SubTotal = montoTotal - discounts
  const subTotal = round5(montoTotal - totalDescuento);

  // ISC and beverage taxes are included in the IVA base.
  const baseImponible = round5(
    subTotal +
      (item.impuesto ?? []).reduce(
        (sum, tax) =>
          sum +
          (["02", "04", "05"].includes(tax.codigo)
            ? calculateTaxAmount(tax, subTotal, item.cantidad)
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
      : [{ codigo: TaxCode.IVA, codigoTarifaIVA: "01", tarifa: 0 }];

  for (const tax of taxInputs) {
    // Apply the applicable formula before monetary rounding.
    const fullTaxAmount = calculateTaxAmount(
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
      const exonerationPortion = round5(
        ((IVA_TAX_CODES.includes(tax.codigo) ? baseImponible : subTotal) *
          tax.exoneracion.tarifaExonerada) /
          100,
      );
      taxAmount = round5(Math.max(0, fullTaxAmount - exonerationPortion));

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
    impuestoNeto = round5(impuestoNeto + taxAmount);
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
function classifyLineItem(item: CalculatedLineItem): {
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
        totalExonerado = round5(
          totalExonerado + (grossAmount * tax.exoneracion.tarifaExonerada) / tax.tarifa,
        );
      }
    }
    totalExonerado = round5(totalExonerado);

    // If 100% exonerated, all goes to exonerado
    if (totalExonerado >= grossAmount) {
      return { gravado: 0, exento: 0, exonerado: grossAmount };
    }

    // Partial exoneration: the non-exonerated portion is gravado
    return {
      gravado: round5(grossAmount - totalExonerado),
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

  // Per-(codigo, codigoTarifaIVA) net tax breakdown (v4.4 TotalDesgloseImpuesto)
  const desglose = new Map<string, TotalDesgloseImpuesto>();
  for (const item of items) {
    for (const tax of item.impuesto) {
      const netAmount = round5(Math.max(0, tax.monto - (tax.exoneracion?.montoExoneracion ?? 0)));
      const key = `${tax.codigo}|${tax.codigoTarifaIVA ?? ""}`;
      const existing = desglose.get(key);
      if (existing) {
        existing.totalMontoImpuesto = round5(existing.totalMontoImpuesto + netAmount);
      } else {
        desglose.set(key, {
          codigo: tax.codigo,
          ...(tax.codigoTarifaIVA ? { codigoTarifaIVA: tax.codigoTarifaIVA } : {}),
          totalMontoImpuesto: netAmount,
        });
      }
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
    totalDesgloseImpuesto: [...desglose.values()],
    totalImpuesto,
    totalComprobante,
  };
}
