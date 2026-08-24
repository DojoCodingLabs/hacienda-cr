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

  /** Barrio name (free text, 5-50 chars in v4.4 — no longer a code). Optional. */
  barrio: z.string().min(5).max(50).optional(),

  /** Additional address details. Required by the v4.4 XSD, 5-250 chars. */
  otrasSenas: z.string().min(5).max(250),
});

export type UbicacionInput = z.infer<typeof UbicacionSchema>;
