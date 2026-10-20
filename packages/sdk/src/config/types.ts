/**
 * Configuration types and Zod schemas for ~/.hacienda-cr/config.toml
 */

import { z } from "zod";
import { IdpUsernameSchema } from "../auth/types.js";

/**
 * Valid Hacienda API environments.
 */
export const EnvironmentSchema = z.enum(["sandbox", "production"]);
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Valid cedula (taxpayer ID) types used by Hacienda.
 *
 * - "01" = Cedula Fisica (individual)
 * - "02" = Cedula Juridica (legal entity)
 * - "03" = DIMEX (foreign resident)
 * - "04" = NITE (temporary ID)
 */
export const CedulaTypeSchema = z.enum(["01", "02", "03", "04"]);
export type CedulaType = z.infer<typeof CedulaTypeSchema>;

/**
 * Schema for a single profile stored in config.toml.
 *
 * Sensitive values (password, p12 PIN) are NEVER stored in the config file.
 * They must be provided via environment variables:
 * - HACIENDA_PASSWORD
 * - HACIENDA_P12_PIN
 */
export const ProfileSchema = z.object({
  environment: EnvironmentSchema,
  cedula_type: CedulaTypeSchema,
  cedula: z.string().min(9).max(12),
  /** Issued IDP username, independent of the taxpayer ID. */
  username: IdpUsernameSchema.optional(),
  /** Empty until a signing certificate is configured by the user. */
  p12_path: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Schema for the full config file: a record of profile name to profile data.
 * At minimum, a "default" profile should exist.
 */
export const ConfigFileSchema = z.record(z.string(), ProfileSchema);
export type ConfigFile = z.infer<typeof ConfigFileSchema>;

/**
 * Runtime configuration combining file-based config with environment variables.
 */
export interface ResolvedConfig {
  /** The active profile data from config.toml */
  profile: Profile;
  /** Profile name that was loaded */
  profileName: string;
  /** IDP password from HACIENDA_PASSWORD env var (may be undefined) */
  password: string | undefined;
  /** .p12 certificate PIN from HACIENDA_P12_PIN env var (may be undefined) */
  p12Pin: string | undefined;
}

/**
 * Sequence store file structure.
 * Keys are formatted as "{docType}-{branch}-{pos}".
 * Values are the current sequence number.
 */
export const SequenceFileSchema = z.record(z.string(), z.number().int().min(0));
export type SequenceFile = z.infer<typeof SequenceFileSchema>;

/** Maximum 10-digit sequence number (9999999999) */
export const MAX_SEQUENCE = 9_999_999_999;

/** Default branch code */
export const DEFAULT_BRANCH = "001";

/** Default point-of-sale code */
export const DEFAULT_POS = "00001";

/** Pipeline failure points for crash injection. */
export const FAILURE_POINTS = [
  "assign", // consecutivo se toma de la serie
  "build", // el XML del documento
  "sign", // la firma digital
  "persist", // el documento entra al outbox
  "send", // el POST a Hacienda
  "poll", // la consulta del estado de la clave
  "settle", // el estado final (aceptado / rechazado)
] as const;

/** Pipeline failure point type. */
export type FailurePoint = (typeof FAILURE_POINTS)[number];

/** Record of a sequence assignment (linked to a document). */
export const SequenceAssignmentSchema = z.object({
  /** The sequence number assigned. */
  sequence: z.number().int().min(1).max(MAX_SEQUENCE),
  /** The 50-digit clave numerica of the document (or legacy placeholder). */
  clave: z.string().min(1),
  /** Document type code. */
  docType: z.string(),
  /** Branch/sucursal code. */
  branch: z.string(),
  /** Point-of-sale code. */
  pos: z.string(),
  /** ISO 8601 timestamp of assignment. */
  assignedAt: z.string(),
  /** Whether the document was successfully emitted. */
  emitted: z.boolean().default(false),
  /** Emission timestamp if emitted. */
  emittedAt: z.string().optional(),
  /** Hacienda acceptance/rejection status if known. */
  haciendaStatus: z.enum(["aceptado", "rechazado", "pendiente"]).default("pendiente"),
});
export type SequenceAssignment = z.infer<typeof SequenceAssignmentSchema>;

/** Record of a discarded sequence. */
export const SequenceDiscardSchema = z.object({
  /** The discarded sequence number. */
  sequence: z.number().int().min(1).max(MAX_SEQUENCE),
  /** The 50-digit clave numerica of the document (if persisted). */
  clave: z.string().length(50).optional(),
  /** Document type code. */
  docType: z.string(),
  /** Branch/sucursal code. */
  branch: z.string(),
  /** Point-of-sale code. */
  pos: z.string(),
  /** Reason for discarding. */
  reason: z.string(),
  /** ISO 8601 timestamp of discard. */
  discardedAt: z.string(),
});
export type SequenceDiscard = z.infer<typeof SequenceDiscardSchema>;

/** Extended sequence store file with assignments and discards. */
export const ExtendedSequenceFileSchema = z.object({
  /** Current sequence numbers by key. */
  sequences: SequenceFileSchema,
  /** Assignment history. */
  assignments: z.array(SequenceAssignmentSchema),
  /** Discard records. */
  discards: z.array(SequenceDiscardSchema),
});
export type ExtendedSequenceFile = z.infer<typeof ExtendedSequenceFileSchema>;
