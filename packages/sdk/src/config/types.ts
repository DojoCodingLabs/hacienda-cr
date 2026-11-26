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
  /**
   * Identification of the provider of the invoicing system, emitted as
   * `ProveedorSistemas`. Anexos y Estructuras v4.4 (Encabezado,
   * "Proveedor de sistemas para emisión de Comprobantes", String 20): "Se debe
   * indicar la identificación del proveedor de sistemas que esté utilizando
   * para la emisión de comprobantes electrónicos. En caso de ser un desarrollo
   * propio o comprado a la medida, se deberá indicar la identificación del
   * mismo obligado tributario." The field "Permite ingresar números y letras
   * para personas jurídicas"; 9 characters is the shortest Nota 4
   * identification (cédula física). Optional: when absent, callers fall back
   * to the issuer's own identification and must warn.
   */
  provider_id: z
    .string()
    .regex(/^[A-Za-z0-9]{9,20}$/, "provider_id must be 9-20 letters or digits")
    .optional(),
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
