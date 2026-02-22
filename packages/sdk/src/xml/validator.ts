/**
 * Factura Electronica input validation.
 *
 * Validates a FacturaElectronicaInput against the Zod schema
 * and applies additional business rules that go beyond schema validation:
 * - Sequential line numbers
 * - Amount consistency (montoTotal = cantidad * precioUnitario, etc.)
 * - Tax amount accuracy
 * - Summary totals matching line item calculations
 * - At least one line item
 * - Valid tax code / rate combinations
 */

import type { FacturaElectronicaInput } from "@dojocoding/hacienda-shared";
import { FacturaElectronicaSchema, TaxCode } from "@dojocoding/hacienda-shared";
import { round5 } from "../tax/calculator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single validation error with a path and message. */
export interface FacturaValidationError {
  /** Dot-separated path to the field (e.g., "detalleServicio.0.montoTotal"). */
  path: string;

  /** Human-readable error message. */
  message: string;
}

/** Result of validating a Factura Electronica input. */
export interface FacturaValidationResult {
  /** Whether the input is valid. */
  valid: boolean;

  /** List of validation errors (empty if valid). */
  errors: FacturaValidationError[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether two numbers are equal within a small tolerance.
 * Accounts for floating-point precision issues.
 */
function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

/** IVA-related tax codes. */
const IVA_TAX_CODES: string[] = [
  TaxCode.IVA,
  TaxCode.IVA_CALCULO_ESPECIAL,
  TaxCode.IVA_BIENES_USADOS,
];

// ---------------------------------------------------------------------------
// Business Rule Validation
// ---------------------------------------------------------------------------

/**
 * Validate business rules on a parsed FacturaElectronicaInput.
 *
 * @returns Array of validation errors. Empty if all rules pass.
 */
function validateBusinessRules(input: FacturaElectronicaInput): FacturaValidationError[] {
  const errors: FacturaValidationError[] = [];

  // Rule: Sequential line numbers starting from 1
  let lineIndex = 0;
  for (const line of input.detalleServicio) {
    if (line.numeroLinea !== lineIndex + 1) {
      errors.push({
        path: `detalleServicio.${lineIndex}.numeroLinea`,
        message: `Line number must be ${lineIndex + 1} (sequential), got ${line.numeroLinea}`,
      });
    }
    lineIndex++;
  }

  // Rule: Line item amount consistency
  let sumLineImpuestoNeto = 0;

  lineIndex = 0;
  for (const line of input.detalleServicio) {
    const prefix = `detalleServicio.${lineIndex}`;

    // montoTotal = cantidad * precioUnitario
    const expectedMontoTotal = round5(line.cantidad * line.precioUnitario);
    if (!amountsEqual(line.montoTotal, expectedMontoTotal)) {
      errors.push({
        path: `${prefix}.montoTotal`,
        message: `montoTotal (${line.montoTotal}) must equal cantidad * precioUnitario (${expectedMontoTotal})`,
      });
    }

    // subTotal = montoTotal - sum(descuentos)
    const totalDescuento = line.descuento
      ? round5(
          line.descuento.reduce(
            (sum: number, d: { montoDescuento: number }) => sum + d.montoDescuento,
            0,
          ),
        )
      : 0;
    const expectedSubTotal = round5(line.montoTotal - totalDescuento);
    if (!amountsEqual(line.subTotal, expectedSubTotal)) {
      errors.push({
        path: `${prefix}.subTotal`,
        message: `subTotal (${line.subTotal}) must equal montoTotal - discounts (${expectedSubTotal})`,
      });
    }

    // Tax amount validation
    if (line.impuesto && line.impuesto.length > 0) {
      let lineImpuestoNeto = 0;
      let taxIndex = 0;

      for (const tax of line.impuesto) {
        // monto = subTotal * tarifa / 100
        const expectedTaxAmount = round5((line.subTotal * tax.tarifa) / 100);
        if (!amountsEqual(tax.monto, expectedTaxAmount)) {
          errors.push({
            path: `${prefix}.impuesto.${taxIndex}.monto`,
            message: `Tax amount (${tax.monto}) must equal subTotal * tarifa / 100 (${expectedTaxAmount})`,
          });
        }

        // IVA tax codes should have codigoTarifa
        if (IVA_TAX_CODES.includes(tax.codigo) && !tax.codigoTarifa) {
          errors.push({
            path: `${prefix}.impuesto.${taxIndex}.codigoTarifa`,
            message: `IVA tax (code ${tax.codigo}) must specify a codigoTarifa (rate code)`,
          });
        }

        // Calculate net IVA for this tax
        if (IVA_TAX_CODES.includes(tax.codigo)) {
          let netAmount = tax.monto;
          if (tax.exoneracion) {
            netAmount = round5(netAmount - tax.exoneracion.montoExoneracion);
          }
          lineImpuestoNeto = round5(lineImpuestoNeto + netAmount);
        }

        taxIndex++;
      }

      // Validate impuestoNeto
      if (line.impuestoNeto !== undefined) {
        if (!amountsEqual(line.impuestoNeto, lineImpuestoNeto)) {
          errors.push({
            path: `${prefix}.impuestoNeto`,
            message: `impuestoNeto (${line.impuestoNeto}) must equal sum of net IVA taxes (${lineImpuestoNeto})`,
          });
        }
      }

      sumLineImpuestoNeto = round5(sumLineImpuestoNeto + lineImpuestoNeto);
    }

    // montoTotalLinea = subTotal + impuestoNeto
    const impNeto = line.impuestoNeto ?? 0;
    const expectedMontoTotalLinea = round5(line.subTotal + impNeto);
    if (!amountsEqual(line.montoTotalLinea, expectedMontoTotalLinea)) {
      errors.push({
        path: `${prefix}.montoTotalLinea`,
        message: `montoTotalLinea (${line.montoTotalLinea}) must equal subTotal + impuestoNeto (${expectedMontoTotalLinea})`,
      });
    }

    lineIndex++;
  }

  // Rule: Summary total consistency
  const r = input.resumenFactura;

  // totalGravado = totalServGravados + totalMercanciasGravadas
  const expectedTotalGravado = round5(r.totalServGravados + r.totalMercanciasGravadas);
  if (!amountsEqual(r.totalGravado, expectedTotalGravado)) {
    errors.push({
      path: "resumenFactura.totalGravado",
      message: `totalGravado (${r.totalGravado}) must equal totalServGravados + totalMercanciasGravadas (${expectedTotalGravado})`,
    });
  }

  // totalExento = totalServExentos + totalMercanciasExentas
  const expectedTotalExento = round5(r.totalServExentos + r.totalMercanciasExentas);
  if (!amountsEqual(r.totalExento, expectedTotalExento)) {
    errors.push({
      path: "resumenFactura.totalExento",
      message: `totalExento (${r.totalExento}) must equal totalServExentos + totalMercanciasExentas (${expectedTotalExento})`,
    });
  }

  // totalExonerado (if present)
  if (r.totalExonerado !== undefined) {
    const expectedTotalExonerado = round5(
      (r.totalServExonerado ?? 0) + (r.totalMercExonerada ?? 0),
    );
    if (!amountsEqual(r.totalExonerado, expectedTotalExonerado)) {
      errors.push({
        path: "resumenFactura.totalExonerado",
        message: `totalExonerado (${r.totalExonerado}) must equal totalServExonerado + totalMercExonerada (${expectedTotalExonerado})`,
      });
    }
  }

  // totalVenta = totalGravado + totalExento + totalExonerado
  const totalExonerado = r.totalExonerado ?? 0;
  const expectedTotalVenta = round5(r.totalGravado + r.totalExento + totalExonerado);
  if (!amountsEqual(r.totalVenta, expectedTotalVenta)) {
    errors.push({
      path: "resumenFactura.totalVenta",
      message: `totalVenta (${r.totalVenta}) must equal totalGravado + totalExento + totalExonerado (${expectedTotalVenta})`,
    });
  }

  // totalVentaNeta = totalVenta - totalDescuentos
  const expectedTotalVentaNeta = round5(r.totalVenta - r.totalDescuentos);
  if (!amountsEqual(r.totalVentaNeta, expectedTotalVentaNeta)) {
    errors.push({
      path: "resumenFactura.totalVentaNeta",
      message: `totalVentaNeta (${r.totalVentaNeta}) must equal totalVenta - totalDescuentos (${expectedTotalVentaNeta})`,
    });
  }

  // totalImpuesto should match sum of line item impuestoNeto values
  if (!amountsEqual(r.totalImpuesto, sumLineImpuestoNeto)) {
    errors.push({
      path: "resumenFactura.totalImpuesto",
      message: `totalImpuesto (${r.totalImpuesto}) must equal sum of line item impuestoNeto (${sumLineImpuestoNeto})`,
    });
  }

  // totalComprobante = totalVentaNeta + totalImpuesto + totalOtrosCargos - totalIVADevuelto
  const totalOtrosCargos = r.totalOtrosCargos ?? 0;
  const totalIVADevuelto = r.totalIVADevuelto ?? 0;
  const expectedTotalComprobante = round5(
    r.totalVentaNeta + r.totalImpuesto + totalOtrosCargos - totalIVADevuelto,
  );
  if (!amountsEqual(r.totalComprobante, expectedTotalComprobante)) {
    errors.push({
      path: "resumenFactura.totalComprobante",
      message: `totalComprobante (${r.totalComprobante}) must equal totalVentaNeta + totalImpuesto + totalOtrosCargos - totalIVADevuelto (${expectedTotalComprobante})`,
    });
  }

  // Rule: plazoCredito required when condicionVenta is "02" (credit)
  if (input.condicionVenta === "02" && !input.plazoCredito) {
    errors.push({
      path: "plazoCredito",
      message: 'plazoCredito is required when condicionVenta is "02" (credit)',
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a Factura Electronica input.
 *
 * Performs two levels of validation:
 * 1. **Schema validation** — using the Zod FacturaElectronicaSchema
 * 2. **Business rule validation** — amount consistency, sequential line
 *    numbers, tax calculations, summary totals matching
 *
 * @param input - The factura input to validate (can be any unknown value).
 * @returns A result object indicating whether the input is valid,
 *   with detailed errors if not.
 *
 * @example
 * ```ts
 * const result = validateFacturaInput(myInvoiceData);
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export function validateFacturaInput(input: unknown): FacturaValidationResult {
  const errors: FacturaValidationError[] = [];

  // Step 1: Zod schema validation
  const parseResult = FacturaElectronicaSchema.safeParse(input);

  if (!parseResult.success) {
    // Convert Zod errors to our format
    for (const issue of parseResult.error.issues) {
      errors.push({
        path: issue.path.map(String).join("."),
        message: issue.message,
      });
    }

    return { valid: false, errors };
  }

  // Step 2: Business rule validation (only if schema passes)
  const businessErrors = validateBusinessRules(parseResult.data);
  errors.push(...businessErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}
