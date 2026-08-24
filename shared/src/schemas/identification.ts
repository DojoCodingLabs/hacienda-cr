/**
 * Zod schemas for taxpayer identification validation.
 */

import { z } from "zod";
import { IdentificationType, IDENTIFICATION_LENGTHS } from "../constants/index.js";

/** Schema for identification type code. */
export const IdentificationTypeSchema = z.enum([
  IdentificationType.CEDULA_FISICA,
  IdentificationType.CEDULA_JURIDICA,
  IdentificationType.DIMEX,
  IdentificationType.NITE,
  IdentificationType.EXTRANJERO_NO_DOMICILIADO,
  IdentificationType.NO_CONTRIBUYENTE,
]);

/**
 * Schema for taxpayer identification (tipo + numero).
 *
 * Types 01-04 are digit-only with fixed lengths; types 05/06 are
 * free-form strings up to 20 characters (v4.4 XSD).
 */
export const IdentificacionSchema = z
  .object({
    /** Identification type code. */
    tipo: IdentificationTypeSchema,

    /** Identification number. */
    numero: z.string().min(1).max(20),
  })
  .superRefine((data, ctx) => {
    const expectedLengths = IDENTIFICATION_LENGTHS[data.tipo];
    if (!expectedLengths) {
      // Types 05/06: free-form, max 20 chars (already enforced above).
      return;
    }
    if (!/^\d+$/.test(data.numero)) {
      ctx.addIssue({
        code: "custom",
        message: "Must contain only digits",
        path: ["numero"],
      });
      return;
    }
    if (!expectedLengths.includes(data.numero.length)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Identification number length does not match the expected length for the given type",
        path: ["numero"],
      });
    }
  });

export type IdentificacionInput = z.infer<typeof IdentificacionSchema>;
