/**
 * Zod schema for Factura Electronica (full electronic invoice) input
 * validation, per the v4.4 XSD.
 */

import { z } from "zod";
import {
  SaleCondition,
  PaymentMethod,
  TaxCode,
  IvaRateCode,
  REFERENCE_DOC_TYPES,
  REFERENCE_CODES,
  OTHER_CHARGE_TYPES,
  CURRENCY_CODES,
} from "../constants/index.js";
import { EmisorSchema } from "./emisor.js";
import { ReceptorSchema } from "./receptor.js";
import { IdentificacionSchema } from "./identification.js";
import { LineaDetalleSchema } from "./linea-detalle.js";

/** Schema for currency information (CodigoTipoMoneda). */
export const CodigoTipoMonedaSchema = z.object({
  /** ISO 4217 currency code (official v4.4 catalog). */
  codigoMoneda: z.enum(CURRENCY_CODES),

  /** Exchange rate to CRC. Must be positive. */
  tipoCambio: z.number().positive(),
});

/** Schema for reference to another document (InformacionReferencia), v4.4. */
export const InformacionReferenciaSchema = z.object({
  /** Referenced document type code (TipoDocIR). */
  tipoDoc: z.enum(REFERENCE_DOC_TYPES),

  /** Free-text document type. Required when tipoDoc is "99" (5-100 chars). */
  tipoDocOtros: z.string().min(5).max(100).optional(),

  /** Referenced document clave or number. Optional, max 50 chars. */
  numero: z.string().min(1).max(50).optional(),

  /** Date of the referenced document (ISO 8601) — emitted as FechaEmisionIR. */
  fechaEmision: z.string().min(1),

  /** Reference reason code. Optional in v4.4. */
  codigo: z.enum(REFERENCE_CODES).optional(),

  /** Free-text reason code. Required when codigo is "99" (5-100 chars). */
  codigoOtros: z.string().min(5).max(100).optional(),

  /** Description of the reason. Optional, max 180 chars. */
  razon: z.string().min(1).max(180).optional(),
});

/** Schema for other charges (OtrosCargos), v4.4. */
export const OtroCargoSchema = z.object({
  /** Charge document type (TipoDocumentoOC). */
  tipoDocumento: z.enum(OTHER_CHARGE_TYPES),

  /** Free-text charge type. Required when tipoDocumento is "99" (5-100 chars). */
  tipoDocumentoOtros: z.string().min(5).max(100).optional(),

  /** Third-party identification. Optional. */
  identificacionTercero: IdentificacionSchema.optional(),

  /** Third-party name. Optional, 5-100 chars. */
  nombreTercero: z.string().min(5).max(100).optional(),

  /** Detail. Max 160 chars. */
  detalle: z.string().min(1).max(160),

  /** Percentage (PorcentajeOC). Optional. */
  porcentaje: z.number().min(0).max(100).optional(),

  /** Charge amount (MontoCargo). */
  montoCargo: z.number().min(0),
});

/** Payment method values accepted by the v4.4 XSD. */
const PaymentMethodValues = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.TARJETA,
  PaymentMethod.CHEQUE,
  PaymentMethod.TRANSFERENCIA,
  PaymentMethod.RECAUDADO_TERCEROS,
  PaymentMethod.SINPE_MOVIL,
  PaymentMethod.PLATAFORMA_DIGITAL,
  PaymentMethod.OTROS,
] as const;

/** Schema for a payment-method entry inside ResumenFactura (v4.4). */
export const MedioPagoSchema = z.object({
  /** Payment method code (TipoMedioPago). */
  tipoMedioPago: z.enum(PaymentMethodValues),

  /** Free-text payment method. Required when tipo is "99" (3-100 chars). */
  medioPagoOtros: z.string().min(3).max(100).optional(),

  /** Amount paid with this method (TotalMedioPago). */
  totalMedioPago: z.number().min(0),
});

/** Schema for a per-tax-code total breakdown entry (v4.4). */
export const TotalDesgloseImpuestoSchema = z.object({
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

  /** IVA rate code. Optional. */
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

  /** Total tax amount for this (code, rate) pair. */
  totalMontoImpuesto: z.number().min(0),
});

