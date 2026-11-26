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
import {
  CODIGO_REFERENCIA_PAGO_COMPROBANTE,
  DocumentTypeCode,
  FacturaElectronicaSchema,
  IvaRateCode,
  IVA_RATE_PERCENTAGES,
  SaleCondition,
  TaxCode,
} from "@dojocoding/hacienda-shared";
import { calculateTaxAmount, round5 } from "../tax/calculator.js";
import { validateDocumentIdentity } from "./document-identity.js";

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
 * Implementation tolerance for comparing legacy `number` amounts.
 *
 * This is NOT a fiscal rule. Hacienda's Anexos y Estructuras v4.4 specify
 * 5-decimal amounts rounded on the sixth decimal (p. 14) and publish no
 * numeric comparison tolerance. The only related text is the v4.2 change-log
 * note that "márgenes de error en los decimales" were introduced for
 * two-decimal systems (p. 12), and it gives no value. The vendored XSDs carry
 * no tolerance either.
 *
 * The legacy validator works on IEEE-754 doubles, which cannot hold every
 * 5-decimal value exactly (from about 7e10 upward one ULP exceeds 0.00001), so
 * it needs some epsilon to absorb binary rounding noise in sums of up to 1000
 * lines. The value 0.001 is kept unchanged from earlier releases because no
 * smaller bound is provably safe across the full 18,5 range on `number`.
 * Consequence: this path can accept amounts that differ from the recomputed
 * value by less than 0.001. Use the exact `Decimal*` / `Exact*` calculators,
 * which compare scaled integers exactly at 5 decimals, when that matters.
 */
export const LEGACY_NUMBER_TOTALS_TOLERANCE = 0.001;

/**
 * Compare two legacy `number` amounts within {@link LEGACY_NUMBER_TOTALS_TOLERANCE}.
 * The tolerance absorbs binary floating-point noise only; see its documentation.
 */
function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < LEGACY_NUMBER_TOTALS_TOLERANCE;
}

/** Transitional IVA rate codes (Ley 9635), invalid for a new document. */
const TRANSITIONAL_IVA_RATE_CODES: readonly IvaRateCode[] = [
  IvaRateCode.TRANSITORIO_0,
  IvaRateCode.TRANSITORIO_4,
  IvaRateCode.TRANSITORIO_8,
];

/**
 * IVA tax codes taxed on baseImponible (nota 8: 01 and 07). Used only to
 * choose the base for the tax-amount check. It is not the set that requires
 * CodigoTarifaIVA. IVA 08 is checked against factor × subtotal instead
 * (Anexos v4.4, p. 37 Codigo and p. 42 Monto).
 */
const IVA_TAX_CODES: string[] = [TaxCode.IVA, TaxCode.IVA_CALCULO_ESPECIAL];

/**
 * Tax codes that require CodigoTarifaIVA. Anexos y Estructuras v4.4, p. 38
 * (ImpuestoType, CodigoTarifaIVA): "Se convierte en obligatorio para los
 * Códigos 01, 07. de la nota 8." The XSDs declare the element minOccurs="0".
 * Code 08 (IVA Régimen de Bienes Usados, factor) requires FactorCalculoIVA
 * instead (p. 39), which is checked separately below.
 */
const IVA_RATE_CODE_REQUIRED_TAX_CODES: string[] = [TaxCode.IVA, TaxCode.IVA_CALCULO_ESPECIAL];

// ---------------------------------------------------------------------------
// Business Rule Validation
// ---------------------------------------------------------------------------

/**
 * Validate business rules on a parsed FacturaElectronicaInput.
 *
 * @returns Array of validation errors. Empty if all rules pass.
 */
