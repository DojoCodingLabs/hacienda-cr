/**
 * Zod schema for Receptor (receiver) validation.
 */

import { z } from "zod";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";

/** Schema for Receptor (receiver). */
export const ReceptorSchema = z.object({
  /** Receiver name. Max 100 chars. */
  nombre: z.string().min(1).max(100),

  /** Taxpayer identification. Optional for some doc types (e.g., Tiquete). */
  identificacion: IdentificacionSchema.optional(),

  /** Foreign identification number. Optional, max 20 chars. */
  identificacionExtranjero: z.string().max(20).optional(),

  /** Commercial name. Optional, max 80 chars. */
  nombreComercial: z.string().max(80).optional(),

  /** Location. Optional. */
  ubicacion: UbicacionSchema.optional(),

  /** Phone number. Optional. */
  telefono: TelefonoSchema.optional(),

  /** Fax number. Optional. */
  fax: TelefonoSchema.optional(),

  /** Email address. Optional, max 160 chars. */
  correoElectronico: z.string().email().max(160).optional(),
});

export type ReceptorInput = z.infer<typeof ReceptorSchema>;
