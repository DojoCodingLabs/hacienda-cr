/** Additive ordinary FE decimal-text contract. Legacy number APIs are unchanged.
 * Bounds derive from vendored 2026/v4.4 FacturaElectronica XSD: money18/5,
 * max9999999999999.99999; quantity16/3. No coercion or silent unknown-key loss. */
import { z } from "zod";
import { FacturaElectronicaSchema, MedioPagoSchema } from "./factura.js";
import { CodigoComercialSchema, DescuentoSchema, LineaDetalleSchema } from "./linea-detalle.js";
import { EmisorSchema } from "./emisor.js";
import { ReceptorSchema } from "./receptor.js";
import { IdentificacionSchema } from "./identification.js";
import { UbicacionSchema, TelefonoSchema } from "./common.js";
import { CURRENCY_CODES } from "../constants/index.js";

export const ExactMoneySchema = z.string().regex(/^(?:0|[1-9]\d{0,12})(?:\.\d{1,5})?$/);
export const ExactQuantitySchema = z
  .string()
  .max(20)
  .regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,3})?$/)
  .refine((v) => {
    if (v.length > 20 || !/^(?:0|[1-9]\d{0,15})(?:\.\d{1,3})?$/.test(v)) return false;
    const [whole = "", fraction = ""] = v.split(".");
    return (
      BigInt(whole + fraction) > 0n &&
      (whole.replace(/^0+/, "") + fraction.replace(/0+$/, "")).length <= 16
    );
  }, "Quantity must be positive with at most16 significant decimal digits and3 fractional digits");
const PercentageSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,2})(?:\.\d{1,5})?$/)
  .refine((v) => {
    if (!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,5})?$/.test(v)) return false;
    const [w = "", f = ""] = v.split(".");
    const n = BigInt(w) * 100000n + BigInt(f.padEnd(5, "0"));
    return n > 0n && n <= 10000000n;
  }, "Discount percentage must be greater than0 and at most100");
const discountMetadata = DescuentoSchema.pick({
  codigoDescuento: true,
  codigoDescuentoOtros: true,
  naturalezaDescuento: true,
}).strict();
const discountCompanion = (
  d: { codigoDescuento: string; codigoDescuentoOtros?: string },
  ctx: z.RefinementCtx,
) => {
  if (d.codigoDescuento === "99" && !d.codigoDescuentoOtros)
    ctx.addIssue({
      code: "custom",
      path: ["codigoDescuentoOtros"],
      message: "Explicit other-discount text required",
    });
};
export const ExactDiscountInputSchema = z
  .union([
    discountMetadata
      .extend({
        montoDescuento: ExactMoneySchema.refine(
          (v) => /[1-9]/.test(v),
          "Discount must be positive",
        ),
      })
      .strict(),
    discountMetadata.extend({ porcentaje: PercentageSchema }).strict(),
  ])
  .superRefine(discountCompanion);
export const ExactDiscountSchema = discountMetadata
  .extend({ montoDescuento: ExactMoneySchema })
  .strict()
  .superRefine(discountCompanion);
export const ExactFeLineInputSchema = LineaDetalleSchema.pick({
  numeroLinea: true,
  codigoCabys: true,
  unidadMedida: true,
  tipoTransaccion: true,
  unidadMedidaComercial: true,
  detalle: true,
})
  .extend({
    cantidad: ExactQuantitySchema,
    precioUnitario: ExactMoneySchema,
    codigoComercial: z.array(CodigoComercialSchema.strict()).max(5).optional(),
    descuento: z.array(ExactDiscountInputSchema).min(1).max(5).optional(),
    impuesto: z.tuple([
      z
        .object({
          codigo: z.literal("01"),
          codigoTarifaIVA: z.literal("08"),
          tarifa: z.literal("13"),
        })
        .strict(),
    ]),
    esServicio: z.boolean(),
  })
  .strict();
export const ExactFePaymentSchema = MedioPagoSchema.omit({ totalMedioPago: true })
  .extend({ totalMedioPago: ExactMoneySchema })
  .strict()
  .superRefine((p, ctx) => {
    if (p.tipoMedioPago === "99" && !p.medioPagoOtros)
      ctx.addIssue({
        code: "custom",
        path: ["medioPagoOtros"],
        message: "Explicit other-payment text required",
      });
  });