function validateBusinessRules(input: FacturaElectronicaInput): FacturaValidationError[] {
  const errors: FacturaValidationError[] = validateDocumentIdentity(
    input,
    DocumentTypeCode.FACTURA_ELECTRONICA,
  );
  if (!input.receptor.identificacion)
    errors.push({
      path: "receptor.identificacion",
      message: "Factura Receptor requires identificacion when the Receptor node is present",
    });
  for (const [index, reference] of (input.informacionReferencia ?? []).entries()) {
    const refPrefix = `informacionReferencia.${index}`;
    const tipoDoc = reference.tipoDoc as string | undefined;
    const codigo = reference.codigo as string | undefined;
    const tipoDocOtros = reference.tipoDocOtros as string | undefined;
    const codigoOtros = reference.codigoOtros as string | undefined;

    if (tipoDoc === "99" && tipoDocOtros === undefined)
      errors.push({
        path: `${refPrefix}.tipoDocOtros`,
        message: "tipoDocOtros is required when tipoDoc is 99",
      });
    if (tipoDocOtros !== undefined && tipoDoc !== "99")
      errors.push({
        path: `${refPrefix}.tipoDocOtros`,
        message: "tipoDocOtros is only allowed when tipoDoc is 99",
      });
    if (codigo === "99" && codigoOtros === undefined)
      errors.push({
        path: `${refPrefix}.codigoOtros`,
        message: "codigoOtros is required when codigo is 99",
      });
    if (codigoOtros !== undefined && codigo !== "99")
      errors.push({
        path: `${refPrefix}.codigoOtros`,
        message: "codigoOtros is only allowed when codigo is 99",
      });

    if (codigo === CODIGO_REFERENCIA_PAGO_COMPROBANTE)
      errors.push({
        path: `${refPrefix}.codigo`,
        message: "Reference reason 17 is valid only for ReciboElectronicoPago",
      });
  }

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

    // Standard IVA bases include ISC and alcoholic/non-alcoholic beverage taxes.
    // Code 07 explicitly allows a separately supplied special base.
    const includesSpecificBase = line.impuesto?.some((tax) =>
      ["02", "04", "05"].includes(tax.codigo),
    );
    if (includesSpecificBase && !line.impuesto?.some((tax) => tax.codigo === "07")) {
      const expectedBase = round5(
        line.subTotal +
          (line.impuesto ?? []).reduce(
            (sum, tax) => sum + (["02", "04", "05"].includes(tax.codigo) ? tax.monto : 0),
            0,
          ),
      );
      if (line.baseImponible === undefined || !amountsEqual(line.baseImponible, expectedBase))
        errors.push({
          path: `${prefix}.baseImponible`,
          message: `Base imponible must include applicable specific taxes (${expectedBase})`,
        });
    }

    // Tax amount validation
    if (line.impuesto && line.impuesto.length > 0) {
      let lineImpuestoNeto = 0;
      let taxIndex = 0;

      for (const tax of line.impuesto) {
        // Keep existing non-rate regime validation unchanged outside codes 02–06.
        // IVA 08 is always checked against factor × subtotal when its factor is
        // present; a missing factor is reported below.
        const usedGoods = tax.codigo === TaxCode.IVA_BIENES_USADOS;
        if (
          usedGoods
            ? tax.factorCalculoIVA !== undefined
            : tax.tarifa !== undefined || ["02", "03", "04", "05", "06"].includes(tax.codigo)
        ) {
          try {
            // Compare against the recomputed amount, not against tax.monto itself.
            const { monto: _supplied, ...facts } = tax;
            const expected = calculateTaxAmount(
              usedGoods ? facts : tax,
              IVA_TAX_CODES.includes(tax.codigo)
                ? (line.baseImponible ?? line.subTotal)
                : line.subTotal,
              line.cantidad,
            );
            if (!amountsEqual(tax.monto, expected))
              errors.push({
                path: `${prefix}.impuesto.${taxIndex}.monto`,
                message: `Tax amount must match its applicable calculation (${expected})`,
              });
          } catch (error) {
            errors.push({
              path: `${prefix}.impuesto.${taxIndex}.monto`,
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Codes 01 and 07 must have codigoTarifaIVA (Anexos v4.4, p. 38); 08 need not.
        if (IVA_RATE_CODE_REQUIRED_TAX_CODES.includes(tax.codigo) && !tax.codigoTarifaIVA) {
          errors.push({
            path: `${prefix}.impuesto.${taxIndex}.codigoTarifaIVA`,
            message: `IVA tax (code ${tax.codigo}) must specify a codigoTarifaIVA (rate code)`,
          });
        }

        // Calculate net IVA for this tax (tarifa↔rate correspondence applies to codigo 01 only;
        // codigo 07 exige presencia de codigoTarifaIVA, pero su tarifa es editable)
        if (tax.codigo === TaxCode.IVA && tax.codigoTarifaIVA) {
          const expectedRate = IVA_RATE_PERCENTAGES[tax.codigoTarifaIVA];
          if (expectedRate !== tax.tarifa)
            errors.push({
              path: `${prefix}.impuesto.${taxIndex}.tarifa`,
              message: `IVA tarifa must match codigoTarifaIVA ${tax.codigoTarifaIVA} (${expectedRate}%)`,
            });
          if (TRANSITIONAL_IVA_RATE_CODES.includes(tax.codigoTarifaIVA))
            errors.push({
              path: `${prefix}.impuesto.${taxIndex}.codigoTarifaIVA`,
              message:
                "Transitional IVA rate codes 05, 06 and 07 are not valid for a new FacturaElectronica",
            });
        }

        // IVA bienes usados requires FactorCalculoIVA (Anexos v4.4, p. 39: "En caso de
        // utilizar el código 08 de la nota 08, se verificará que este campo se encuentre")
        if (tax.codigo === TaxCode.IVA_BIENES_USADOS && tax.factorCalculoIVA === undefined)
          errors.push({
            path: `${prefix}.impuesto.${taxIndex}.factorCalculoIVA`,
            message: "IVA bienes usados (codigo 08) requires factorCalculoIVA",
          });
        // Fail closed: the Anexo defines MontoExoneracion as TarifaExonerada ×
        // subtotal (p. 46) and gives no rule for the factor-based 08, so the
        // amount cannot be verified (open question in docs/roadmap.md).
        if (tax.codigo === TaxCode.IVA_BIENES_USADOS && tax.exoneracion)
          errors.push({
            path: `${prefix}.impuesto.${taxIndex}.exoneracion`,
            message:
              "Exoneración on IVA bienes usados (codigo 08) is not supported: Anexos v4.4 does not define its amount",
          });
        {
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
            message: `impuestoNeto (${line.impuestoNeto}) must equal sum of net taxes (${lineImpuestoNeto})`,
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

  // Reconcile the summary against detail lines, not just against itself.
  const detailTotals = {
    totalVenta: round5(input.detalleServicio.reduce((sum, line) => sum + line.montoTotal, 0)),
    totalDescuentos: round5(
      input.detalleServicio.reduce(
        (sum, line) =>
          sum + (line.descuento ?? []).reduce((n, discount) => n + discount.montoDescuento, 0),
        0,
      ),
    ),
    totalVentaNeta: round5(input.detalleServicio.reduce((sum, line) => sum + line.subTotal, 0)),
    totalOtrosCargos: round5(
      (input.otrosCargos ?? []).reduce((sum, charge) => sum + charge.montoCargo, 0),
    ),
  };
  for (const [field, expected] of Object.entries(detailTotals)) {
    const actual = input.resumenFactura[field as keyof typeof detailTotals] ?? 0;
    if (!amountsEqual(actual, expected)) {
      errors.push({
        path: `resumenFactura.${field}`,
        message: `${field} (${actual}) must match detail amounts (${expected})`,
      });
    }
  }

  // Rule: Summary total consistency (v4.4: most totals are optional)
  const r = input.resumenFactura;

  // totalGravado = totalServGravados + totalMercanciasGravadas
  if (r.totalGravado !== undefined) {
    const expectedTotalGravado = round5(
      (r.totalServGravados ?? 0) + (r.totalMercanciasGravadas ?? 0),
    );
    if (!amountsEqual(r.totalGravado, expectedTotalGravado)) {
      errors.push({
        path: "resumenFactura.totalGravado",
        message: `totalGravado (${r.totalGravado}) must equal totalServGravados + totalMercanciasGravadas (${expectedTotalGravado})`,
      });
    }
  }

  // totalExento = totalServExentos + totalMercanciasExentas
  if (r.totalExento !== undefined) {
    const expectedTotalExento = round5((r.totalServExentos ?? 0) + (r.totalMercanciasExentas ?? 0));
    if (!amountsEqual(r.totalExento, expectedTotalExento)) {
      errors.push({
        path: "resumenFactura.totalExento",
        message: `totalExento (${r.totalExento}) must equal totalServExentos + totalMercanciasExentas (${expectedTotalExento})`,
      });
    }
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

  // totalVenta = totalGravado + totalExento + totalExonerado + totalNoSujeto
  const totalExonerado = r.totalExonerado ?? 0;
  const expectedTotalVenta = round5(
    (r.totalGravado ?? 0) + (r.totalExento ?? 0) + totalExonerado + (r.totalNoSujeto ?? 0),
  );
  if (!amountsEqual(r.totalVenta, expectedTotalVenta)) {
    errors.push({
      path: "resumenFactura.totalVenta",
      message: `totalVenta (${r.totalVenta}) must equal totalGravado + totalExento + totalExonerado + totalNoSujeto (${expectedTotalVenta})`,
    });
  }

  // totalVentaNeta = totalVenta - totalDescuentos
  const expectedTotalVentaNeta = round5(r.totalVenta - (r.totalDescuentos ?? 0));
  if (!amountsEqual(r.totalVentaNeta, expectedTotalVentaNeta)) {
    errors.push({
      path: "resumenFactura.totalVentaNeta",
      message: `totalVentaNeta (${r.totalVentaNeta}) must equal totalVenta - totalDescuentos (${expectedTotalVentaNeta})`,
    });
  }

  // totalImpuesto must match the sum of line item impuestoNeto values, and
  // may only be omitted when the lines carry no tax at all.
  if (r.totalImpuesto !== undefined) {
    if (!amountsEqual(r.totalImpuesto, sumLineImpuestoNeto)) {
      errors.push({
        path: "resumenFactura.totalImpuesto",
        message: `totalImpuesto (${r.totalImpuesto}) must equal sum of line item impuestoNeto (${sumLineImpuestoNeto})`,
      });
    }
  } else if (sumLineImpuestoNeto > 0) {
    errors.push({
      path: "resumenFactura.totalImpuesto",
      message: `totalImpuesto is required when line items carry tax (sum of impuestoNeto is ${sumLineImpuestoNeto})`,
    });
  }

  // totalComprobante = totalVentaNeta + totalImpuesto + totalOtrosCargos - totalIVADevuelto
  const totalOtrosCargos = r.totalOtrosCargos ?? 0;
  const totalIVADevuelto = r.totalIVADevuelto ?? 0;
  const expectedTotalComprobante = round5(
    r.totalVentaNeta + (r.totalImpuesto ?? 0) + totalOtrosCargos - totalIVADevuelto,
  );
  if (!amountsEqual(r.totalComprobante, expectedTotalComprobante)) {
    errors.push({
      path: "resumenFactura.totalComprobante",
      message: `totalComprobante (${r.totalComprobante}) must equal totalVentaNeta + totalImpuesto + totalOtrosCargos - totalIVADevuelto (${expectedTotalComprobante})`,
    });
  }

  // Rule: plazoCredito required when condicionVenta is "02" (credit)
  if (input.condicionVenta === SaleCondition.CREDITO && !input.plazoCredito) {
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
