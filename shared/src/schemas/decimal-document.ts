/**
 * Additive public `DecimalDocument*` family.
 *
 * Every amount, quantity, rate, factor, percentage, proportion and exchange
 * rate is bounded decimal text. The source schemas contain facts only; the
 * calculated schemas add the derived line totals, taxes and invoice summary.
 *
 * The discriminated unions are the only place where `tipoDocumento` is
 * required. The per-type schemas remain usable without a discriminator.
 */

import { z } from "zod";
import { REP_SALE_CONDITIONS, UNITS_OF_MEASURE } from "../constants/index.js";
import { COMMERCIAL_CODE_TYPES, TRANSACTION_TYPES } from "../generated/index.js";
import { SaleConditionSchema } from "./common.js";
import { EmisorSchema } from "./emisor.js";
import { ReceptorSchema } from "./receptor.js";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";
import { FacturaElectronicaSchema } from "./factura.js";
import {
  DecimalCurrencySchema,
  DecimalDiscountSchema,
  DecimalMoneySchema,
  DecimalOtherChargeSchema,
  DecimalOtherContenidoSchema,
  DecimalPaymentSchema,
  DecimalPositiveMoneySchema,
  DecimalQuantitySchema,
  DecimalReferenceSchema,
  DecimalSummarySchema,
  DecimalTaxCalculatedSchema,
  DecimalTaxInputSchema,
} from "./decimal-fields.js";

/** Document type codes covered by the additive family. */
export const DECIMAL_DOCUMENT_TYPE_CODES = ["01", "02", "03", "04", "08", "09", "10"] as const;
export type DecimalDocumentTypeCode = (typeof DECIMAL_DOCUMENT_TYPE_CODES)[number];

export const DECIMAL_DOCUMENT_TYPE_NAMES: Readonly<Record<DecimalDocumentTypeCode, string>> = {
  "01": "FacturaElectronica",
  "02": "NotaDebitoElectronica",
  "03": "NotaCreditoElectronica",
  "04": "TiqueteElectronico",
  "08": "FacturaElectronicaCompra",
  "09": "FacturaElectronicaExportacion",
  "10": "ReciboElectronicoPago",
};

/** Strict issuer with strict nested structures. */
export const DecimalEmisorSchema = EmisorSchema.extend({
  identificacion: IdentificacionSchema.strict(),
  ubicacion: UbicacionSchema.strict(),
  telefono: TelefonoSchema.strict().optional(),
}).strict();

/** Strict receiver with strict nested structures. */
export const DecimalReceptorSchema = ReceptorSchema.extend({
  identificacion: IdentificacionSchema.strict().optional(),
  ubicacion: UbicacionSchema.strict().optional(),
  telefono: TelefonoSchema.strict().optional(),
}).strict();

const DecimalReceptorWithIdSchema = DecimalReceptorSchema.extend({
  identificacion: IdentificacionSchema.strict(),
}).strict();

const DecimalCodigoComercialSchema = z
  .object({
    tipo: z.enum(COMMERCIAL_CODE_TYPES),
    codigo: z.string().min(1).max(20),
  })
  .strict();

const DecimalLineBaseSchema = z
  .object({
    numeroLinea: z.number().int().positive(),
    codigoCabys: z.string().regex(/^\d{13}$/, "CABYS code must be exactly 13 digits"),
    codigoComercial: z.array(DecimalCodigoComercialSchema).max(5).optional(),
    cantidad: DecimalQuantitySchema,
    unidadMedida: z.enum(UNITS_OF_MEASURE),
    tipoTransaccion: z.enum(TRANSACTION_TYPES).optional(),
    unidadMedidaComercial: z.string().max(20).optional(),
    detalle: z.string().min(3).max(200),
    numeroVINoSerie: z.array(z.string().min(1).max(17)).optional(),
    precioUnitario: DecimalMoneySchema,
    descuento: z.array(DecimalDiscountSchema).max(5).optional(),
    impuesto: z.array(DecimalTaxInputSchema).min(1).max(10),
    impuestoAsumidoEmisorFabrica: DecimalMoneySchema.optional(),
    esServicio: z.boolean().optional(),
  })
  .strict();

/** Source line for FE, TE and FEC (no customs tariff). */
export const DecimalLineInputSchema = DecimalLineBaseSchema;

