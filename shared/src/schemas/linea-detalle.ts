/**
 * Zod schema for LineaDetalle (line item) validation.
 */

import { z } from "zod";
import { TaxCode, IvaRateCode, ExonerationType } from "../constants/index.js";

/** Schema for commercial code (CodigoComercial). */
export const CodigoComercialSchema = z.object({
  /** Code type: 01=Seller, 02=Buyer, 03=Industry, 04=Internal, 99=Other. */
  tipo: z.enum(["01", "02", "03", "04", "99"]),

  /** Product/service code value. Max 20 chars. */
  codigo: z.string().min(1).max(20),
});

export type CodigoComercialInput = z.infer<typeof CodigoComercialSchema>;

/** Schema for exoneration information. */
export const ExoneracionSchema = z.object({
  /** Exoneration document type. */
  tipoDocumento: z.enum([
    ExonerationType.COMPRAS_AUTORIZADAS,
    ExonerationType.VENTAS_EXENTAS_DIPLOMATICOS,
    ExonerationType.AUTORIZADO_LEY_ESPECIAL,
    ExonerationType.EXENCIONES_DGH,
    ExonerationType.TRANSITORIO_V,
    ExonerationType.TRANSITORIO_IX,
    ExonerationType.TRANSITORIO_XVII,
    ExonerationType.OTROS,
  ]),

  /** Exoneration document number. Max 40 chars. */
  numeroDocumento: z.string().min(1).max(40),

  /** Issuing institution name. Max 160 chars. */
  nombreInstitucion: z.string().min(1).max(160),

  /** Issue date (ISO 8601). */
  fechaEmision: z.string().min(1),

  /** Exoneration percentage (0-100). */
  porcentajeExoneracion: z.number().min(0).max(100),

  /** Exonerated tax amount. */
  montoExoneracion: z.number().min(0),
});

export type ExoneracionInput = z.infer<typeof ExoneracionSchema>;

/** Schema for tax (Impuesto). */
export const ImpuestoSchema = z.object({
  /** Tax type code. */
  codigo: z.enum([
    TaxCode.IVA,
    TaxCode.IMPUESTO_SELECTIVO_CONSUMO,
    TaxCode.IMPUESTO_UNICO_COMBUSTIBLES,
    TaxCode.IMPUESTO_BEBIDAS_ALCOHOLICAS,
    TaxCode.IMPUESTO_BEBIDAS_SIN_ALCOHOL,
    TaxCode.IMPUESTO_TABACO,
    TaxCode.IVA_CALCULO_ESPECIAL,
    TaxCode.IVA_BIENES_USADOS,
    TaxCode.IMPUESTO_CEMENTO,
    TaxCode.OTROS,
  ]),

  /** IVA rate code. Required when tax code is IVA-related. */
  codigoTarifa: z
    .enum([
      IvaRateCode.EXENTO,
      IvaRateCode.REDUCIDA_1,
      IvaRateCode.REDUCIDA_2,
      IvaRateCode.REDUCIDA_4,
      IvaRateCode.TRANSITORIO_0,
      IvaRateCode.TRANSITORIO_4,
      IvaRateCode.TRANSITORIO_8,
      IvaRateCode.GENERAL_13,
    ])
    .optional(),

  /** Tax rate percentage. */
  tarifa: z.number().min(0),

  /** Tax amount. */
  monto: z.number().min(0),

  /** Exoneration information. Optional. */
  exoneracion: ExoneracionSchema.optional(),
});

export type ImpuestoInput = z.infer<typeof ImpuestoSchema>;

/** Schema for discount (Descuento). */
export const DescuentoSchema = z.object({
  /** Discount amount. Must be positive. */
  montoDescuento: z.number().positive(),

  /** Reason for discount. Max 80 chars. */
  naturalezaDescuento: z.string().min(1).max(80),
});

export type DescuentoInput = z.infer<typeof DescuentoSchema>;

/** Schema for a single line item (LineaDetalle). */
export const LineaDetalleSchema = z.object({
  /** Line number (1-based, sequential). */
  numeroLinea: z.number().int().positive(),

  /** CABYS code — 13 digits, required in v4.4. */
  codigoCabys: z.string().regex(/^\d{13}$/, "CABYS code must be exactly 13 digits"),

  /** Commercial codes. Optional. */
  codigoComercial: z.array(CodigoComercialSchema).optional(),

  /** Quantity. Must be positive. */
  cantidad: z.number().positive(),

  /** Unit of measure. */
  unidadMedida: z.string().min(1).max(20),

  /** Item description. Max 200 chars. */
  detalle: z.string().min(1).max(200),

  /** Unit price (before taxes and discounts). */
  precioUnitario: z.number().min(0),

  /** Total line amount (cantidad * precioUnitario). */
  montoTotal: z.number().min(0),

  /** Discounts applied. Optional. */
  descuento: z.array(DescuentoSchema).optional(),

  /** Subtotal after discounts. */
  subTotal: z.number().min(0),

  /** Base taxable amount. Optional. */
  baseImponible: z.number().min(0).optional(),

  /** Taxes applied to this line item. Optional. */
  impuesto: z.array(ImpuestoSchema).optional(),

  /** Net IVA tax amount. Optional. */
  impuestoNeto: z.number().min(0).optional(),

  /** Total line amount including taxes. */
  montoTotalLinea: z.number().min(0),
});

export type LineaDetalleInput = z.infer<typeof LineaDetalleSchema>;
