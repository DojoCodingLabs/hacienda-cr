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
import { CURRENCY_CODES } from "../generated/index.js";
import { exactPartyName } from "./exact-party-name.js";

export const ExactMoneySchema = z.string().regex(/^(?:0|[1-9]\d{0,12})(?:\.\d{1,5})?$/);
const positiveMoney = ExactMoneySchema.refine(
  (v) => /[1-9]/.test(v),
  "Ordinary FE amount must be positive",
);
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
})
  .extend({ codigoDescuento: DescuentoSchema.shape.codigoDescuento.exclude(["01", "02", "03"]) })
  .strict();
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
export const ExactFeLineBaseSchema = LineaDetalleSchema.pick({
  numeroLinea: true,
  codigoCabys: true,
  unidadMedida: true,
  tipoTransaccion: true,
  unidadMedidaComercial: true,
  detalle: true,
})
  .extend({
    cantidad: ExactQuantitySchema,
    precioUnitario: positiveMoney,
    tipoTransaccion: z.literal("01").optional(),
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
// Official ANEXOS pp50–52: CABYS0–4 goods,5–9 services. This validates
// classification only, not existence in CABYS or its applicable tax treatment.
export function classification(
  line: { codigoCabys: string; esServicio: boolean },
  ctx: z.RefinementCtx,
) {
  if (line.esServicio !== /^[5-9]/.test(line.codigoCabys))
    ctx.addIssue({
      code: "custom",
      path: ["esServicio"],
      message: "Service/goods declaration must match CABYS prefix",
    });
}
export const ExactFeLineInputSchema = ExactFeLineBaseSchema.superRefine(classification);
// Frozen read/output structure: historical allocations may contain zero.
const RetainedExactFePaymentSchema = MedioPagoSchema.omit({ totalMedioPago: true })
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
/** Current supplied allocation must be positive (annex p. 56). This is not a
 * cash-receipt assertion and must not tighten historical/output decoding. */
export const ExactFePaymentSchema = RetainedExactFePaymentSchema.safeExtend({
  totalMedioPago: ExactMoneySchema.refine(
    (value) => /[1-9]/.test(value),
    "Supplied payment allocation must be positive",
  ),
});
const ExactFeStructureSchema = FacturaElectronicaSchema.omit({
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
    medioPago: z.array(RetainedExactFePaymentSchema).min(1).max(4),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.condicionVenta === "99" && !input.condicionVentaOtros)
      ctx.addIssue({
        code: "custom",
        path: ["condicionVentaOtros"],
        message: "Explicit other-sale text required",
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
/** Read-only historical decimal-source shape for immutable 0.6–0.9 FE custody.
 * This preserves the former term acceptance, not current issuance readiness.
 * Callers must independently bind the exact reviewed producer and retained bytes.
 * No retained XML/signing/transport builder is provided. */
export const RetainedExactFeInputSchema = ExactFeStructureSchema.superRefine((input, ctx) => {
  if (input.condicionVenta === "02" && !/^\d{1,5}$/.test(input.plazoCredito ?? ""))
    ctx.addIssue({
      code: "custom",
      path: ["plazoCredito"],
      message: "Historical credit-day shape required",
    });
});
/** Official current annex p25: 02/10 require positive 1–5 digit days. Any present
 * term must also be positive. Preserve valid leading-zero lexemes verbatim. */
export const ExactFeInputSchema = ExactFeStructureSchema.safeExtend({
  emisor: ExactFeStructureSchema.shape.emisor.safeExtend({
    nombre: exactPartyName(5, 100),
    nombreComercial: exactPartyName(3, 80).optional(),
  }),
  receptor: ExactFeStructureSchema.shape.receptor.safeExtend({
    nombre: exactPartyName(3, 100),
    nombreComercial: exactPartyName(3, 80).optional(),
  }),
  medioPago: z.array(ExactFePaymentSchema).min(1).max(4),
}).superRefine((input, ctx) => {
  // Current official annex p70, Nota 5 footnotes 20/22/24: 09/11 are REP-only; 13 is FEC-only.
  if (["09", "11", "13"].includes(input.condicionVenta))
    ctx.addIssue({
      code: "custom",
      path: ["condicionVenta"],
      message: "Sale condition belongs to another document family, not FE",
    });
  if (["02", "10"].includes(input.condicionVenta) && input.plazoCredito === undefined)
    ctx.addIssue({
      code: "custom",
      path: ["plazoCredito"],
      message: "Explicit positive credit days required for 02/10",
    });
  if (input.plazoCredito !== undefined && !/[1-9]/.test(input.plazoCredito))
    ctx.addIssue({
      code: "custom",
      path: ["plazoCredito"],
      message: "Credit days must be positive",
    });
});
export const ExactFeCalculatedLineSchema = ExactFeLineBaseSchema.omit({
  descuento: true,
  impuesto: true,
})
  .extend({
    descuento: z.array(ExactDiscountSchema).optional(),
    montoTotal: positiveMoney,
    subTotal: positiveMoney,
    baseImponible: positiveMoney,
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
    montoTotalLinea: positiveMoney,
  })
  .strict()
  .superRefine(classification);
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
    medioPago: z.array(RetainedExactFePaymentSchema).min(1).max(4),
  })
  .strict();
export const ExactFeCalculatedSchema = z
  .object({
    detalleServicio: z.array(ExactFeCalculatedLineSchema).min(1).max(1000),
    resumenFactura: ExactFeSummarySchema,
  })
  .strict();
export type RetainedExactFeInput = z.infer<typeof RetainedExactFeInputSchema>;
export type ExactFeInput = z.infer<typeof ExactFeInputSchema>;
export type ExactFeCalculated = z.infer<typeof ExactFeCalculatedSchema>;
