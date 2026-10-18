/** Additive full cancellation of one ordinary FE. Positive credit magnitudes,
 * not refunds, partial adjustments, replacement documents or fiscal acceptance. */
import { z } from "zod";
import { ExactFeInputSchema, type ExactFeCalculated } from "./exact-fe.js";
import { FacturaElectronicaSchema } from "./factura.js";
import { compareNcInstants } from "./exact-nc-instant.js";

export const ExactNcTotalReferenceSchema = z
  .object({
    tipoDoc: z.literal("01"),
    numero: FacturaElectronicaSchema.shape.clave,
    fechaEmision: z.iso.datetime({ offset: true }),
    codigo: z.literal("01"),
    // NC XSD permits optional Razon with maxLength 180 and no minLength.
    // Current official annex p58 additionally requires 3..180 characters.
    razon: z
      .string()
      .max(360)
      .refine(
        (value) =>
          value.length <= 360 &&
          value.trim().length > 0 &&
          [...value].length >= 3 &&
          [...value].length <= 180,
        "An explicit nonblank reason of 3–180 Unicode characters is required",
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
    // Annex p24 and Nota 5/p70: 09/11 are REP-only, 12 FE-only, 13 FEC-only.
    // Existing FE source validation already rejects 09/11; do not project away
    // any incompatible original fact to manufacture an eligible NC.
    if (["09", "11", "12", "13"].includes(input.original.condicionVenta))
      ctx.addIssue({
        code: "custom",
        path: ["original", "condicionVenta"],
        message: "Original sale condition is not applicable to an ordinary total NC",
      });
    // Annex Nota 4/p69 limits 06 to the purchase issuer; 05 is foreign/special.
    for (const party of ["emisor", "receptor"] as const) {
      if (!["01", "02", "03", "04"].includes(input.original[party].identificacion.tipo))
        ctx.addIssue({
          code: "custom",
          path: ["original", party, "identificacion", "tipo"],
          message: "Ordinary NC parties require domestic identification types 01–04",
        });
    }
    // Annex p25 requires positive explicit credit days for 02 AND 10.
    const creditCondition = ["02", "10"].includes(input.original.condicionVenta);
    if (
      creditCondition &&
      (!/^\d{1,5}$/.test(input.original.plazoCredito ?? "") ||
        !/[1-9]/.test(input.original.plazoCredito ?? ""))
    )
      ctx.addIssue({
        code: "custom",
        path: ["original", "plazoCredito"],
        message: "Credit conditions 02/10 require positive explicit credit days",
      });
    if (input.clave === input.original.clave)
      ctx.addIssue({
        code: "custom",
        path: ["clave"],
        message: "Credit note needs its own identity",
      });
    const chronology = compareNcInstants(input.original.fechaEmision, input.fechaEmision);
    if (
      !z.iso.datetime({ offset: true }).safeParse(input.original.fechaEmision).success ||
      chronology === null ||
      chronology > 0
    )
      ctx.addIssue({
        code: "custom",
        path: ["fechaEmision"],
        message: "Credit note emission must not precede a valid original FE timestamp",
      });
  });
export type ExactNcTotalInput = z.infer<typeof ExactNcTotalInputSchema>;
export type ExactNcTotalCalculated = ExactFeCalculated;
