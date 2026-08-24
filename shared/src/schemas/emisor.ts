/**
 * Zod schema for Emisor (issuer) validation, per the v4.4 XSD.
 */

import { z } from "zod";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";

/** Email address, max 160 chars per the XSD pattern. */
const CorreoSchema = z.string().email().max(160);

/** Schema for Emisor (issuer). */
export const EmisorSchema = z.object({
  /** Issuer name (Nombre o Razon Social). Max 100 chars. */
  nombre: z.string().min(1).max(100),

  /** Taxpayer identification. */
  identificacion: IdentificacionSchema,

  /** Ley 8707 fiscal registry number. Optional, max 12 chars. */
  registrofiscal8707: z.string().max(12).optional(),

  /** Commercial name. Optional, max 80 chars. */
  nombreComercial: z.string().max(80).optional(),

  /** Location. Required by the v4.4 XSD. */
  ubicacion: UbicacionSchema,

  /** Phone number. Optional. */
  telefono: TelefonoSchema.optional(),

  /** Email address(es) — the XSD allows up to 4. */
  correoElectronico: z.union([CorreoSchema, z.array(CorreoSchema).min(1).max(4)]),
});

export type EmisorInput = z.infer<typeof EmisorSchema>;
