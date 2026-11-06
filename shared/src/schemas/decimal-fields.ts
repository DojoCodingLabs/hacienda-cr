/**
 * Bounded decimal-text fields for the additive `DecimalDocument*` family.
 *
 * Every money, quantity, rate, factor, percentage, proportion and exchange
 * rate is plain unsigned decimal text. Syntax and monetary bounds come from
 * the shared monetary boundary (`MONETARY_TEXT_PATTERN`, `scaledFromPlainDecimal`);
 * this module only adds the official per-field scale and value bounds.
 *
 * The schemas never coerce a JSON number. A caller that wants the exact path
 * must send text, and a value that is not exactly representable is rejected
 * instead of being rounded at the schema boundary.
 */

import { z } from "zod";
import { MONETARY_TEXT_PATTERN, scaledFromPlainDecimal } from "../monetary/index.js";
import { ExonerationType } from "../constants/index.js";
import {
  CURRENCY_CODES,
  DISCOUNT_CODES,
  EXONERATION_INSTITUTIONS,
  OTHER_CHARGE_TYPES,
} from "../generated/index.js";
import { IvaRateCodeSchema, PaymentMethodSchema, TaxCodeSchema } from "./common.js";
import { IdentificacionSchema } from "./identification.js";
import { InformacionReferenciaSchema, RepInformacionReferenciaSchema } from "./factura.js";
import { OtroContenidoSchema } from "./factura.js";

interface DecimalBounds {
  label: string;
  maxWholeDigits: number;
  maxFractionDigits: number;
  max?: string;
  totalDigits?: number;
  positive?: boolean;
}

function significantDigits(text: string): number {
  const [whole = "", fraction = ""] = text.split(".");
  return (whole + fraction).replace(/^0+/, "").replace(/0+$/, "").length;
}

function scaled(value: string, scale: number): bigint {
  return scaledFromPlainDecimal(value, scale);
}

/**
 * Build a bounded unsigned decimal-text schema.
 *
 * The shared monetary pattern is the syntax gate. Additional checks reject a
 * scale above the official field, an integer part above the official width,
 * a value above the official maximum, and (when requested) zero.
 */
function decimalText(bounds: DecimalBounds): z.ZodString {
  return z
    .string()
    .regex(
      MONETARY_TEXT_PATTERN,
      `${bounds.label} must be unsigned plain decimal text without exponent or sign`,
    )
    .refine(
      (value) => {
        const fraction = value.split(".")[1] ?? "";
        return fraction.length <= bounds.maxFractionDigits;
      },
      `${bounds.label} allows at most ${String(bounds.maxFractionDigits)} decimals`,
    )
    .refine(
      (value) => {
        const whole = value.split(".")[0] ?? "";
        return whole.replace(/^0+/, "").length <= bounds.maxWholeDigits;
      },
      `${bounds.label} allows at most ${String(bounds.maxWholeDigits)} integer digits`,
    )
    .refine(
      (value) => bounds.totalDigits === undefined || significantDigits(value) <= bounds.totalDigits,
      `${bounds.label} allows at most ${String(bounds.totalDigits ?? 0)} significant digits`,
    )
    .refine(
      (value) => {
        if (bounds.max === undefined) return true;
        return (
          scaled(value, bounds.maxFractionDigits) <= scaled(bounds.max, bounds.maxFractionDigits)
        );
      },
      `${bounds.label} must not exceed ${bounds.max ?? ""}`,
    )
    .refine(
      (value) => bounds.positive !== true || /[1-9]/.test(value),
      `${bounds.label} must be greater than zero`,
    );
}

/** Non-negative monetary amount: 13 integer digits and 5 decimals. */
export const DecimalMoneySchema = decimalText({
  label: "Amount",
  maxWholeDigits: 13,
  maxFractionDigits: 5,
});

/** Strictly positive monetary amount. */
export const DecimalPositiveMoneySchema = decimalText({
  label: "Positive amount",
  maxWholeDigits: 13,
  maxFractionDigits: 5,
  positive: true,
});

/** Positive quantity: 16 significant digits and at most 3 decimals. */
export const DecimalQuantitySchema = decimalText({
  label: "Quantity",
  maxWholeDigits: 13,
  maxFractionDigits: 3,
  totalDigits: 16,
  positive: true,
});

/** Tax rate percentage: 0..99.99 with at most 2 decimals. */
export const DecimalRateSchema = decimalText({
  label: "Tax rate",
  maxWholeDigits: 2,
  maxFractionDigits: 2,
  max: "99.99",
});