/** Source line for NC, ND and FEE (customs tariff allowed). */
export const DecimalLineWithTariffInputSchema = DecimalLineBaseSchema.extend({
  partidaArancelaria: z.string().max(15).optional(),
}).strict();

const DecimalLineCalculatedBaseSchema = z
  .object({
    ...DecimalLineBaseSchema.shape,
    descuento: z.array(DecimalDiscountSchema).max(5).optional(),
    impuesto: z.array(DecimalTaxCalculatedSchema).min(1).max(10),
    montoTotal: DecimalMoneySchema,
    subTotal: DecimalMoneySchema,
    baseImponible: DecimalMoneySchema.optional(),
    impuestoNeto: DecimalMoneySchema.optional(),
    montoTotalLinea: DecimalMoneySchema,
  })
  .strict();

/** Calculated line for FE, TE and FEC. */
export const DecimalLineCalculatedSchema = DecimalLineCalculatedBaseSchema;

/** Calculated line for NC, ND and FEE. */
export const DecimalLineWithTariffCalculatedSchema = DecimalLineCalculatedBaseSchema.extend({
  partidaArancelaria: z.string().max(15).optional(),
}).strict();

/**
 * REP line: amounts are supplied facts. Quantity, unit price and derived
 * line-total formulas have no place in this family.
 */
export const DecimalRepLineInputSchema = z
  .object({
    numeroLinea: z.number().int().positive(),
    codigoCabys: z
      .string()
      .regex(/^\d{13}$/)
      .optional(),
    detalle: z.string().min(3).max(200),
    montoTotal: DecimalPositiveMoneySchema,
    subTotal: DecimalMoneySchema,
    impuesto: z.array(DecimalTaxCalculatedSchema).min(1).max(10),
    impuestoNeto: DecimalMoneySchema,
    montoTotalLinea: DecimalMoneySchema,
    esServicio: z.boolean().optional(),
  })
  .strict();

/** REP calculated line has the same supplied facts; no amount is inferred. */
export const DecimalRepLineCalculatedSchema = DecimalRepLineInputSchema;

const decimalCommonSourceShape = {
  clave: FacturaElectronicaSchema.shape.clave,
  proveedorSistemas: FacturaElectronicaSchema.shape.proveedorSistemas,
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor.optional(),
  codigoActividadReceptor: FacturaElectronicaSchema.shape.codigoActividadReceptor,
  numeroConsecutivo: FacturaElectronicaSchema.shape.numeroConsecutivo,
  fechaEmision: z.string().min(1),
  emisor: DecimalEmisorSchema,
  receptor: DecimalReceptorSchema.optional(),
  condicionVenta: SaleConditionSchema,
  condicionVentaOtros: z.string().min(5).max(100).optional(),
  plazoCredito: z.string().optional(),
  detalleServicio: z.array(DecimalLineInputSchema).min(1).max(1000),
  codigoTipoMoneda: DecimalCurrencySchema,
  medioPago: z.array(DecimalPaymentSchema).min(1).max(4),
  otrosCargos: z.array(DecimalOtherChargeSchema).max(15).optional(),
  informacionReferencia: z.array(DecimalReferenceSchema).max(10).optional(),
  otros: z.array(DecimalOtherContenidoSchema).optional(),
};

/** Common source shape before each document family narrows a field. */
export const DecimalDocumentSourceBaseSchema = z.object(decimalCommonSourceShape).strict();

const decimalCommonCalculatedShape = {
  clave: FacturaElectronicaSchema.shape.clave,
  proveedorSistemas: FacturaElectronicaSchema.shape.proveedorSistemas,
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor.optional(),
  codigoActividadReceptor: FacturaElectronicaSchema.shape.codigoActividadReceptor,
  numeroConsecutivo: FacturaElectronicaSchema.shape.numeroConsecutivo,
  fechaEmision: z.string().min(1),
  emisor: DecimalEmisorSchema,
  receptor: DecimalReceptorSchema.optional(),
  condicionVenta: SaleConditionSchema,
  condicionVentaOtros: z.string().min(5).max(100).optional(),
  plazoCredito: z.string().optional(),
  detalleServicio: z.array(DecimalLineCalculatedSchema).min(1).max(1000),
  otrosCargos: z.array(DecimalOtherChargeSchema).max(15).optional(),
  resumenFactura: DecimalSummarySchema,
  informacionReferencia: z.array(DecimalReferenceSchema).max(10).optional(),
  otros: z.array(DecimalOtherContenidoSchema).optional(),
};

