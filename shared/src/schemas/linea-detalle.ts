/**
 * Zod schema for LineaDetalle (line item) validation, per the v4.4 XSD.
 */

import { z } from "zod";
import {
  TaxCode,
  IvaRateCode,
  ExonerationType,
  DISCOUNT_CODES,
  EXONERATION_INSTITUTIONS,
  UNITS_OF_MEASURE,
} from "../constants/index.js";

/** Schema for commercial code (CodigoComercial). */
export const CodigoComercialSchema = z.object({
  /** Code type: 01=Seller, 02=Buyer, 03=Industry, 04=Internal, 99=Other. */
  tipo: z.enum(["01", "02", "03", "04", "99"]),

  /** Product/service code value. Max 20 chars. */
  codigo: z.string().min(1).max(20),
});

export type CodigoComercialInput = z.infer<typeof CodigoComercialSchema>;

/** Schema for exoneration information (v4.4 structure). */
export const ExoneracionSchema = z.object({
  /** Exoneration document type (TipoDocumentoEX1). */
  tipoDocumento: z.enum([
    ExonerationType.COMPRAS_AUTORIZADAS,
    ExonerationType.VENTAS_EXENTAS_DIPLOMATICOS,
    ExonerationType.AUTORIZADO_LEY_ESPECIAL,
    ExonerationType.EXENCIONES_DGH,
    ExonerationType.TRANSITORIO_V,
    ExonerationType.TRANSITORIO_IX,
    ExonerationType.TRANSITORIO_XVII,
    ExonerationType.ZONA_FRANCA,
    ExonerationType.SERVICIOS_COMPLEMENTARIOS_EXPORTACION,
    ExonerationType.CORPORACIONES_MUNICIPALES,
    ExonerationType.DGH_IMPUESTO_LOCAL_CONCRETA,
    ExonerationType.EXONERACION_12,
    ExonerationType.OTROS,
  ]),

  /** Free-text document type. Required when tipoDocumento is "99". */
  tipoDocumentoOtros: z.string().min(5).max(100).optional(),

  /** Exoneration document number. 3-40 chars. */
  numeroDocumento: z.string().min(3).max(40),

  /** Law article number. Optional, up to 6 digits. */
  articulo: z.number().int().min(0).max(999999).optional(),

  /** Law clause (inciso) number. Optional, up to 6 digits. */
  inciso: z.number().int().min(0).max(999999).optional(),

  /** Issuing institution code (coded in v4.4). */
  nombreInstitucion: z.enum(EXONERATION_INSTITUTIONS),

  /** Free-text institution name. Required when nombreInstitucion is "99". */
  nombreInstitucionOtros: z.string().min(5).max(160).optional(),

  /** Issue date (ISO 8601) — emitted as FechaEmisionEX. */
  fechaEmision: z.string().min(1),

  /** Exonerated rate percentage (0-100) — emitted as TarifaExonerada. */
  tarifaExonerada: z.number().min(0).max(100),

  /** Exonerated tax amount. */
  montoExoneracion: z.number().min(0),
});

export type ExoneracionInput = z.infer<typeof ExoneracionSchema>;

/** Schema for tax (Impuesto), per the v4.4 XSD. */
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

  /** Free-text tax type. Required when codigo is "99" (5-100 chars). */
  codigoImpuestoOtros: z.string().min(5).max(100).optional(),

  /** IVA rate code (CodigoTarifaIVA). Required when tax code is IVA-related. */
  codigoTarifaIVA: z
    .enum([
      IvaRateCode.EXENTO,
      IvaRateCode.REDUCIDA_1,
      IvaRateCode.REDUCIDA_2,
      IvaRateCode.REDUCIDA_4,
      IvaRateCode.TRANSITORIO_0,
      IvaRateCode.TRANSITORIO_4,
      IvaRateCode.TRANSITORIO_8,
      IvaRateCode.GENERAL_13,
      IvaRateCode.REDUCIDA_0_5,
      IvaRateCode.TARIFA_EXENTA,
      IvaRateCode.CERO_SIN_CREDITO,
    ])
    .optional(),

  /** Tax rate percentage. Optional for non-rate taxes. */
  tarifa: z.number().min(0).max(99.99).optional(),

  /** Calculation factor for the used-goods IVA regime (code 08). */
  factorCalculoIVA: z.number().min(0).max(9.9999).optional(),

  /** Tax amount (Monto). */
  monto: z.number().min(0),

  /** Exoneration information. Optional. */
  exoneracion: ExoneracionSchema.optional(),
});

