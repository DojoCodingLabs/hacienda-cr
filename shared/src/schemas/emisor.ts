/**
 * Zod schema for Emisor (issuer) validation.
 */

import { z } from "zod";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";

/** Schema for Emisor (issuer). */
export const EmisorSchema = z.object({
  /** Issuer name (Nombre o Razon Social). Max 100 chars. */
  nombre: z.string().min(1).max(100),

  /** Taxpayer identification. */
  identificacion: IdentificacionSchema,

  /** Commercial name. Optional, max 80 chars. */
  nombreComercial: z.string().max(80).optional(),

  /** Location. Optional. */
  ubicacion: UbicacionSchema.optional(),

  /** Phone number. Optional. */
  telefono: TelefonoSchema.optional(),

  /** Fax number. Optional. */
  fax: TelefonoSchema.optional(),

  /** Email address. */
  correoElectronico: z.string().email().max(160),
});

export type EmisorInput = z.infer<typeof EmisorSchema>;