/** Calculation factor: 0..9.9999 with at most 4 decimals. */
export const DecimalFactorSchema = decimalText({
  label: "Calculation factor",
  maxWholeDigits: 1,
  maxFractionDigits: 4,
  max: "9.9999",
});

/** Percentage: 0..100 with at most 2 decimals. */
export const DecimalPercentageSchema = decimalText({
  label: "Percentage",
  maxWholeDigits: 3,
  maxFractionDigits: 2,
  max: "100",
});

/** Exonerated tariff percentage: 0..100 with at most 5 decimals. */
export const DecimalExoneratedRateSchema = decimalText({
  label: "Exonerated rate",
  maxWholeDigits: 3,
  maxFractionDigits: 5,
  max: "100",
});

/** Specific-tax proportion: 10 total digits and at most 5 decimals. */
export const DecimalProportionSchema = decimalText({
  label: "Proportion",
  maxWholeDigits: 5,
  maxFractionDigits: 5,
  totalDigits: 10,
  max: "99999.99999",
});

/** Specific-tax quantity/volume: 7 total digits and at most 2 decimals. */
export const DecimalSpecificQuantitySchema = decimalText({
  label: "Specific-tax quantity",
  maxWholeDigits: 5,
  maxFractionDigits: 2,
  totalDigits: 7,
  max: "99999.99",
});

/** Positive exchange rate, bounded as a monetary amount. */
export const DecimalExchangeRateSchema = DecimalPositiveMoneySchema;

/** Schema for `DatosImpuestoEspecifico` with decimal-text values. */
export const DecimalDatosImpuestoEspecificoSchema = z
  .object({
    cantidadUnidadMedida: DecimalSpecificQuantitySchema,
    porcentaje: DecimalSpecificQuantitySchema.optional(),
    proporcion: DecimalProportionSchema.optional(),
    volumenUnidadConsumo: DecimalSpecificQuantitySchema.optional(),
    impuestoUnidad: DecimalMoneySchema,
  })
  .strict();

export type DecimalDatosImpuestoEspecifico = z.infer<typeof DecimalDatosImpuestoEspecificoSchema>;

/** Source exoneration without the derived `montoExoneracion`. */
export const DecimalExonerationInputSchema = z
  .object({
    tipoDocumento: z.enum(ExonerationType),
    tipoDocumentoOtros: z.string().min(5).max(100).optional(),
    numeroDocumento: z.string().min(3).max(40),
    articulo: z.number().int().min(0).max(999999).optional(),
    inciso: z.number().int().min(0).max(999999).optional(),
    nombreInstitucion: z.enum(EXONERATION_INSTITUTIONS),
    nombreInstitucionOtros: z.string().min(5).max(160).optional(),
    fechaEmision: z.string().min(1),
    tarifaExonerada: DecimalExoneratedRateSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.tipoDocumento === "99" && !value.tipoDocumentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocumentoOtros"],
        message: "Explicit other exoneration-document text is required for type 99",
      });
    if (value.tipoDocumento !== "99" && value.tipoDocumentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocumentoOtros"],
        message: "Other exoneration-document text is only allowed for type 99",
      });
    if (value.nombreInstitucion === "99" && !value.nombreInstitucionOtros)
      ctx.addIssue({
        code: "custom",
        path: ["nombreInstitucionOtros"],
        message: "Explicit other exoneration-institution text is required for code 99",
      });
    if (value.nombreInstitucion !== "99" && value.nombreInstitucionOtros)
      ctx.addIssue({
        code: "custom",
        path: ["nombreInstitucionOtros"],
        message: "Other exoneration-institution text is only allowed for code 99",
      });
  });

/** Calculated exoneration with its derived exonerated amount. */
export const DecimalExonerationCalculatedSchema = z
  .object({
    ...DecimalExonerationInputSchema.shape,
    montoExoneracion: DecimalMoneySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.tipoDocumento === "99" && !value.tipoDocumentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocumentoOtros"],
        message: "Explicit other exoneration-document text is required for type 99",
      });
    if (value.tipoDocumento !== "99" && value.tipoDocumentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocumentoOtros"],
        message: "Other exoneration-document text is only allowed for type 99",
      });
    if (value.nombreInstitucion === "99" && !value.nombreInstitucionOtros)
      ctx.addIssue({
        code: "custom",
        path: ["nombreInstitucionOtros"],
        message: "Explicit other exoneration-institution text is required for code 99",
      });
    if (value.nombreInstitucion !== "99" && value.nombreInstitucionOtros)
      ctx.addIssue({
        code: "custom",
        path: ["nombreInstitucionOtros"],
        message: "Other exoneration-institution text is only allowed for code 99",
      });
  });