/** Schema for invoice summary (ResumenFactura), v4.4. */
export const ResumenFacturaSchema = z.object({
  /** Currency information. Optional in input (builders default to CRC / 1). */
  codigoTipoMoneda: CodigoTipoMonedaSchema.optional(),

  /** Total taxable services. */
  totalServGravados: z.number().min(0).optional(),

  /** Total exempt services. */
  totalServExentos: z.number().min(0).optional(),

  /** Total exonerated services. */
  totalServExonerado: z.number().min(0).optional(),

  /** Total non-subject services (v4.4). */
  totalServNoSujeto: z.number().min(0).optional(),

  /** Total taxable merchandise. */
  totalMercanciasGravadas: z.number().min(0).optional(),

  /** Total exempt merchandise. */
  totalMercanciasExentas: z.number().min(0).optional(),

  /** Total exonerated merchandise. */
  totalMercExonerada: z.number().min(0).optional(),

  /** Total non-subject merchandise (v4.4). */
  totalMercNoSujeta: z.number().min(0).optional(),

  /** Total taxable. */
  totalGravado: z.number().min(0).optional(),

  /** Total exempt. */
  totalExento: z.number().min(0).optional(),

  /** Total exonerated. */
  totalExonerado: z.number().min(0).optional(),

  /** Total non-subject (v4.4). */
  totalNoSujeto: z.number().min(0).optional(),

  /** Total sales (before tax). */
  totalVenta: z.number().min(0),

  /** Total discounts. */
  totalDescuentos: z.number().min(0).optional(),

  /** Net sales (totalVenta - totalDescuentos). */
  totalVentaNeta: z.number().min(0),

  /** Per-tax-code totals breakdown (v4.4). Optional. */
  totalDesgloseImpuesto: z.array(TotalDesgloseImpuestoSchema).optional(),

  /** Total tax. */
  totalImpuesto: z.number().min(0).optional(),

  /** Total tax assumed by issuer/factory (v4.4). */
  totalImpAsumEmisorFabrica: z.number().min(0).optional(),

  /** Total IVA returned. Optional. */
  totalIVADevuelto: z.number().min(0).optional(),

  /** Total other charges. Optional. */
  totalOtrosCargos: z.number().min(0).optional(),

  /** Payment methods with amounts (v4.4). Up to 4 entries. */
  medioPago: z.array(MedioPagoSchema).min(1).max(4).optional(),

  /** Grand total. */
  totalComprobante: z.number().min(0),
});

/** Schema for additional content (Otros). */
export const OtroContenidoSchema = z.object({
  contenido: z.string().min(1),
});

/** Sale condition enum values for schema (v4.4 set). */
const SaleConditionValues = [
  SaleCondition.CONTADO,
  SaleCondition.CREDITO,
  SaleCondition.CONSIGNACION,
  SaleCondition.APARTADO,
  SaleCondition.ARRENDAMIENTO_OPCION_COMPRA,
  SaleCondition.ARRENDAMIENTO_FUNCION_FINANCIERA,
  SaleCondition.COBRO_FAVOR_TERCERO,
  SaleCondition.SERVICIOS_ESTADO,
  SaleCondition.VENTA_CREDITO_IVA_90_DIAS,
  SaleCondition.VENTA_MERCANCIA_NO_NACIONALIZADA,
  SaleCondition.VENTA_BIENES_USADOS_NO_CONTRIBUYENTE,
  SaleCondition.ARRENDAMIENTO_OPERATIVO,
  SaleCondition.ARRENDAMIENTO_FINANCIERO,
  SaleCondition.OTROS,
] as const;

/** Schema for a full Factura Electronica input, per the v4.4 XSD. */
export const FacturaElectronicaSchema = z.object({
  /** 50-digit clave numerica. */
  clave: z
    .string()
    .length(50)
    .regex(/^\d{50}$/),

  /** Invoicing-system provider identification (ProveedorSistemas). */
  proveedorSistemas: z.string().min(1).max(20),

  /** Issuer economic activity code (6 digits). */
  codigoActividadEmisor: z.string().regex(/^\d{6}$/, "Activity code must be 6 digits"),

  /** Receiver economic activity code (6 digits). Optional. */
  codigoActividadReceptor: z
    .string()
    .regex(/^\d{6}$/, "Activity code must be 6 digits")
    .optional(),

  /** Sequential document number (20 chars). */
  numeroConsecutivo: z
    .string()
    .length(20)
    .regex(/^\d{20}$/),

  /** Emission date (ISO 8601 with timezone). */
  fechaEmision: z.string().min(1),

  /** Issuer information. */
  emisor: EmisorSchema,

  /** Receiver information. Required for Factura (with identification). */
  receptor: ReceptorSchema.refine((r) => r.identificacion !== undefined, {
    message: "Receptor identification is required for Factura Electronica",
    path: ["identificacion"],
  }),

  /** Sale condition. */
  condicionVenta: z.enum(SaleConditionValues),

  /** Free-text sale condition. Required when condicionVenta is "99" (5-100 chars). */
  condicionVentaOtros: z.string().min(5).max(100).optional(),

  /** Credit term in days. Required when condicionVenta is "02". */
  plazoCredito: z.string().optional(),

  /** Line items. At least one required, max 1000. */
  detalleServicio: z.array(LineaDetalleSchema).min(1).max(1000),

  /** Other charges. Optional, max 15. */
  otrosCargos: z.array(OtroCargoSchema).max(15).optional(),

  /** Invoice summary / totals. */
  resumenFactura: ResumenFacturaSchema,

  /** References to other documents. Optional, max 10. */
  informacionReferencia: z.array(InformacionReferenciaSchema).max(10).optional(),

  /** Additional content. Optional. */
  otros: z.array(OtroContenidoSchema).optional(),
});

export type FacturaElectronicaInput = z.infer<typeof FacturaElectronicaSchema>;
