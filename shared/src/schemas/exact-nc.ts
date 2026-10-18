/** Additive full cancellation of one ordinary FE. Positive credit magnitudes,
 * not refunds, partial adjustments, replacement documents or fiscal acceptance. */
import { z } from "zod";
import { ExactFeInputSchema, type ExactFeCalculated } from "./exact-fe.js";
import { FacturaElectronicaSchema } from "./factura.js";

export const ExactNcTotalReferenceSchema = z
  .object({
    tipoDoc: z.literal("01"),
    numero: FacturaElectronicaSchema.shape.clave,
    fechaEmision: z.iso.datetime({ offset: true }),
    codigo: z.literal("01"),
    // NC XSD permits optional Razon with maxLength180 and no minLength.
    // This named case additionally requires an explicit nonblank rationale.
    razon: z
      .string()
      .max(360)
      .refine(
        (value) => value.length <= 360 && value.trim().length > 0 && [...value].length <= 180,
        "An explicit nonblank reason of at most180 Unicode characters is required",
      ),
  })
  .strict();
export const ExactNcTotalInputSchema = z
  .object({
    caseCode: z.literal("NC-domestic-ordinary-fe-total-iva13-v1"),
    original: ExactFeInputSchema,
    clave: FacturaElectronicaSchema.shape.clave,
    numeroConsecutivo: FacturaElectronicaSchema.shape.numeroConsecutivo,
    fechaEmision: z.iso.datetime({ offset: true }),
    informacionReferencia: z.tuple([ExactNcTotalReferenceSchema]),
  })
  .strict()
  .superRefine((input, ctx) => {
    const reference = input.informacionReferencia[0];
    if (reference.numero !== input.original.clave)
      ctx.addIssue({
        code: "custom",
        path: ["informacionReferencia", 0, "numero"],
        message: "Reference must match the original FE clave",
      });
    if (reference.fechaEmision !== input.original.fechaEmision)
      ctx.addIssue({
        code: "custom",
        path: ["informacionReferencia", 0, "fechaEmision"],
        message: "Reference must preserve the original FE emission timestamp",
      });
    if (!["CRC", "USD"].includes(input.original.codigoTipoMoneda.codigoMoneda))
      ctx.addIssue({
        code: "custom",
        path: ["original", "codigoTipoMoneda", "codigoMoneda"],
        message: "Exact NC total supports CRC or USD only",
      });
    if (input.clave === input.original.clave)
      ctx.addIssue({
        code: "custom",
        path: ["clave"],
        message: "Credit note needs its own identity",
      });
    if (
      !z.iso.datetime({ offset: true }).safeParse(input.original.fechaEmision).success ||
      Date.parse(input.fechaEmision) < Date.parse(input.original.fechaEmision)
    )
      ctx.addIssue({
        code: "custom",
        path: ["fechaEmision"],
        message: "Credit note emission must not precede a valid original FE timestamp",
      });
  });
export type ExactNcTotalInput = z.infer<typeof ExactNcTotalInputSchema>;
export type ExactNcTotalCalculated = ExactFeCalculated;