const TAX_IVA_CODES = new Set(["01", "07", "08"]);
const TAX_SPECIFIC_CODES = new Set(["03", "04", "05", "06"]);

function refineDecimalTax(
  tax: {
    codigo: string;
    codigoImpuestoOtros?: string;
    codigoTarifaIVA?: string;
    tarifa?: string;
    monto?: string;
    datosImpuestoEspecifico?: {
      porcentaje?: string;
      proporcion?: string;
      volumenUnidadConsumo?: string;
    };
  },
  ctx: z.RefinementCtx,
  allowDerivedAmount = false,
): void {
  const issue = (path: string[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });
  if (tax.codigo === "99" && !tax.codigoImpuestoOtros)
    issue(["codigoImpuestoOtros"], "Explicit other-tax text is required for code 99");
  if (tax.codigo !== "99" && tax.codigoImpuestoOtros)
    issue(["codigoImpuestoOtros"], "Other-tax text is only allowed for code 99");
  if (TAX_IVA_CODES.has(tax.codigo) && !tax.codigoTarifaIVA)
    issue(["codigoTarifaIVA"], "IVA taxes require an official rate code");
  if (TAX_IVA_CODES.has(tax.codigo) && tax.tarifa === undefined)
    issue(["tarifa"], "IVA taxes require a percentage rate");
  const specific = TAX_SPECIFIC_CODES.has(tax.codigo);
  if (specific && !tax.datosImpuestoEspecifico)
    issue(["datosImpuestoEspecifico"], "Specific-tax calculation data is required");
  if (!specific && tax.datosImpuestoEspecifico)
    issue(["datosImpuestoEspecifico"], "Specific-tax data is only allowed for codes 03–06");
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
  if (tax.codigo === "05" && tax.monto === undefined)
    issue(["monto"], "Tax 05 requires an explicit amount calculated for the product category");
  if (!allowDerivedAmount && tax.monto !== undefined && tax.codigo !== "02" && tax.codigo !== "05")
    issue(["monto"], "Only tax codes 02 and 05 accept an explicit amount");
}

const decimalTaxShape = {
  codigo: TaxCodeSchema,
  codigoImpuestoOtros: z.string().min(5).max(100).optional(),
  codigoTarifaIVA: IvaRateCodeSchema.optional(),
  tarifa: DecimalRateSchema.optional(),
  factorCalculoIVA: DecimalFactorSchema.optional(),
  datosImpuestoEspecifico: DecimalDatosImpuestoEspecificoSchema.optional(),
  exoneracion: DecimalExonerationInputSchema.optional(),
};

/** Source tax: the amount is derived except for codes 02 and 05. */
export const DecimalTaxInputSchema = z
  .object({
    ...decimalTaxShape,
    monto: DecimalMoneySchema.optional(),
  })
  .strict()
  .superRefine((tax, ctx) => refineDecimalTax(tax, ctx));

/** Calculated tax: the amount and exonerated amount are present. */
export const DecimalTaxCalculatedSchema = z
  .object({
    ...decimalTaxShape,
    exoneracion: DecimalExonerationCalculatedSchema.optional(),
    monto: DecimalMoneySchema,
  })
  .strict()
  .superRefine((tax, ctx) => refineDecimalTax(tax, ctx, true));

/** Discount with an explicit amount; percentage discounts stay in the narrow families. */
export const DecimalDiscountSchema = z
  .object({
    montoDescuento: DecimalPositiveMoneySchema,
    codigoDescuento: z.enum(DISCOUNT_CODES),
    codigoDescuentoOtros: z.string().min(5).max(100).optional(),
    naturalezaDescuento: z.string().min(3).max(80).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.codigoDescuento === "99" && !value.codigoDescuentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["codigoDescuentoOtros"],
        message: "Explicit other-discount text is required for code 99",
      });
    if (value.codigoDescuento !== "99" && value.codigoDescuentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["codigoDescuentoOtros"],
        message: "Other-discount text is only allowed for code 99",
      });
  });

/** Other charge with an exact amount. */
export const DecimalOtherChargeSchema = z
  .object({
    tipoDocumento: z.enum(OTHER_CHARGE_TYPES),
    tipoDocumentoOtros: z.string().min(5).max(100).optional(),
    identificacionTercero: IdentificacionSchema.strict().optional(),
    nombreTercero: z.string().min(5).max(100).optional(),
    detalle: z.string().min(1).max(160),
    porcentaje: DecimalPercentageSchema.optional(),
    montoCargo: DecimalMoneySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.tipoDocumento === "99" && !value.tipoDocumentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocumentoOtros"],
        message: "Explicit other-charge text is required for type 99",
      });
    if (value.tipoDocumento !== "99" && value.tipoDocumentoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocumentoOtros"],
        message: "Other-charge text is only allowed for type 99",
      });
  });