/** Common calculated shape before each document family narrows a field. */
export const DecimalDocumentCalculatedBaseSchema = z.object(decimalCommonCalculatedShape).strict();

type StandardFamily = "FE" | "TE" | "NC" | "ND" | "FEC" | "FEE";

function crcRateIsOne(rate: string): boolean {
  return rate === "1" || /^1\.0+$/.test(rate);
}

function refineStandardSource(
  input: {
    condicionVenta: string;
    condicionVentaOtros?: string;
    plazoCredito?: string;
    codigoTipoMoneda: { codigoMoneda: string; tipoCambio: string };
    detalleServicio: readonly { numeroLinea: number }[];
    receptor?: { identificacion?: unknown };
  },
  ctx: z.RefinementCtx,
  family: StandardFamily,
): void {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });

  if (input.condicionVenta === "99" && !input.condicionVentaOtros)
    issue(["condicionVentaOtros"], "Explicit other-sale text is required for condition 99");
  if (input.condicionVenta !== "99" && input.condicionVentaOtros)
    issue(["condicionVentaOtros"], "Other-sale text is only allowed for condition 99");

  const creditCondition = ["02", "10"].includes(input.condicionVenta);
  if (creditCondition && input.plazoCredito === undefined)
    issue(["plazoCredito"], "Explicit positive credit days are required for conditions 02/10");
  if (input.plazoCredito !== undefined && !/^\d{1,5}$/.test(input.plazoCredito))
    issue(["plazoCredito"], "Credit days must be 1–5 digits");
  if (input.plazoCredito !== undefined && !/[1-9]/.test(input.plazoCredito))
    issue(["plazoCredito"], "Credit days must be positive");

  if (
    input.codigoTipoMoneda.codigoMoneda === "CRC" &&
    !crcRateIsOne(input.codigoTipoMoneda.tipoCambio)
  )
    issue(["codigoTipoMoneda", "tipoCambio"], "CRC exchange rate must equal 1");

  if (["FE", "TE"].includes(family) && ["09", "11", "12", "13"].includes(input.condicionVenta))
    issue(["condicionVenta"], "Sale condition belongs to another document family");
  if (["NC", "ND"].includes(family) && ["09", "11", "12", "13"].includes(input.condicionVenta))
    issue(["condicionVenta"], "Sale condition belongs to another document family");
  if (family === "FEC" && !["01", "02"].includes(input.condicionVenta))
    issue(["condicionVenta"], "Purchase invoices accept cash or credit conditions only");

  if (["FE", "FEC", "FEE"].includes(family) && !input.receptor?.identificacion)
    issue(["receptor", "identificacion"], "This document requires receiver identification");

  input.detalleServicio.forEach((line, index) => {
    if (line.numeroLinea !== index + 1)
      issue(["detalleServicio", index, "numeroLinea"], "Line numbers must be sequential");
  });
}

function makeSourceSchema<S extends z.ZodRawShape>(
  schema: z.ZodObject<S>,
  family: StandardFamily,
): z.ZodType<z.infer<z.ZodObject<S>>> {
  return schema.superRefine((input, ctx) =>
    refineStandardSource(
      input as unknown as Parameters<typeof refineStandardSource>[0],
      ctx,
      family,
    ),
  );
}

const decimalFacturaRaw = DecimalDocumentSourceBaseSchema.extend({
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor,
  receptor: DecimalReceptorWithIdSchema,
  detalleServicio: z.array(DecimalLineInputSchema).min(1).max(1000),
}).strict();

const decimalTiqueteRaw = DecimalDocumentSourceBaseSchema.extend({
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor,
  receptor: DecimalReceptorSchema.optional(),
  detalleServicio: z.array(DecimalLineInputSchema).min(1).max(1000),
}).strict();

