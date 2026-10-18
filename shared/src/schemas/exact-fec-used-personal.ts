/** Explicit independently qualified non-subject acquisition; never supplier06 -> tax inference. */
import { z } from "zod";
import { ExactFecInputSchema, refineExactFecSource } from "./exact-fec.js";
import {
  ExactFeLineBaseSchema,
  ExactDiscountSchema,
  classification,
  ExactFeSummarySchema,
  ExactMoneySchema,
} from "./exact-fe.js";
import { exactPartyName } from "./exact-party-name.js";
const text = (min: number, max: number) =>
  z
    .string()
    .max(max * 2)
    .refine(
      (v) => [...v].length >= min && [...v].length <= max && v.trim().length > 0,
      `Actual text of ${min}–${max} Unicode characters required`,
    );
const tax = z
  .object({ codigo: z.literal("01"), codigoTarifaIVA: z.literal("11"), tarifa: z.literal("0") })
  .strict();
export const ExactFecUsedPersonalGoodsReferenceSchema = z
  .object({
    tipoDoc: z.enum(["06", "07", "99"]),
    tipoDocOtros: text(5, 100).optional(),
    numero: text(1, 50),
    fechaEmision: z.iso.datetime({ offset: true }),
    codigo: z.literal("04"),
    razon: text(3, 180),
  })
  .strict()
  .superRefine((r, ctx) => {
    if ((r.tipoDoc === "99") !== (r.tipoDocOtros !== undefined))
      ctx.addIssue({
        code: "custom",
        path: ["tipoDocOtros"],
        message: "Other-document description is required only for reference 99",
      });
  });
const base = ExactFecInputSchema.shape;
const goods = { esServicio: z.literal(false), codigoCabys: z.string().regex(/^[0-4]\d{12}$/) };
const usedLineBase = ExactFeLineBaseSchema.omit({ impuesto: true }).extend({
  ...goods,
  impuesto: z.tuple([tax]),
});
export const ExactFecUsedPersonalGoodsLineSchema = usedLineBase.superRefine(classification);
export const ExactFecUsedPersonalGoodsNonSubjectInputSchema = z
  .object({
    caseCode: z.literal("FEC-used-personal-goods-non-subject-v1"),
    clave: base.clave,
    proveedorSistemas: base.proveedorSistemas,
    numeroConsecutivo: base.numeroConsecutivo,
    fechaEmision: base.fechaEmision,
    codigoActividadReceptor: base.codigoActividadReceptor,
    receptor: base.receptor,
    emisor: base.emisor
      .omit({ identificacion: true, ubicacion: true })
      .extend({
        nombre: exactPartyName(5, 100),
        identificacion: z
          .object({ tipo: z.literal("06"), numero: z.string().regex(/^[\p{L}\p{N}]{1,20}$/u) })
          .strict(),
        ubicacion: base.emisor.shape.ubicacion.optional(),
      })
      .strict(),
    condicionVenta: z.literal("13"),
    detalleServicio: z.array(ExactFecUsedPersonalGoodsLineSchema).min(1).max(1000),
    codigoTipoMoneda: base.codigoTipoMoneda,
    medioPago: base.medioPago,
    informacionReferencia: z.array(ExactFecUsedPersonalGoodsReferenceSchema).min(1).max(10),
  })
  .strict()
  .superRefine(refineExactFecSource);
const positive = ExactMoneySchema.refine(
  (v) => /[1-9]/.test(v),
  "Positive calculated used-goods amount required",
);
const line = usedLineBase
  .omit({ impuesto: true, descuento: true })
  .extend({
    descuento: z.array(ExactDiscountSchema).optional(),
    montoTotal: positive,
    subTotal: positive,
    baseImponible: positive,
    montoTotalLinea: positive,
    ...goods,
    impuesto: z.tuple([tax.extend({ monto: z.literal("0.00000") })]),
    impuestoNeto: z.literal("0.00000"),
  })
  .superRefine(classification);
const summary = ExactFeSummarySchema.omit({
  totalServGravados: true,
  totalMercanciasGravadas: true,
  totalGravado: true,
  totalDesgloseImpuesto: true,
  totalImpuesto: true,
})
  .extend({
    totalMercNoSujeta: ExactMoneySchema,
    totalNoSujeto: ExactMoneySchema,
    totalImpuesto: z.literal("0.00000"),
    totalDesgloseImpuesto: z.tuple([
      z
        .object({
          codigo: z.literal("01"),
          codigoTarifaIVA: z.literal("11"),
          totalMontoImpuesto: z.literal("0.00000"),
        })
        .strict(),
    ]),
  })
  .strict();
export const ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema = z
  .object({ detalleServicio: z.array(line).min(1).max(1000), resumenFactura: summary })
  .strict();
export type ExactFecUsedPersonalGoodsNonSubjectInput = z.infer<
  typeof ExactFecUsedPersonalGoodsNonSubjectInputSchema
>;
export type ExactFecUsedPersonalGoodsNonSubjectCalculated = z.infer<
  typeof ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema
>;
