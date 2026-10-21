/**
 * Decimal-text draft document contract and exact consistency checks.
 *
 * `hacienda draft` emits money and quantities as bounded decimal text. The
 * legacy `FacturaElectronicaSchema` keeps its Number contract, so drafts use
 * this additive schema instead. It preserves the input text through JSON and
 * lets the CLI build XML without converting an amount to Number.
 */

import { z } from "zod";
import {
  FacturaElectronicaSchema,
  ImpuestoSchema,
  IVA_RATE_PERCENTAGES,
  LineaDetalleSchema,
  MAX_MONEY_SCALED,
  MONEY_SCALE,
  MedioPagoSchema,
  MONETARY_TEXT_PATTERN,
  ResumenFacturaSchema,
  formatScaledDecimal,
  parseMonetaryText,
  scaledFromPlainDecimal,
  type FacturaElectronica,
} from "@dojocoding/hacienda-shared";
import {
  multiplyExactDecimal,
  percentExactDecimal,
  sumExactDecimal,
  type FacturaValidationError,
} from "@dojocoding/hacienda-sdk";
import { DRAFT_QUANTITY_SCALE, formatDraftMoney, normalizeDraftQuantity } from "./draft-money.js";

/** Bounded monetary text accepted in a draft. */
export const DraftMoneyTextSchema = z
  .string()
  .regex(
    MONETARY_TEXT_PATTERN,
    "Amount must be unsigned plain decimal text with at most 5 decimals",
  );

/** Positive quantity text accepted in a draft. */
export const DraftQuantityTextSchema = z.string().transform((value, ctx) => {
  try {
    return normalizeDraftQuantity(value).text;
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid quantity",
    });
    return z.NEVER;
  }
});

/**
 * Tax entry with a decimal-text amount.
 *
 * `ImpuestoSchema` carries a `superRefine`, so Zod 4 refuses `.omit()` on it.
 * Rebuild the object from its shape and keep the same specific-tax checks.
 */