const decimalNotaCreditoRaw = DecimalDocumentSourceBaseSchema.extend({
  receptor: DecimalReceptorSchema,
  detalleServicio: z.array(DecimalLineWithTariffInputSchema).min(1).max(1000),
  informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
}).strict();

const decimalNotaDebitoRaw = DecimalDocumentSourceBaseSchema.extend({
  receptor: DecimalReceptorSchema,
  detalleServicio: z.array(DecimalLineWithTariffInputSchema).min(1).max(1000),
  informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
}).strict();

const decimalFacturaCompraRaw = DecimalDocumentSourceBaseSchema.extend({
  codigoActividadReceptor: FacturaElectronicaSchema.shape.codigoActividadReceptor.unwrap(),
  receptor: DecimalReceptorWithIdSchema,
  detalleServicio: z.array(DecimalLineInputSchema).min(1).max(1000),
  informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
}).strict();

const decimalFacturaExportacionRaw = DecimalDocumentSourceBaseSchema.extend({
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor,
  receptor: DecimalReceptorWithIdSchema,
  detalleServicio: z.array(DecimalLineWithTariffInputSchema).min(1).max(1000),
}).strict();

export const DecimalFacturaInputSchema = makeSourceSchema(decimalFacturaRaw, "FE");
export const DecimalTiqueteInputSchema = makeSourceSchema(decimalTiqueteRaw, "TE");
export const DecimalNotaCreditoInputSchema = makeSourceSchema(decimalNotaCreditoRaw, "NC");
export const DecimalNotaDebitoInputSchema = makeSourceSchema(decimalNotaDebitoRaw, "ND");
export const DecimalFacturaCompraInputSchema = makeSourceSchema(decimalFacturaCompraRaw, "FEC");
export const DecimalFacturaExportacionInputSchema = makeSourceSchema(
  decimalFacturaExportacionRaw,
  "FEE",
);

const decimalRepSourceSchema = z
  .object({
    clave: FacturaElectronicaSchema.shape.clave,
    proveedorSistemas: FacturaElectronicaSchema.shape.proveedorSistemas,
    numeroConsecutivo: FacturaElectronicaSchema.shape.numeroConsecutivo,
    fechaEmision: z.string().min(1),
    emisor: DecimalEmisorSchema,
    receptor: DecimalReceptorWithIdSchema,
    condicionVenta: z.union([SaleConditionSchema, z.enum(REP_SALE_CONDITIONS)]),
    detalleServicio: z.array(DecimalRepLineInputSchema).min(1).max(1000),
    codigoTipoMoneda: DecimalCurrencySchema,
    medioPago: z.array(DecimalPaymentSchema).min(1).max(4).optional(),
    informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      input.codigoTipoMoneda.codigoMoneda === "CRC" &&
      !crcRateIsOne(input.codigoTipoMoneda.tipoCambio)
    )
      ctx.addIssue({
        code: "custom",
        path: ["codigoTipoMoneda", "tipoCambio"],
        message: "CRC exchange rate must equal 1",
      });
    input.detalleServicio.forEach((line, index) => {
      if (line.numeroLinea !== index + 1)
        ctx.addIssue({
          code: "custom",
          path: ["detalleServicio", index, "numeroLinea"],
          message: "Line numbers must be sequential",
        });
    });
  });

// Keep the exported name stable while avoiding a typo in the internal builder.
export const DecimalReciboPagoInputSchema = decimalRepSourceSchema;

const decimalFacturaCalculatedRaw = DecimalDocumentCalculatedBaseSchema.extend({
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor,
  receptor: DecimalReceptorWithIdSchema,
  detalleServicio: z.array(DecimalLineCalculatedSchema).min(1).max(1000),
}).strict();

const decimalTiqueteCalculatedRaw = DecimalDocumentCalculatedBaseSchema.extend({
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor,
  receptor: DecimalReceptorSchema.optional(),
  detalleServicio: z.array(DecimalLineCalculatedSchema).min(1).max(1000),
}).strict();

const decimalNotaCreditoCalculatedRaw = DecimalDocumentCalculatedBaseSchema.extend({
  receptor: DecimalReceptorSchema,
  detalleServicio: z.array(DecimalLineWithTariffCalculatedSchema).min(1).max(1000),
  informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
}).strict();