export const ExactFeInputSchema = FacturaElectronicaSchema.omit({
  detalleServicio: true,
  resumenFactura: true,
  otrosCargos: true,
  informacionReferencia: true,
  otros: true,
})
  .extend({
    emisor: EmisorSchema.extend({
      identificacion: IdentificacionSchema.strict(),
      ubicacion: UbicacionSchema.strict(),
      telefono: TelefonoSchema.strict().optional(),
    }).strict(),
    receptor: ReceptorSchema.extend({
      identificacion: IdentificacionSchema.strict(),
      ubicacion: UbicacionSchema.strict().optional(),
      telefono: TelefonoSchema.strict().optional(),
    }).strict(),
    plazoCredito: z
      .string()
      .regex(/^\d{1,5}$/)
      .optional(),
    caseCode: z.literal("FE-domestic-ordinary-iva13-v1"),
    detalleServicio: z.array(ExactFeLineInputSchema).min(1).max(1000),
    codigoTipoMoneda: z
      .object({
        codigoMoneda: z.enum(CURRENCY_CODES),
        tipoCambio: ExactMoneySchema.refine(
          (v) => /[1-9]/.test(v),
          "Exchange rate must be positive",
        ),
      })
      .strict(),
    medioPago: z.array(ExactFePaymentSchema).min(1).max(4),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.condicionVenta === "99" && !input.condicionVentaOtros)
      ctx.addIssue({
        code: "custom",
        path: ["condicionVentaOtros"],
        message: "Explicit other-sale text required",
      });
    if (input.condicionVenta === "02" && !/^\d{1,5}$/.test(input.plazoCredito ?? ""))
      ctx.addIssue({
        code: "custom",
        path: ["plazoCredito"],
        message: "Explicit credit days required",
      });
    if (
      input.emisor.identificacion.tipo === "05" ||
      input.receptor.identificacion?.tipo === "05" ||
      input.receptor.otrasSenasExtranjero
    )
      ctx.addIssue({ code: "custom", message: "Foreign parties are outside ordinary domestic FE" });
    if (
      input.codigoTipoMoneda.codigoMoneda === "CRC" &&
      !/^1(?:\.0{1,5})?$/.test(input.codigoTipoMoneda.tipoCambio)
    )
      ctx.addIssue({
        code: "custom",
        path: ["codigoTipoMoneda", "tipoCambio"],
        message: "CRC exchange rate must equal1",
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
export const ExactFeCalculatedLineSchema = ExactFeLineInputSchema.omit({
  descuento: true,
  impuesto: true,
})
  .extend({
    descuento: z.array(ExactDiscountSchema).optional(),
    montoTotal: ExactMoneySchema,
    subTotal: ExactMoneySchema,
    baseImponible: ExactMoneySchema,
    impuesto: z.tuple([
      z
        .object({
          codigo: z.literal("01"),
          codigoTarifaIVA: z.literal("08"),
          tarifa: z.literal("13"),
          monto: ExactMoneySchema,
        })
        .strict(),
    ]),
    impuestoNeto: ExactMoneySchema,
    montoTotalLinea: ExactMoneySchema,
  })
  .strict();
export const ExactFeSummarySchema = z
  .object({
    codigoTipoMoneda: z
      .object({ codigoMoneda: z.enum(CURRENCY_CODES), tipoCambio: ExactMoneySchema })
      .strict(),
    totalServGravados: ExactMoneySchema,
    totalMercanciasGravadas: ExactMoneySchema,
    totalGravado: ExactMoneySchema,
    totalVenta: ExactMoneySchema,
    totalDescuentos: ExactMoneySchema,
    totalVentaNeta: ExactMoneySchema,
    totalImpuesto: ExactMoneySchema,
    totalComprobante: ExactMoneySchema,
    totalDesgloseImpuesto: z.tuple([
      z
        .object({
          codigo: z.literal("01"),
          codigoTarifaIVA: z.literal("08"),
          totalMontoImpuesto: ExactMoneySchema,
        })
        .strict(),
    ]),
    medioPago: z.array(ExactFePaymentSchema).min(1).max(4),
  })
  .strict();
export const ExactFeCalculatedSchema = z
  .object({
    detalleServicio: z.array(ExactFeCalculatedLineSchema).min(1).max(1000),
    resumenFactura: ExactFeSummarySchema,
  })
  .strict();
export type ExactFeInput = z.infer<typeof ExactFeInputSchema>;
export type ExactFeCalculated = z.infer<typeof ExactFeCalculatedSchema>;