export type ImpuestoInput = z.infer<typeof ImpuestoSchema>;

/** Schema for discount (Descuento), per the v4.4 XSD. */
export const DescuentoSchema = z.object({
  /** Discount amount. Must be positive. */
  montoDescuento: z.number().positive(),

  /** Discount code (CodigoDescuento). Required in v4.4. */
  codigoDescuento: z.enum(DISCOUNT_CODES),

  /** Free-text discount type. Required when codigoDescuento is "99". */
  codigoDescuentoOtros: z.string().min(5).max(100).optional(),

  /** Reason for discount. Optional in v4.4, 3-80 chars. */
  naturalezaDescuento: z.string().min(3).max(80).optional(),
});

export type DescuentoInput = z.infer<typeof DescuentoSchema>;

/** Schema for a single line item (LineaDetalle), per the v4.4 XSD. */
export const LineaDetalleSchema = z.object({
  /** Line number (1-based, sequential). */
  numeroLinea: z.number().int().positive(),

  /** Customs tariff heading. Optional (NC/ND/FEE only), max 15 chars. */
  partidaArancelaria: z.string().max(15).optional(),

  /** CABYS code — 13 digits, emitted as CodigoCABYS. */
  codigoCabys: z.string().regex(/^\d{13}$/, "CABYS code must be exactly 13 digits"),

  /** Commercial codes. Optional, max 5. */
  codigoComercial: z.array(CodigoComercialSchema).max(5).optional(),

  /** Quantity. Must be positive. */
  cantidad: z.number().positive(),

  /** Unit of measure (official v4.4 catalog value). */
  unidadMedida: z.enum(UNITS_OF_MEASURE),

  /** Transaction type code (TipoTransaccion, 01-13). Optional, v4.4. */
  tipoTransaccion: z
    .enum(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"])
    .optional(),

  /** Commercial unit of measure. Optional, max 20 chars. */
  unidadMedidaComercial: z.string().max(20).optional(),

  /** Item description. 3-200 chars per the XSD. */
  detalle: z.string().min(3).max(200),

  /** VIN or serial numbers. Optional, max 17 chars each. */
  numeroVINoSerie: z.array(z.string().min(1).max(17)).optional(),

  /** Unit price (before taxes and discounts). */
  precioUnitario: z.number().min(0),

  /** Total line amount (cantidad * precioUnitario). */
  montoTotal: z.number().min(0),

  /** Discounts applied. Optional, max 5. */
  descuento: z.array(DescuentoSchema).max(5).optional(),

  /** Subtotal after discounts. */
  subTotal: z.number().min(0),

  /** Base taxable amount. Defaults to subTotal at emission when omitted. */
  baseImponible: z.number().min(0).optional(),

  /** Taxes applied to this line item. v4.4 requires at least one. */
  impuesto: z.array(ImpuestoSchema).min(1),

  /** Tax assumed by issuer/factory. Optional (emitted as 0 when required). */
  impuestoAsumidoEmisorFabrica: z.number().min(0).optional(),

  /** Net tax amount. Optional (emitted as 0 when required). */
  impuestoNeto: z.number().min(0).optional(),

  /** Total line amount including taxes. */
  montoTotalLinea: z.number().min(0),
});

export type LineaDetalleInput = z.infer<typeof LineaDetalleSchema>;