const decimalNotaDebitoCalculatedRaw = DecimalDocumentCalculatedBaseSchema.extend({
  receptor: DecimalReceptorSchema,
  detalleServicio: z.array(DecimalLineWithTariffCalculatedSchema).min(1).max(1000),
  informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
}).strict();

const decimalFacturaCompraCalculatedRaw = DecimalDocumentCalculatedBaseSchema.extend({
  codigoActividadReceptor: FacturaElectronicaSchema.shape.codigoActividadReceptor.unwrap(),
  receptor: DecimalReceptorWithIdSchema,
  detalleServicio: z.array(DecimalLineCalculatedSchema).min(1).max(1000),
  informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
}).strict();

const decimalFacturaExportacionCalculatedRaw = DecimalDocumentCalculatedBaseSchema.extend({
  codigoActividadEmisor: FacturaElectronicaSchema.shape.codigoActividadEmisor,
  receptor: DecimalReceptorWithIdSchema,
  detalleServicio: z.array(DecimalLineWithTariffCalculatedSchema).min(1).max(1000),
}).strict();

export const DecimalFacturaCalculatedSchema = decimalFacturaCalculatedRaw;
export const DecimalTiqueteCalculatedSchema = decimalTiqueteCalculatedRaw;
export const DecimalNotaCreditoCalculatedSchema = decimalNotaCreditoCalculatedRaw;
export const DecimalNotaDebitoCalculatedSchema = decimalNotaDebitoCalculatedRaw;
export const DecimalFacturaCompraCalculatedSchema = decimalFacturaCompraCalculatedRaw;
export const DecimalFacturaExportacionCalculatedSchema = decimalFacturaExportacionCalculatedRaw;

const decimalRepCalculatedSchema = z
  .object({
    clave: FacturaElectronicaSchema.shape.clave,
    proveedorSistemas: FacturaElectronicaSchema.shape.proveedorSistemas,
    numeroConsecutivo: FacturaElectronicaSchema.shape.numeroConsecutivo,
    fechaEmision: z.string().min(1),
    emisor: DecimalEmisorSchema,
    receptor: DecimalReceptorWithIdSchema,
    condicionVenta: z.union([SaleConditionSchema, z.enum(REP_SALE_CONDITIONS)]),
    detalleServicio: z.array(DecimalRepLineCalculatedSchema).min(1).max(1000),
    resumenFactura: DecimalSummarySchema,
    informacionReferencia: z.array(DecimalReferenceSchema).min(1).max(10),
  })
  .strict();

export const DecimalReciboPagoCalculatedSchema = decimalRepCalculatedSchema;

function withType<T extends z.ZodRawShape, const D extends DecimalDocumentTypeCode>(
  schema: z.ZodObject<T>,
  tipoDocumento: D,
) {
  return schema.extend({ tipoDocumento: z.literal(tipoDocumento) }).strict();
}

export const DecimalFacturaDocumentInputSchema = withType(decimalFacturaRaw, "01").superRefine(
  (input, ctx) => refineStandardSource(input, ctx, "FE"),
);
export const DecimalNotaDebitoDocumentInputSchema = withType(
  decimalNotaDebitoRaw,
  "02",
).superRefine((input, ctx) => refineStandardSource(input, ctx, "ND"));
export const DecimalNotaCreditoDocumentInputSchema = withType(
  decimalNotaCreditoRaw,
  "03",
).superRefine((input, ctx) => refineStandardSource(input, ctx, "NC"));
export const DecimalTiqueteDocumentInputSchema = withType(decimalTiqueteRaw, "04").superRefine(
  (input, ctx) => refineStandardSource(input, ctx, "TE"),
);
export const DecimalFacturaCompraDocumentInputSchema = withType(
  decimalFacturaCompraRaw,
  "08",
).superRefine((input, ctx) => refineStandardSource(input, ctx, "FEC"));
export const DecimalFacturaExportacionDocumentInputSchema = withType(
  decimalFacturaExportacionRaw,
  "09",
).superRefine((input, ctx) => refineStandardSource(input, ctx, "FEE"));
export const DecimalReciboPagoDocumentInputSchema = withType(decimalRepSourceSchema, "10");

