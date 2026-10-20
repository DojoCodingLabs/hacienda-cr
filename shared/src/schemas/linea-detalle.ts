/**
 * Zod schema for LineaDetalle (line item) validation, per the v4.4 XSD.
 */

import { z } from "zod";
import { DISCOUNT_CODES, EXONERATION_INSTITUTIONS, UNITS_OF_MEASURE } from "../constants/index.js";
import { TaxCodeSchema, IvaRateCodeSchema, ExonerationTypeSchema } from "./common.js";

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
  tipoDocumento: ExonerationTypeSchema,

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

/** Decimal constraints for the specific-tax fields in the official XSD. */
function decimal(digits: number, scale: number) {
  return z
    .number()
    .finite()
    .min(0)
    .refine((value) => {
      if (value >= 10 ** digits || Number(value.toFixed(scale)) !== value) return false;
      const [integer = "", fraction = ""] = value.toFixed(scale).split(".");
      const count = integer.replace(/^0+/, "").length + fraction.replace(/0+$/, "").length;
      return count <= digits;
    }, `Expected at most ${digits} total digits and ${scale} decimal places`);
}
export const DatosImpuestoEspecificoSchema = z.object({
  cantidadUnidadMedida: decimal(7, 2),
  porcentaje: decimal(4, 2).optional(),
  proporcion: decimal(10, 5).optional(),
  volumenUnidadConsumo: decimal(7, 2).optional(),
  impuestoUnidad: decimal(18, 5),
});

/** Schema for tax (Impuesto), per the v4.4 XSD. */
export const ImpuestoSchema = z
  .object({
    /** Tax type code. */
    codigo: TaxCodeSchema,

    /** Free-text tax type. Required when codigo is "99" (5-100 chars). */
    codigoImpuestoOtros: z.string().min(5).max(100).optional(),

    /** IVA rate code (CodigoTarifaIVA). Required when tax code is IVA-related. */
    codigoTarifaIVA: IvaRateCodeSchema.optional(),

    /** Tax rate percentage. Optional for non-rate taxes. */
    tarifa: z.number().min(0).max(99.99).optional(),

    /** Calculation factor for the used-goods IVA regime (code 08). */
    factorCalculoIVA: z.number().min(0).max(9.9999).optional(),

    datosImpuestoEspecifico: DatosImpuestoEspecificoSchema.optional(),

    /** Tax amount (Monto). */
    monto: z.number().min(0),

    /** Exoneration information. Optional. */
    exoneracion: ExoneracionSchema.optional(),
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
