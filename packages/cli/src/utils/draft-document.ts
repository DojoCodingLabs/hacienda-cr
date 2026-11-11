/**
 * Decimal-text draft contract and exact consistency checks.
 *
 * The draft schema is the shared calculated FE schema, so the CLI no longer
 * keeps a parallel monetary grammar. The only CLI-specific work is stripping
 * the blank-template marker and reconstructing source facts before asking the
 * SDK to recalculate. No draft amount is ever cast to `FacturaElectronica`.
 */

import { z } from "zod";
import {
  DecimalFacturaCalculatedSchema,
  DecimalFacturaInputSchema,
  DecimalMoneySchema,
  DecimalQuantitySchema,
  MONETARY_TEXT_PATTERN,
  parseMonetaryText,
  type DecimalDocumentInput,
  type DecimalMoney,
  type DecimalTaxInput,
} from "@dojocoding/hacienda-shared";
import { calculateDecimalDocument, type FacturaValidationError } from "@dojocoding/hacienda-sdk";
import { formatDraftMoney, normalizeDraftQuantity } from "./draft-money.js";

/** Bounded monetary text accepted in a draft. */
export const DraftMoneyTextSchema = DecimalMoneySchema;

/** Positive quantity text accepted in a draft. */
export const DraftQuantityTextSchema = DecimalQuantitySchema.transform((value, ctx) => {
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

function withoutTemplateMarker(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("_templateType" in value)) return value;
  const { _templateType: _ignored, ...rest } = value as Record<string, unknown>;
  return rest;
}

/** Full factura draft with shared bounded decimal quantities and money. */
export const DraftFacturaSchema = z.preprocess(
  withoutTemplateMarker,
  DecimalFacturaCalculatedSchema,
);

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

/**
 * Reconstruct the source facts from a calculated draft.
 *
 * Derived line fields and the supplied summary are intentionally dropped. The
 * SDK recalculates them; a caller can therefore never make an inconsistent
 * draft pass by editing a total.
 */
export function draftToSource(input: DraftFactura): DecimalDocumentInput {
  const source = DecimalFacturaInputSchema.parse({
    clave: input.clave,
    proveedorSistemas: input.proveedorSistemas,
    codigoActividadEmisor: input.codigoActividadEmisor,
    ...(input.codigoActividadReceptor
      ? { codigoActividadReceptor: input.codigoActividadReceptor }
      : {}),
    numeroConsecutivo: input.numeroConsecutivo,
    fechaEmision: input.fechaEmision,
    emisor: input.emisor,
    receptor: input.receptor,
    condicionVenta: input.condicionVenta,
    ...(input.condicionVentaOtros ? { condicionVentaOtros: input.condicionVentaOtros } : {}),
    ...(input.plazoCredito ? { plazoCredito: input.plazoCredito } : {}),
    detalleServicio: input.detalleServicio.map((line) => {
      const {
        montoTotal: _montoTotal,
        subTotal: _subTotal,
        baseImponible: _baseImponible,
        impuestoNeto: _impuestoNeto,
        montoTotalLinea: _montoTotalLinea,
        impuesto,
        ...facts
      } = line;
      return {
        ...facts,
        impuesto: impuesto.map((tax) => {
          const { monto, exoneracion, ...taxFacts } = tax;
          const sourceTax: DecimalTaxInput = { ...taxFacts };
          if (tax.codigo === "02" || tax.codigo === "05") sourceTax.monto = monto;
          if (exoneracion) {
            const { montoExoneracion: _montoExoneracion, ...exonerationFacts } = exoneracion;
            sourceTax.exoneracion = exonerationFacts;
          }
          return sourceTax;
        }),
      };
    }),
    codigoTipoMoneda: input.resumenFactura.codigoTipoMoneda ?? {
      codigoMoneda: "CRC",
      tipoCambio: "1",
    },
    medioPago: input.resumenFactura.medioPago ?? [],
  });
  return { ...source, tipoDocumento: "01" };
}

function moneyIssue(
  issues: FacturaValidationError[],
  path: string,
  actual: string | undefined,
  expected: string,
): void {
  if (actual === undefined) return;
  try {
    if (parseMonetaryText(actual) === parseMonetaryText(expected)) return;
  } catch {
    issues.push({ path, message: `"${actual}" is not a bounded monetary amount` });
    return;
  }
  issues.push({
    path,
    message: `${path} (${actual}) must equal the recalculated value (${expected})`,
  });
}

/**
 * Verify that a decimal-text draft is internally consistent by recalculating
 * source facts with the shared SDK. Only comparisons happen here; there is no
 * local rounding rule and no `Number` conversion.
 */
export function validateDraftFactura(input: DraftFactura): FacturaValidationError[] {
  const issues: FacturaValidationError[] = [];
  let calculated;
  try {
    calculated = calculateDecimalDocument(draftToSource(input));
  } catch (error) {
    issues.push({
      path: "document",
      message: error instanceof Error ? error.message : "Invalid decimal draft",
    });
    return issues;
  }
  if (calculated.tipoDocumento !== "01") {
    issues.push({ path: "tipoDocumento", message: "Draft must calculate as a factura" });
    return issues;
  }

  const calculatedLines = calculated.detalleServicio;
  if (calculatedLines.length !== input.detalleServicio.length) {
    issues.push({ path: "detalleServicio", message: "Line count changed during recalculation" });
    return issues;
  }

  input.detalleServicio.forEach((line, index) => {
    const computed = calculatedLines[index];
    if (!computed) return;
    const prefix = `detalleServicio.${String(index)}`;
    if (line.numeroLinea !== index + 1)
      issues.push({
        path: `${prefix}.numeroLinea`,
        message: `Line number must be ${String(index + 1)} (sequential), got ${String(line.numeroLinea)}`,
      });
    moneyIssue(issues, `${prefix}.montoTotal`, line.montoTotal, computed.montoTotal);
    moneyIssue(issues, `${prefix}.subTotal`, line.subTotal, computed.subTotal);
    if (line.baseImponible !== undefined)
      moneyIssue(
        issues,
        `${prefix}.baseImponible`,
        line.baseImponible,
        computed.baseImponible ?? "0",
      );
    if (line.impuestoNeto !== undefined)
      moneyIssue(issues, `${prefix}.impuestoNeto`, line.impuestoNeto, computed.impuestoNeto ?? "0");
    moneyIssue(issues, `${prefix}.montoTotalLinea`, line.montoTotalLinea, computed.montoTotalLinea);

    if (line.impuesto.length !== computed.impuesto.length) {
      issues.push({
        path: `${prefix}.impuesto`,
        message: "Tax count changed during recalculation",
      });
    } else {
      line.impuesto.forEach((tax, taxIndex) => {
        const expected = computed.impuesto[taxIndex];
        if (!expected) return;
        const taxPath = `${prefix}.impuesto.${String(taxIndex)}`;
        moneyIssue(issues, `${taxPath}.monto`, tax.monto, expected.monto);
        if (tax.exoneracion && expected.exoneracion)
          moneyIssue(
            issues,
            `${taxPath}.exoneracion.montoExoneracion`,
            tax.exoneracion.montoExoneracion,
            expected.exoneracion.montoExoneracion,
          );
      });
    }

    if (line.descuento && computed.descuento) {
      if (line.descuento.length !== computed.descuento.length)
        issues.push({ path: `${prefix}.descuento`, message: "Discount count changed" });
      else
        line.descuento.forEach((discount, discountIndex) => {
          const expected = computed.descuento?.[discountIndex];
          if (expected)
            moneyIssue(
              issues,
              `${prefix}.descuento.${String(discountIndex)}.montoDescuento`,
              discount.montoDescuento,
              expected.montoDescuento,
            );
        });
    }
  });

  const summaryKeys = [
    "totalServGravados",
    "totalServExentos",
    "totalServExonerado",
    "totalServNoSujeto",
    "totalMercanciasGravadas",
    "totalMercanciasExentas",
    "totalMercExonerada",
    "totalMercNoSujeta",
    "totalGravado",
    "totalExento",
    "totalExonerado",
    "totalNoSujeto",
    "totalVenta",
    "totalDescuentos",
    "totalVentaNeta",
    "totalImpuesto",
    "totalImpAsumEmisorFabrica",
    "totalIVADevuelto",
    "totalOtrosCargos",
    "totalComprobante",
  ] as const;
  const supplied = input.resumenFactura;
  const expectedSummary = calculated.resumenFactura;
  for (const key of summaryKeys) {
    const actual = supplied[key];
    const expected = expectedSummary[key];
    if (actual !== undefined && expected !== undefined)
      moneyIssue(issues, `resumenFactura.${key}`, actual, expected);
  }

  if (supplied.medioPago && expectedSummary.medioPago) {
    if (supplied.medioPago.length !== expectedSummary.medioPago.length)
      issues.push({ path: "resumenFactura.medioPago", message: "Payment count changed" });
    else
      supplied.medioPago.forEach((payment, index) => {
        const expected = expectedSummary.medioPago?.[index];
        if (expected)
          moneyIssue(
            issues,
            `resumenFactura.medioPago.${String(index)}.totalMedioPago`,
            payment.totalMedioPago,
            expected.totalMedioPago,
          );
      });
  }

  return issues;
}

/** Re-export the exact formatter for callers that print a validated draft. */
export { formatDraftMoney };

/** Re-export so callers can validate a raw string before schema parsing. */
export { MONETARY_TEXT_PATTERN };
export type { DecimalMoney };
