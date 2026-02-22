/**
 * Configuration types and Zod schemas for ~/.hacienda-cr/config.toml
 */

import { z } from "zod";

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
  p12_path: z.string().min(1),
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
