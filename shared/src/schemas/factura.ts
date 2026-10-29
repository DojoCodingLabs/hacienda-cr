/**
 * Zod schema for Factura Electronica (full electronic invoice) input
 * validation, per the v4.4 XSD.
 */

import { z } from "zod";
import { REFERENCE_CODES, REFERENCE_DOC_TYPES, REP_REFERENCE_CODES } from "../constants/index.js";
import { CURRENCY_CODES, OTHER_CHARGE_TYPES } from "../generated/index.js";
import {
  TaxCodeSchema,
  IvaRateCodeSchema,
  PaymentMethodSchema,
  SaleConditionSchema,
} from "./common.js";
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
export const InformacionReferenciaObject = z
  .object({
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
  })
  .strict();

/**
 * Conditional reference rules (v4.4 XSD):
 * - tipoDoc === "99"  ⇔  tipoDocOtros required (5-100 chars).
 * - codigo === "99"   ⇔  codigoOtros required (5-100 chars).
 *
 * `codigo` is optional for every `tipoDoc` (XSD: `Codigo minOccurs="0"`).
 * The Anexos 2026 and the vendored XSD do not document a conditional
 * obligation for `codigo`; the rule that made it mandatory except for
 * `tipoDoc === "13"` (facturación mes vencido) was removed because it
 * over-restricted documents valid under the XSD oracle.
 *
 * The parameter type is intentionally wide (`codigo?: string`) so the same
 * refinement can be shared by the base schema (`ReferenceCode`, no "17")
 * and the REP variant (`RepReferenceCode`, includes "17").
 */
interface RefineReferenceInput {
  tipoDoc?: string;
  tipoDocOtros?: string | undefined;
  numero?: string | undefined;
  fechaEmision: string;
  codigo?: string | undefined;
  codigoOtros?: string | undefined;
  razon?: string | undefined;
}

function refineReferenceConditions(ref: RefineReferenceInput, ctx: z.RefinementCtx): void {
  if (ref.tipoDoc === "99" && ref.tipoDocOtros === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["tipoDocOtros"],
      message: "tipoDocOtros is required when tipoDoc is 99",
    });
  }
  if (ref.tipoDocOtros !== undefined && ref.tipoDoc !== "99") {
    ctx.addIssue({
      code: "custom",
      path: ["tipoDocOtros"],
      message: "tipoDocOtros is only allowed when tipoDoc is 99",
    });
  }
  if (ref.codigo === "99" && ref.codigoOtros === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["codigoOtros"],
      message: "codigoOtros is required when codigo is 99",
    });
  }
  if (ref.codigoOtros !== undefined && ref.codigo !== "99") {
    ctx.addIssue({
      code: "custom",
      path: ["codigoOtros"],
      message: "codigoOtros is only allowed when codigo is 99",
    });
  }
}

/** Schema for reference to another document (InformacionReferencia), v4.4. */
export const InformacionReferenciaSchema =
  InformacionReferenciaObject.superRefine(refineReferenceConditions);

/** Variant of the reference schema accepted by the Recibo Electronico de Pago XSD.
 *
 * The REP XSD admits all `TipoDocReferenciaType` values (shared with the base)
 * and its `CodigoReferenciaType` additionally admits code "17" (pago de comprobante).
 * `codigo` is optional here as in the base (XSD: `Codigo minOccurs="0"`).
 */
export const RepInformacionReferenciaSchema = z
  .object({
    /** Referenced document type code (TipoDocIR). */
    tipoDoc: z.enum(REFERENCE_DOC_TYPES),

    /** Free-text document type. Required when tipoDoc is "99" (5-100 chars). */
    tipoDocOtros: z.string().min(5).max(100).optional(),

    /** Referenced document clave or number. Optional, max 50 chars. */
    numero: z.string().min(1).max(50).optional(),

    /** Date of the referenced document (ISO 8601) — emitted as FechaEmisionIR. */
    fechaEmision: z.string().min(1),

    /** Reference reason code. Optional in v4.4; "17" only valid for REP. */
    codigo: z.enum(REP_REFERENCE_CODES).optional(),

    /** Free-text reason code. Required when codigo is "99" (5-100 chars). */
    codigoOtros: z.string().min(5).max(100).optional(),

    /** Description of the reason. Optional, max 180 chars. */
    razon: z.string().min(1).max(180).optional(),
  })
  .strict()
  .superRefine(refineReferenceConditions);

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

/** Schema for a payment-method entry inside ResumenFactura (v4.4). */
export const MedioPagoSchema = z.object({
  /** Payment method code (TipoMedioPago). */
  tipoMedioPago: PaymentMethodSchema,

  /** Free-text payment method. Required when tipo is "99" (3-100 chars). */
  medioPagoOtros: z.string().min(3).max(100).optional(),

  /** Amount paid with this method (TotalMedioPago). */
  totalMedioPago: z.number().min(0),
});

/** Schema for a per-tax-code total breakdown entry (v4.4). */
export const TotalDesgloseImpuestoSchema = z.object({
  /** Tax type code. */
  codigo: TaxCodeSchema,

  /** IVA rate code. Optional. */
  codigoTarifaIVA: IvaRateCodeSchema.optional(),

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

/** Schema for a full Factura Electronica input, per the v4.4 XSD. */
export const FacturaElectronicaSchema = z.object({
  /** 50-character clave (taxpayer segment alphanumeric since April 2026). */
  clave: z
    .string()
    .length(50)
    .regex(/^\d{9}[A-Za-z0-9]{12}\d{29}$/),

  /** Invoicing-system provider identification (ProveedorSistemas). */
  proveedorSistemas: z.string().min(1).max(20),

  /** Issuer economic activity code (6 digits). */
  codigoActividadEmisor: z
    .string()
    .regex(
      /^(?:\d{6}|\d{4}\.\d)$/,
      "Activity code must be six digits or the issued CIIU4 format ####.#",
    ),

  /** Receiver economic activity code (6 digits). Optional. */
  codigoActividadReceptor: z
    .string()
    .regex(
      /^(?:\d{6}|\d{4}\.\d)$/,
      "Activity code must be six digits or the issued CIIU4 format ####.#",
    )
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

  /** Sale condition (v4.4 set — REP-only payment codes excluded). */
  condicionVenta: SaleConditionSchema,

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
