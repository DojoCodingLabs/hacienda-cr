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
]);

/** Schema for taxpayer identification (tipo + numero). */
export const IdentificacionSchema = z
  .object({
    /** Identification type code. */
    tipo: IdentificationTypeSchema,

    /** Identification number (digits only). */
    numero: z.string().regex(/^\d+$/, "Must contain only digits"),
  })
  .refine(
    (data) => {
      const expectedLengths =
        IDENTIFICATION_LENGTHS[data.tipo as keyof typeof IDENTIFICATION_LENGTHS];
      if (!expectedLengths) return true;
      return expectedLengths.includes(data.numero.length);
    },
    {
      message: "Identification number length does not match the expected length for the given type",
      path: ["numero"],
    },
  );

export type IdentificacionInput = z.infer<typeof IdentificacionSchema>;