export const DecimalDocumentInputSchema = z.discriminatedUnion("tipoDocumento", [
  DecimalFacturaDocumentInputSchema,
  DecimalNotaDebitoDocumentInputSchema,
  DecimalNotaCreditoDocumentInputSchema,
  DecimalTiqueteDocumentInputSchema,
  DecimalFacturaCompraDocumentInputSchema,
  DecimalFacturaExportacionDocumentInputSchema,
  DecimalReciboPagoDocumentInputSchema,
]);

export const DecimalFacturaDocumentCalculatedSchema = withType(decimalFacturaCalculatedRaw, "01");
export const DecimalNotaDebitoDocumentCalculatedSchema = withType(
  decimalNotaDebitoCalculatedRaw,
  "02",
);
export const DecimalNotaCreditoDocumentCalculatedSchema = withType(
  decimalNotaCreditoCalculatedRaw,
  "03",
);
export const DecimalTiqueteDocumentCalculatedSchema = withType(decimalTiqueteCalculatedRaw, "04");
export const DecimalFacturaCompraDocumentCalculatedSchema = withType(
  decimalFacturaCompraCalculatedRaw,
  "08",
);
export const DecimalFacturaExportacionDocumentCalculatedSchema = withType(
  decimalFacturaExportacionCalculatedRaw,
  "09",
);
export const DecimalReciboPagoDocumentCalculatedSchema = withType(decimalRepCalculatedSchema, "10");

export const DecimalDocumentCalculatedSchema = z.discriminatedUnion("tipoDocumento", [
  DecimalFacturaDocumentCalculatedSchema,
  DecimalNotaDebitoDocumentCalculatedSchema,
  DecimalNotaCreditoDocumentCalculatedSchema,
  DecimalTiqueteDocumentCalculatedSchema,
  DecimalFacturaCompraDocumentCalculatedSchema,
  DecimalFacturaExportacionDocumentCalculatedSchema,
  DecimalReciboPagoDocumentCalculatedSchema,
]);

export type DecimalLineInput = z.infer<typeof DecimalLineInputSchema>;
export type DecimalLineWithTariffInput = z.infer<typeof DecimalLineWithTariffInputSchema>;
export type DecimalLineCalculated = z.infer<typeof DecimalLineCalculatedSchema>;
export type DecimalLineWithTariffCalculated = z.infer<typeof DecimalLineWithTariffCalculatedSchema>;
export type DecimalRepLineInput = z.infer<typeof DecimalRepLineInputSchema>;
export type DecimalRepLineCalculated = z.infer<typeof DecimalRepLineCalculatedSchema>;

export type DecimalFacturaInput = z.infer<typeof DecimalFacturaInputSchema>;
export type DecimalTiqueteInput = z.infer<typeof DecimalTiqueteInputSchema>;
export type DecimalNotaCreditoInput = z.infer<typeof DecimalNotaCreditoInputSchema>;
export type DecimalNotaDebitoInput = z.infer<typeof DecimalNotaDebitoInputSchema>;
export type DecimalFacturaCompraInput = z.infer<typeof DecimalFacturaCompraInputSchema>;
export type DecimalFacturaExportacionInput = z.infer<typeof DecimalFacturaExportacionInputSchema>;
export type DecimalReciboPagoInput = z.infer<typeof DecimalReciboPagoInputSchema>;
export type DecimalDocumentInput = z.infer<typeof DecimalDocumentInputSchema>;
export type DecimalFacturaCalculated = z.infer<typeof DecimalFacturaCalculatedSchema>;
export type DecimalTiqueteCalculated = z.infer<typeof DecimalTiqueteCalculatedSchema>;
export type DecimalNotaCreditoCalculated = z.infer<typeof DecimalNotaCreditoCalculatedSchema>;
export type DecimalNotaDebitoCalculated = z.infer<typeof DecimalNotaDebitoCalculatedSchema>;
export type DecimalFacturaCompraCalculated = z.infer<typeof DecimalFacturaCompraCalculatedSchema>;
export type DecimalFacturaExportacionCalculated = z.infer<
  typeof DecimalFacturaExportacionCalculatedSchema
>;
export type DecimalReciboPagoCalculated = z.infer<typeof DecimalReciboPagoCalculatedSchema>;
export type DecimalDocumentCalculated = z.infer<typeof DecimalDocumentCalculatedSchema>;
