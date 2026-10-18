/** Positive ordinary partial credit magnitudes, not a fresh remaining-credit oracle. */
import { z } from "zod";
import { exactPartyName } from "./exact-party-name.js";
import {
  ExactFeInputSchema,
  ExactFeLineInputSchema,
  ExactFePaymentSchema,
  type ExactFeCalculated,
} from "./exact-fe.js";
import { ExactNcTotalReferenceSchema } from "./exact-nc.js";
import { compareNcInstants as compareReferenceInstants } from "./exact-nc-instant.js";
// Preserve all current FE source refinements while enforcing the copied partial NC
// party fields against NC's own Unicode bounds. Never mutate legacy FE schemas.
const ExactNcPartialOriginalSchema = ExactFeInputSchema.safeExtend({
  emisor: ExactFeInputSchema.shape.emisor.safeExtend({
    nombre: exactPartyName(5, 100),
    nombreComercial: exactPartyName(3, 80).optional(),
  }),
  receptor: ExactFeInputSchema.shape.receptor.safeExtend({
    nombre: exactPartyName(3, 100),
    nombreComercial: exactPartyName(3, 80).optional(),
  }),
});
/** Current annex Nota 9: 02 corrects amounts. The older XSD annotation says text,
 * but its actual code restriction admits 02. Never alter the official XSD bytes. */
export const ExactNcPartialReferenceSchema = ExactNcTotalReferenceSchema.omit({ codigo: true })
  .extend({ codigo: z.literal("02") })
  .strict();
export const ExactNcPartialInputSchema = z
  .object({
    caseCode: z.literal("NC-domestic-ordinary-fe-partial-iva13-v1"),
    original: ExactNcPartialOriginalSchema,
    clave: ExactFeInputSchema.shape.clave,
    numeroConsecutivo: ExactFeInputSchema.shape.numeroConsecutivo,
    fechaEmision: z.iso.datetime({ offset: true }),
    adjustments: z
      .array(
        z
          .object({
            originalLineNumber: z.number().int().min(1).max(1000),
            line: ExactFeLineInputSchema,
          })
          .strict(),
      )
      .min(1)
      .max(1000),
    medioPago: z.array(ExactFePaymentSchema).min(1).max(4),
    informacionReferencia: z.tuple([ExactNcPartialReferenceSchema]),
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
        message: "Reference must preserve the original FE timestamp verbatim",
      });
    if (!["CRC", "USD"].includes(input.original.codigoTipoMoneda.codigoMoneda))
      ctx.addIssue({
        code: "custom",
        path: ["original", "codigoTipoMoneda"],
        message: "Ordinary partial NC supports CRC or USD only",
      });
    if (["09", "11", "12", "13"].includes(input.original.condicionVenta))
      ctx.addIssue({
        code: "custom",
        path: ["original", "condicionVenta"],
        message: "Original condition cannot be copied into this ordinary partial NC",
      });
    for (const party of ["emisor", "receptor"] as const)
      if (!["01", "02", "03", "04"].includes(input.original[party].identificacion.tipo))
        ctx.addIssue({
          code: "custom",
          path: ["original", party, "identificacion"],
          message: "Ordinary partial NC requires domestic parties 01–04",
        });
    if (input.clave === input.original.clave)
      ctx.addIssue({
        code: "custom",
        path: ["clave"],
        message: "Partial NC requires its own identity",
      });
    const chronology = compareReferenceInstants(input.original.fechaEmision, input.fechaEmision);
    if (
      !z.iso.datetime({ offset: true }).safeParse(input.original.fechaEmision).success ||
      chronology === null ||
      chronology > 0
    )
      ctx.addIssue({
        code: "custom",
        path: ["fechaEmision"],
        message: "Partial NC must not precede a valid original FE timestamp",
      });
    // No unrelated original-total cap: caller proves fresh cumulative credit authority.
    // Current annex p. 56 requires each supplied payment amount greater than zero.
    // This is an allocation invariant, never evidence of a cash receipt.
    input.medioPago.forEach((payment, index) => {
      if (!/[1-9]/.test(payment.totalMedioPago))
        ctx.addIssue({
          code: "custom",
          path: ["medioPago", index, "totalMedioPago"],
          message: "Supplied partial NC payment allocations must be positive",
        });
    });
    const seen = new Set<number>();
    input.adjustments.forEach((adjustment, index) => {
      const original = input.original.detalleServicio.find(
          (line) => line.numeroLinea === adjustment.originalLineNumber,
        ),
        line = adjustment.line;
      if (!original || seen.has(adjustment.originalLineNumber))
        ctx.addIssue({
          code: "custom",
          path: ["adjustments", index, "originalLineNumber"],
          message: "Each original line may be adjusted once per named partial NC, and must exist",
        });
      seen.add(adjustment.originalLineNumber);
      if (line.numeroLinea !== index + 1)
        ctx.addIssue({
          code: "custom",
          path: ["adjustments", index, "line", "numeroLinea"],
          message: "Partial NC line numbers must preserve caller order sequentially",
        });
      if (
        original &&
        (line.codigoCabys !== original.codigoCabys ||
          line.esServicio !== original.esServicio ||
          line.unidadMedida !== original.unidadMedida ||
          line.tipoTransaccion !== original.tipoTransaccion ||
          line.unidadMedidaComercial !== original.unidadMedidaComercial ||
          JSON.stringify(line.codigoComercial ?? []) !==
            JSON.stringify(original.codigoComercial ?? []))
      )
        ctx.addIssue({
          code: "custom",
          path: ["adjustments", index, "line"],
          message:
            "Partial-credit line classification/unit/commercial facts must correspond to its original line",
        });
    });
  });
export type ExactNcPartialInput = z.infer<typeof ExactNcPartialInputSchema>;
export type ExactNcPartialCalculated = ExactFeCalculated;
