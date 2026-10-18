/** New current FE source plus retained rejected identity; never a cancellation NC. */
import { z } from "zod";
import { ExactFeInputSchema, type ExactFeCalculated } from "./exact-fe.js";
import { exactPartyName } from "./exact-party-name.js";
import { IdentificacionSchema } from "./identification.js";
import { compareNcInstants } from "./exact-nc-instant.js";
const identity = IdentificacionSchema.safeExtend({
  tipo: z.enum(["01", "02", "03", "04"]),
}).strict();
const replacement = ExactFeInputSchema.safeExtend({
  emisor: ExactFeInputSchema.shape.emisor.safeExtend({
    nombre: exactPartyName(5, 100),
    nombreComercial: exactPartyName(3, 80).optional(),
    identificacion: identity,
  }),
  receptor: ExactFeInputSchema.shape.receptor.safeExtend({
    nombre: exactPartyName(3, 100),
    nombreComercial: exactPartyName(3, 80).optional(),
    identificacion: identity,
  }),
});
export const ExactFeReplacementReferenceSchema = z
  .object({
    tipoDoc: z.literal("10"),
    numero: ExactFeInputSchema.shape.clave,
    fechaEmision: z.iso.datetime({ offset: true }),
    codigo: z.literal("16"),
    razon: z
      .string()
      .min(3)
      .max(180)
      .refine((v) => v.trim().length > 0, "Actual nonblank replacement reason required"),
  })
  .strict();
export const ExactFeReplacementInputSchema = z
  .object({
    caseCode: z.literal("FE-domestic-ordinary-rejected-replacement-iva13-v1"),
    replacement,
    rejected: z
      .object({
        clave: ExactFeInputSchema.shape.clave,
        fechaEmision: z.iso.datetime({ offset: true }),
      })
      .strict(),
    informacionReferencia: z.tuple([ExactFeReplacementReferenceSchema]),
  })
  .strict()
  .superRefine((input, ctx) => {
    const old = input.rejected,
      next = input.replacement,
      ref = input.informacionReferencia[0];
    const error = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (!/^506\d{6}[A-Za-z0-9]{12}\d{29}$/.test(old.clave) || old.clave.slice(29, 31) !== "01")
      error(
        ["rejected", "clave"],
        "Named replacement requires a retained original FE identity layout",
      );
    if (old.clave.slice(9, 21) !== next.emisor.identificacion.numero.padStart(12, "0"))
      error(["rejected", "clave"], "Replacement must retain the same issuing taxpayer");
    if (next.clave === old.clave || next.numeroConsecutivo === old.clave.slice(21, 41))
      error(
        ["replacement", "numeroConsecutivo"],
        "Replacement requires a fresh identity and consecutive",
      );
    if (ref.numero !== old.clave)
      error(
        ["informacionReferencia", 0, "numero"],
        "Reference must preserve the actual rejected clave",
      );
    if (ref.fechaEmision !== old.fechaEmision)
      error(
        ["informacionReferencia", 0, "fechaEmision"],
        "Reference must preserve the retained rejected emission lexeme",
      );
    // New named source API only: annex p. 56 requires positive supplied allocations.
    // Keep the older current FE and retained contracts unchanged.
    next.medioPago.forEach((payment, index) => {
      if (!/[1-9]/.test(payment.totalMedioPago))
        error(
          ["replacement", "medioPago", index, "totalMedioPago"],
          "Supplied replacement payment allocations must be positive",
        );
    });
    const chronology = compareNcInstants(old.fechaEmision, next.fechaEmision);
    if (chronology === null || chronology > 0)
      error(
        ["replacement", "fechaEmision"],
        "Replacement must not precede valid retained rejected emission",
      );
  });
export type ExactFeReplacementInput = z.infer<typeof ExactFeReplacementInputSchema>;
export type ExactFeReplacementCalculated = ExactFeCalculated;
