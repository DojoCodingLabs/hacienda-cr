/** Read-only Hacienda metadata, separate from fiscal documents/status/XML. */
import { z } from "zod";
import { ClaveNumericaSchema } from "./clave.js";
import type { IdentificationType } from "../generated/index.js";
import { IDENTIFICATION_LENGTHS } from "../constants/index.js";

/** API history filters are type + numeric domestic ID. Preserve supplied padding. */
export const ComprobantePartyFilterSchema = z
  .string()
  .regex(/^(01|02|03|04)\d+$/)
  .superRefine((value, ctx) => {
    const type = value.slice(0, 2) as IdentificationType;
    const number = value.slice(2);
    const lengths = IDENTIFICATION_LENGTHS[type] ?? [];
    const valid =
      lengths.includes(number.length) ||
      (number.length === 12 &&
        lengths.some((length) => number.startsWith("0".repeat(12 - length))));
    if (!valid)
      ctx.addIssue({
        code: "custom",
        message:
          "Use a domestic type plus its complete ID, optionally left-zero padded to 12 digits",
      });
  });
export const ComprobantesQuerySchema = z
  .object({
    offset: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 50)
      .default(0),
    limit: z.number().int().min(1).max(50).default(50),
    emisor: ComprobantePartyFilterSchema.optional(),
    receptor: ComprobantePartyFilterSchema.optional(),
  })
  .strict();
export const ComprobanteClaveSchema = ClaveNumericaSchema;
const apiTimestamp = z.iso.datetime({ offset: true });
const timestamp = z
  .string()
  .min(1)
  .max(100)
  .refine(
    (value) => apiTimestamp.safeParse(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")).success,
    "Expected API date-time",
  );
const identity = z.object({
  tipoIdentificacion: z.string().regex(/^\d{2}$/),
  // Bounded observed metadata, not a fiscal identification validator. Do not
  // truncate v4.4 foreign IDs/names to the older API documentation examples.
  numeroIdentificacion: z
    .string()
    .min(1)
    .max(20)
    .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value)),
  nombre: z
    .string()
    .max(100)
    .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value)),
});
const reference = z.object({ clave: ComprobanteClaveSchema, fecha: timestamp });
export const ComprobanteMetadataSchema = z.object({
  clave: ComprobanteClaveSchema,
  fecha: timestamp,
  emisor: identity,
  receptor: identity,
  notasCredito: z.array(reference).max(1000).optional(),
  notasDebito: z.array(reference).max(1000).optional(),
});
export const ComprobantesMetadataArraySchema = z.array(ComprobanteMetadataSchema).max(50);
