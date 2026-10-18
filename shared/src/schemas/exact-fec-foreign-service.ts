/** Explicit ordinary IVA13 service selection; supplier05 never implies tax treatment. */
import { z } from "zod";
import { ExactFecInputSchema, refineExactFecSource } from "./exact-fec.js";
import { ExactFeLineInputSchema, type ExactFeCalculated } from "./exact-fe.js";
import { exactPartyName } from "./exact-party-name.js";
import { TelefonoSchema } from "./common.js";
const actualText = (min: number, max: number) =>
  z
    .string()
    .max(max * 2)
    .refine(
      (value) => [...value].length >= min && [...value].length <= max && value.trim().length > 0,
      `Actual text of ${min}–${max} Unicode characters required`,
    );
export const ExactFecForeignServiceIva13ReferenceSchema = z
  .object({
    tipoDoc: z.literal("16"),
    numero: actualText(1, 50),
    fechaEmision: z.iso.datetime({ offset: true }),
    codigo: z.literal("11"),
    razon: actualText(3, 180),
  })
  .strict();
const common = ExactFecInputSchema.shape;
export const ExactFecForeignServiceIva13InputSchema = z
  .object({
    clave: common.clave,
    proveedorSistemas: common.proveedorSistemas,
    numeroConsecutivo: common.numeroConsecutivo,
    fechaEmision: common.fechaEmision,
    codigoActividadReceptor: common.codigoActividadReceptor,
    receptor: common.receptor,
    condicionVenta: common.condicionVenta,
    plazoCredito: common.plazoCredito,
    codigoTipoMoneda: common.codigoTipoMoneda,
    medioPago: common.medioPago,
    caseCode: z.literal("FEC-foreign-service-ordinary-iva13-v1"),
    emisor: z
      .object({
        nombre: exactPartyName(5, 100),
        identificacion: z
          .object({ tipo: z.literal("05"), numero: z.string().regex(/^[\p{L}\p{N}]{1,20}$/u) })
          .strict(),
        nombreComercial: exactPartyName(3, 80).optional(),
        otrasSenasExtranjero: actualText(5, 300),
        telefono: TelefonoSchema.strict().optional(),
        correoElectronico: ExactFecInputSchema.shape.emisor.shape.correoElectronico,
      })
      .strict(),
    detalleServicio: z
      .array(ExactFeLineInputSchema.safeExtend({ esServicio: z.literal(true) }))
      .min(1)
      .max(1000),
    informacionReferencia: z.tuple([ExactFecForeignServiceIva13ReferenceSchema]),
  })
  .strict()
  .superRefine(refineExactFecSource);
export type ExactFecForeignServiceIva13Input = z.infer<
  typeof ExactFecForeignServiceIva13InputSchema
>;
export type ExactFecForeignServiceIva13Calculated = ExactFeCalculated;
