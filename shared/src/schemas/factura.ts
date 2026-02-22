/**
 * Zod schema for Factura Electronica (full electronic invoice) input validation.
 */

import { z } from "zod";
import { SaleCondition, PaymentMethod } from "../constants/index.js";
import { EmisorSchema } from "./emisor.js";
import { ReceptorSchema } from "./receptor.js";
import { LineaDetalleSchema } from "./linea-detalle.js";

/** Schema for currency information (CodigoTipoMoneda). */
export const CodigoTipoMonedaSchema = z.object({
  /** ISO 4217 currency code (e.g., "USD", "CRC", "EUR"). */
  codigoMoneda: z.string().length(3),

  /** Exchange rate to CRC. Must be positive. */
  tipoCambio: z.number().positive(),
});

/** Schema for reference to another document (InformacionReferencia). */
export const InformacionReferenciaSchema = z.object({
  /** Referenced document type code. */
  tipoDoc: z.string().regex(/^\d{2}$/),

  /** Referenced document clave or number. Max 50 chars. */
  numero: z.string().min(1).max(50),

  /** Date of the referenced document (ISO 8601). */
  fechaEmision: z.string().min(1),

  /** Reference reason code. */
  codigo: z.enum(["01", "02", "04", "05", "99"]),

  /** Description of the reason. Max 180 chars. */
  razon: z.string().min(1).max(180),
});

/** Schema for other charges (OtrosCargos). */
export const OtroCargoSchema = z.object({
  /** Charge document type. */
  tipoDocumento: z.string().min(1),

  /** Third-party identification number. Optional. */
  numeroIdentidadTercero: z.string().optional(),

  /** Third-party name. Optional, max 100 chars. */
  nombreTercero: z.string().max(100).optional(),

  /** Detail. Max 160 chars. */
  detalle: z.string().min(1).max(160),

  /** Percentage. Optional. */
  porcentaje: z.number().min(0).max(100).optional(),

  /** Charge amount. */
  montoOtroCargo: z.number().min(0),
});

/** Schema for invoice summary (ResumenFactura). */
export const ResumenFacturaSchema = z.object({
  /** Currency information. Optional (defaults to CRC). */
  codigoTipoMoneda: CodigoTipoMonedaSchema.optional(),

  /** Total taxable services. */
  totalServGravados: z.number().min(0),

  /** Total exempt services. */
  totalServExentos: z.number().min(0),

  /** Total exonerated services. Optional. */
  totalServExonerado: z.number().min(0).optional(),

  /** Total taxable merchandise. */
  totalMercanciasGravadas: z.number().min(0),

  /** Total exempt merchandise. */
  totalMercanciasExentas: z.number().min(0),

  /** Total exonerated merchandise. Optional. */
  totalMercExonerada: z.number().min(0).optional(),

  /** Total taxable. */
  totalGravado: z.number().min(0),

  /** Total exempt. */
  totalExento: z.number().min(0),

  /** Total exonerated. Optional. */
  totalExonerado: z.number().min(0).optional(),

  /** Total sales (before tax). */
  totalVenta: z.number().min(0),

  /** Total discounts. */
  totalDescuentos: z.number().min(0),

  /** Net sales (totalVenta - totalDescuentos). */
  totalVentaNeta: z.number().min(0),

  /** Total IVA tax. */
  totalImpuesto: z.number().min(0),

  /** Total IVA returned. Optional. */
  totalIVADevuelto: z.number().min(0).optional(),

  /** Total other charges. Optional. */
  totalOtrosCargos: z.number().min(0).optional(),

  /** Grand total. */
  totalComprobante: z.number().min(0),
});

/** Schema for additional content (Otros). */
export const OtroContenidoSchema = z.object({
  contenido: z.string().min(1),
});

/** Sale condition enum values for schema. */
const SaleConditionValues = [
  SaleCondition.CONTADO,
  SaleCondition.CREDITO,
  SaleCondition.CONSIGNACION,
  SaleCondition.APARTADO,
  SaleCondition.ARRENDAMIENTO_OPCION_COMPRA,
  SaleCondition.ARRENDAMIENTO_FUNCION_FINANCIERA,
  SaleCondition.COBRO_FAVOR_TERCERO,
  SaleCondition.SERVICIOS_ESTADO_CREDITO,
  SaleCondition.PAGO_SERVICIO_ESTADO,
  SaleCondition.OTROS,
] as const;

/** Payment method enum values for schema. */
const PaymentMethodValues = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.TARJETA,
  PaymentMethod.CHEQUE,
  PaymentMethod.TRANSFERENCIA,
  PaymentMethod.RECAUDADO_TERCEROS,
  PaymentMethod.OTROS,
] as const;

/** Schema for a full Factura Electronica input. */
export const FacturaElectronicaSchema = z.object({
  /** 50-digit clave numerica. */
  clave: z
    .string()
    .length(50)
    .regex(/^\d{50}$/),

  /** CABYS activity code. */
  codigoActividad: z.string().regex(/^\d{6}$/, "Activity code must be 6 digits"),

  /** Sequential document number (20 chars). */
  numeroConsecutivo: z
    .string()
    .length(20)
    .regex(/^\d{20}$/),

  /** Emission date (ISO 8601 with timezone). */
  fechaEmision: z.string().min(1),

  /** Issuer information. */
  emisor: EmisorSchema,

  /** Receiver information. Required for Factura. */
  receptor: ReceptorSchema,

  /** Sale condition. */
  condicionVenta: z.enum(SaleConditionValues),

  /** Credit term in days. Required when condicionVenta is "02". */
  plazoCredito: z.string().optional(),

  /** Payment methods. At least one required. */
  medioPago: z.array(z.enum(PaymentMethodValues)).min(1),

  /** Line items. At least one required. */
  detalleServicio: z.array(LineaDetalleSchema).min(1),

  /** Other charges. Optional. */
  otrosCargos: z.array(OtroCargoSchema).optional(),

  /** Invoice summary / totals. */
  resumenFactura: ResumenFacturaSchema,

  /** References to other documents. Optional. */
  informacionReferencia: z.array(InformacionReferenciaSchema).optional(),

  /** Additional content. Optional. */
  otros: z.array(OtroContenidoSchema).optional(),
});

export type FacturaElectronicaInput = z.infer<typeof FacturaElectronicaSchema>;
