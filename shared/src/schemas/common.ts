/**
 * Zod schemas for common sub-structures shared across document types.
 */

import { z } from "zod";

/** Schema for phone number (Telefono). */
export const TelefonoSchema = z.object({
  /** Country code (e.g., "506"). Max 3 digits. */
  codigoPais: z.string().regex(/^\d{1,3}$/),

  /** Phone number. Max 20 digits. */
  numTelefono: z.string().regex(/^\d{1,20}$/),
});

export type TelefonoInput = z.infer<typeof TelefonoSchema>;

/** Schema for location (Ubicacion). */
export const UbicacionSchema = z.object({
  /** Province code (1-7). */
  provincia: z.string().regex(/^[1-7]$/),

  /** Canton code (2 digits, 01-99). */
  canton: z.string().regex(/^\d{2}$/),

  /** Distrito code (2 digits, 01-99). */
  distrito: z.string().regex(/^\d{2}$/),

  /** Barrio code (2 digits). Optional. */
  barrio: z
    .string()
    .regex(/^\d{2}$/)
    .optional(),

  /** Additional address details. Optional, max 250 chars. */
  otrasSenas: z.string().max(250).optional(),
});

export type UbicacionInput = z.infer<typeof UbicacionSchema>;