/** Payment allocation with an exact amount. */
export const DecimalPaymentSchema = z
  .object({
    tipoMedioPago: PaymentMethodSchema,
    medioPagoOtros: z.string().min(3).max(100).optional(),
    totalMedioPago: DecimalMoneySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.tipoMedioPago === "99" && !value.medioPagoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["medioPagoOtros"],
        message: "Explicit other-payment text is required for type 99",
      });
    if (value.tipoMedioPago !== "99" && value.medioPagoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["medioPagoOtros"],
        message: "Other-payment text is only allowed for type 99",
      });
  });

/** Per-tax-code total with an exact amount. */
export const DecimalTaxTotalSchema = z
  .object({
    codigo: TaxCodeSchema,
    codigoTarifaIVA: IvaRateCodeSchema.optional(),
    totalMontoImpuesto: DecimalMoneySchema,
  })
  .strict();

/** Currency information with an exact exchange rate. */
export const DecimalCurrencySchema = z
  .object({
    codigoMoneda: z.enum(CURRENCY_CODES),
    tipoCambio: DecimalExchangeRateSchema,
  })
  .strict();

/**
 * Calculated summary.
 *
 * Core totals are required. The legacy-optional classification/tax totals are
 * optional here so existing decimal drafts (which do not emit every zero
 * category) remain valid JSON; the calculator emits all of them.
 */
export const DecimalSummarySchema = z
  .object({
    codigoTipoMoneda: DecimalCurrencySchema.optional(),
    totalServGravados: DecimalMoneySchema.optional(),
    totalServExentos: DecimalMoneySchema.optional(),
    totalServExonerado: DecimalMoneySchema.optional(),
    totalServNoSujeto: DecimalMoneySchema.optional(),
    totalMercanciasGravadas: DecimalMoneySchema.optional(),
    totalMercanciasExentas: DecimalMoneySchema.optional(),
    totalMercExonerada: DecimalMoneySchema.optional(),
    totalMercNoSujeta: DecimalMoneySchema.optional(),
    totalGravado: DecimalMoneySchema.optional(),
    totalExento: DecimalMoneySchema.optional(),
    totalExonerado: DecimalMoneySchema.optional(),
    totalNoSujeto: DecimalMoneySchema.optional(),
    totalVenta: DecimalMoneySchema,
    totalDescuentos: DecimalMoneySchema.optional(),
    totalVentaNeta: DecimalMoneySchema,
    totalDesgloseImpuesto: z.array(DecimalTaxTotalSchema).optional(),
    totalImpuesto: DecimalMoneySchema.optional(),
    totalImpAsumEmisorFabrica: DecimalMoneySchema.optional(),
    totalIVADevuelto: DecimalMoneySchema.optional(),
    totalOtrosCargos: DecimalMoneySchema.optional(),
    medioPago: z.array(DecimalPaymentSchema).min(1).max(4).optional(),
    totalComprobante: DecimalMoneySchema,
  })
  .strict();

/** Reference information uses no monetary fields; keep the legacy bounds and strict keys. */
export const DecimalReferenceSchema = InformacionReferenciaSchema;

/** Reference information for Recibo Electronico de Pago (REP). Same shape as the base,
 * with the REP reason catalog ("17" admitted) and the same conditional rules. */
export const DecimalRepReferenceSchema = RepInformacionReferenciaSchema;

/** Additional content is non-monetary; keep the legacy bounds and strict keys. */
export const DecimalOtherContenidoSchema = OtroContenidoSchema.strict();

export type DecimalMoney = z.infer<typeof DecimalMoneySchema>;
export type DecimalTaxInput = z.infer<typeof DecimalTaxInputSchema>;
export type DecimalTaxCalculated = z.infer<typeof DecimalTaxCalculatedSchema>;
export type DecimalDiscount = z.infer<typeof DecimalDiscountSchema>;
export type DecimalOtherCharge = z.infer<typeof DecimalOtherChargeSchema>;
export type DecimalPayment = z.infer<typeof DecimalPaymentSchema>;
export type DecimalCurrency = z.infer<typeof DecimalCurrencySchema>;
export type DecimalSummary = z.infer<typeof DecimalSummarySchema>;
