/**
 * Zod schema for Receptor (receiver) validation, per the v4.4 XSD.
 */

import { z } from "zod";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema, UbicacionSchema } from "./common.js";

/** Schema for Receptor (receiver). */
export const ReceptorSchema = z.object({
  /** Receiver name. Max 100 chars. */
  nombre: z.string().min(1).max(100),

  /**
   * Taxpayer identification. Optional for Tiquete/NC/ND/FEE; foreign
   * receivers use tipo "05" (Extranjero No Domiciliado).
   */
  identificacion: IdentificacionSchema.optional(),

  /** Commercial name. Optional, max 80 chars. */
  nombreComercial: z.string().max(80).optional(),

  /** Location. Optional. */
  ubicacion: UbicacionSchema.optional(),

  /** Foreign receiver address. Optional, 5-300 chars (v4.4). */
  otrasSenasExtranjero: z.string().min(5).max(300).optional(),

  /** Phone number. Optional. */
  telefono: TelefonoSchema.optional(),

  /** Email address. Optional, max 160 chars. */
  correoElectronico: z.string().email().max(160).optional(),
});

export type ReceptorInput = z.infer<typeof ReceptorSchema>;