export const DraftImpuestoSchema = z
  .object({
    ...ImpuestoSchema.shape,
    monto: DraftMoneyTextSchema,
  })
  .superRefine((tax, ctx) => {
    const issue = (path: string[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const specific = ["03", "04", "05", "06"].includes(tax.codigo);
    if (specific && !tax.datosImpuestoEspecifico)
      issue(["datosImpuestoEspecifico"], "Specific tax calculation data is required");
    if (!specific && tax.datosImpuestoEspecifico)
      issue(["datosImpuestoEspecifico"], "Specific data is only allowed for codes 03–06");
    if (tax.codigo === "04" && tax.datosImpuestoEspecifico) {
      for (const field of ["porcentaje", "proporcion"] as const)
        if (tax.datosImpuestoEspecifico[field] === undefined)
          issue(["datosImpuestoEspecifico", field], "Required for alcoholic beverages");
    }
    if (tax.codigo === "05" && tax.datosImpuestoEspecifico?.volumenUnidadConsumo === undefined)
      issue(
        ["datosImpuestoEspecifico", "volumenUnidadConsumo"],
        "Required for non-alcoholic beverages",
      );
  });

/** Line item with decimal-text quantity and amounts. */
export const DraftLineaDetalleSchema = LineaDetalleSchema.omit({
  cantidad: true,
  precioUnitario: true,
  montoTotal: true,
  subTotal: true,
  impuesto: true,
  impuestoNeto: true,
  montoTotalLinea: true,
}).extend({
  cantidad: DraftQuantityTextSchema,
  precioUnitario: DraftMoneyTextSchema,
  montoTotal: DraftMoneyTextSchema,
  subTotal: DraftMoneyTextSchema,
  impuesto: z.array(DraftImpuestoSchema).min(1),
  impuestoNeto: DraftMoneyTextSchema.optional(),
  montoTotalLinea: DraftMoneyTextSchema,
});

/** Payment entry with a decimal-text amount. */
export const DraftMedioPagoSchema = MedioPagoSchema.omit({
  totalMedioPago: true,
}).extend({
  totalMedioPago: DraftMoneyTextSchema,
});

const moneyFields = {
  totalServGravados: DraftMoneyTextSchema.optional(),
  totalServExentos: DraftMoneyTextSchema.optional(),
  totalServExonerado: DraftMoneyTextSchema.optional(),
  totalServNoSujeto: DraftMoneyTextSchema.optional(),
  totalMercanciasGravadas: DraftMoneyTextSchema.optional(),
  totalMercanciasExentas: DraftMoneyTextSchema.optional(),
  totalMercExonerada: DraftMoneyTextSchema.optional(),
  totalMercNoSujeta: DraftMoneyTextSchema.optional(),
  totalGravado: DraftMoneyTextSchema.optional(),
  totalExento: DraftMoneyTextSchema.optional(),
  totalExonerado: DraftMoneyTextSchema.optional(),
  totalNoSujeto: DraftMoneyTextSchema.optional(),
  totalVenta: DraftMoneyTextSchema,
  totalDescuentos: DraftMoneyTextSchema.optional(),
  totalVentaNeta: DraftMoneyTextSchema,
  totalImpuesto: DraftMoneyTextSchema.optional(),
  totalImpAsumEmisorFabrica: DraftMoneyTextSchema.optional(),
  totalIVADevuelto: DraftMoneyTextSchema.optional(),
  totalOtrosCargos: DraftMoneyTextSchema.optional(),
  totalComprobante: DraftMoneyTextSchema,
  medioPago: z.array(DraftMedioPagoSchema).min(1).max(4).optional(),
} as const;

/** Invoice summary with decimal-text totals. */
export const DraftResumenFacturaSchema = ResumenFacturaSchema.extend(moneyFields);

/** Full factura draft with decimal-text quantities and money. */
export const DraftFacturaSchema = FacturaElectronicaSchema.extend({
  detalleServicio: z.array(DraftLineaDetalleSchema).min(1).max(1000),
  resumenFactura: DraftResumenFacturaSchema,
});

/** Parsed decimal-text factura draft. */
export type DraftFactura = z.infer<typeof DraftFacturaSchema>;

/** Whether a parsed JSON value carries text amounts instead of legacy numbers. */
export function hasDecimalTextMoney(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;
  const document = input as {
    detalleServicio?: unknown;
    resumenFactura?: { totalComprobante?: unknown };
  };
  if (typeof document.resumenFactura?.totalComprobante === "string") return true;
  if (!Array.isArray(document.detalleServicio)) return false;
  return document.detalleServicio.some((line) => {
    if (typeof line !== "object" || line === null) return false;
    const candidate = line as { precioUnitario?: unknown; montoTotal?: unknown };
    return typeof candidate.precioUnitario === "string" || typeof candidate.montoTotal === "string";
  });
}

function text(value: bigint): string {
  return formatScaledDecimal(value, MONEY_SCALE);
}

function expectedLine(
  line: DraftFactura["detalleServicio"][number],
  index: number,
  issues: FacturaValidationError[],
): { subTotal: bigint; tax: bigint } | undefined {
  const prefix = `detalleServicio.${String(index)}`;
  try {
    if (line.descuento && line.descuento.length > 0) {
      issues.push({
        path: `${prefix}.descuento`,
        message:
          "The exact draft does not support discounts; remove them or use the legacy Number path",
      });
      return undefined;
    }

    const quantity = scaledFromPlainDecimal(line.cantidad, DRAFT_QUANTITY_SCALE);
    const price = parseMonetaryText(line.precioUnitario);
    const gross = multiplyExactDecimal(
      quantity,
      price,
      DRAFT_QUANTITY_SCALE,
      MONEY_SCALE,
      MONEY_SCALE,
    );

    const actualGross = parseMonetaryText(line.montoTotal);
    if (actualGross !== gross) {
      issues.push({
        path: `${prefix}.montoTotal`,
        message: `montoTotal (${line.montoTotal}) must equal cantidad × precioUnitario (${text(gross)})`,
      });
    }

    const actualSubTotal = parseMonetaryText(line.subTotal);
    if (actualSubTotal !== gross) {
      issues.push({
        path: `${prefix}.subTotal`,
        message: `subTotal (${line.subTotal}) must equal montoTotal (${text(gross)})`,
      });
    }

    let taxTotal = 0n;
    for (const [taxIndex, tax] of line.impuesto.entries()) {
      const rateCode = tax.codigoTarifaIVA;
      const expectedRate = rateCode ? IVA_RATE_PERCENTAGES[rateCode] : undefined;
      if (expectedRate !== undefined && tax.tarifa !== expectedRate) {
        issues.push({
          path: `${prefix}.impuesto.${String(taxIndex)}.tarifa`,
          message: `tarifa must match codigoTarifaIVA ${rateCode} (${String(expectedRate)}%)`,
        });
      }

      const percentage = scaledFromPlainDecimal(String(tax.tarifa ?? 0), MONEY_SCALE);
      const expectedTax =
        (tax.tarifa ?? 0) > 0
          ? percentExactDecimal(gross, percentage, MONEY_SCALE, MONEY_SCALE, MONEY_SCALE)
          : 0n;
      const actualTax = parseMonetaryText(tax.monto);
      if (actualTax !== expectedTax) {
        issues.push({
          path: `${prefix}.impuesto.${String(taxIndex)}.monto`,
          message: `Tax amount (${tax.monto}) must equal subTotal × tarifa / 100 (${text(expectedTax)})`,
        });
      }
      taxTotal += actualTax;
    }

    const actualTaxNet = line.impuestoNeto ? parseMonetaryText(line.impuestoNeto) : 0n;
    if (actualTaxNet !== taxTotal) {
      issues.push({
        path: `${prefix}.impuestoNeto`,
        message: `impuestoNeto (${line.impuestoNeto ?? "missing"}) must equal the sum of line taxes (${text(taxTotal)})`,
      });
    }

    const actualLineTotal = parseMonetaryText(line.montoTotalLinea);
    if (actualLineTotal !== gross + taxTotal) {
      issues.push({
        path: `${prefix}.montoTotalLinea`,
        message: `montoTotalLinea (${line.montoTotalLinea}) must equal subTotal + impuestoNeto (${text(gross + taxTotal)})`,
      });
    }

    return { subTotal: actualSubTotal, tax: actualTaxNet };
  } catch (error) {
    issues.push({
      path: prefix,
      message: error instanceof Error ? error.message : "Invalid decimal amount",
    });
    return undefined;
  }
}

/**
 * Verify that a decimal-text draft is internally consistent using the exact
 * kernel. The schema validates shape and bounds; this enforces the same money
 * invariants as the legacy validator without converting any amount to Number.
 */
export function validateDraftFactura(input: DraftFactura): FacturaValidationError[] {
  const issues: FacturaValidationError[] = [];

  let totalGravado = 0n;
  let totalExento = 0n;
  let totalImpuesto = 0n;

  input.detalleServicio.forEach((line, index) => {
    if (line.numeroLinea !== index + 1) {
      issues.push({
        path: `detalleServicio.${String(index)}.numeroLinea`,
        message: `Line number must be ${String(index + 1)} (sequential), got ${String(line.numeroLinea)}`,
      });
    }

    const computed = expectedLine(line, index, issues);
    if (!computed) return;

    const taxable = line.impuesto.some((tax) => (tax.tarifa ?? 0) > 0);
    if (taxable) totalGravado += computed.subTotal;
    else totalExento += computed.subTotal;
    totalImpuesto += computed.tax;
  });

  const totalVenta = totalGravado + totalExento;
  const totalVentaNeta = totalVenta;
  const totalComprobante = totalVentaNeta + totalImpuesto;

  const expectSummary = (
    field: keyof typeof input.resumenFactura,
    expected: bigint,
    actual: string | undefined,
  ): void => {
    if (actual === undefined) return;
    const parsed = parseMonetaryText(actual);
    if (parsed !== expected) {
      issues.push({
        path: `resumenFactura.${field}`,
        message: `${field} (${actual}) must equal the exact line aggregate (${text(expected)})`,
      });
    }
  };

  // The interactive draft has no service/merchandise classifier: every line is
  // emitted as merchandise. Keep that split internally consistent too.
  expectSummary("totalServGravados", 0n, input.resumenFactura.totalServGravados);
  expectSummary("totalServExentos", 0n, input.resumenFactura.totalServExentos);
  expectSummary(
    "totalMercanciasGravadas",
    totalGravado,
    input.resumenFactura.totalMercanciasGravadas,
  );
  expectSummary("totalMercanciasExentas", totalExento, input.resumenFactura.totalMercanciasExentas);
  expectSummary("totalGravado", totalGravado, input.resumenFactura.totalGravado);
  expectSummary("totalExento", totalExento, input.resumenFactura.totalExento);
  expectSummary("totalVenta", totalVenta, input.resumenFactura.totalVenta);
  expectSummary("totalVentaNeta", totalVentaNeta, input.resumenFactura.totalVentaNeta);
  expectSummary("totalImpuesto", totalImpuesto, input.resumenFactura.totalImpuesto);
  expectSummary("totalComprobante", totalComprobante, input.resumenFactura.totalComprobante);
  expectSummary("totalDescuentos", 0n, input.resumenFactura.totalDescuentos);

  if (totalComprobante > MAX_MONEY_SCALED) {
    issues.push({
      path: "resumenFactura.totalComprobante",
      message: "The draft total exceeds 9999999999999.99999",
    });
  }

  const payments = input.resumenFactura.medioPago;
  if (payments && payments.length > 0) {
    let allocated = 0n;
    for (const [index, payment] of payments.entries()) {
      try {
        allocated = sumExactDecimal([allocated, parseMonetaryText(payment.totalMedioPago)]);
      } catch (error) {
        issues.push({
          path: `resumenFactura.medioPago.${String(index)}.totalMedioPago`,
          message: error instanceof Error ? error.message : "Invalid payment amount",
        });
      }
    }
    if (allocated !== totalComprobante) {
      issues.push({
        path: "resumenFactura.medioPago",
        message: `Payment allocations (${text(allocated)}) must equal totalComprobante (${text(totalComprobante)})`,
      });
    }
  }

  return issues;
}

/** Build a draft document from parsed text values for the shared XML builder. */
export function draftForXml(input: DraftFactura): FacturaElectronica {
  // The XML mapper only reads and serializes these values; it never performs
  // arithmetic on them. The cast documents that the runtime shape preserves
  // the same element names with decimal text instead of legacy numbers.
  return input as unknown as FacturaElectronica;
}

/** Re-export the exact formatter for callers that print a validated draft. */
export { formatDraftMoney };
