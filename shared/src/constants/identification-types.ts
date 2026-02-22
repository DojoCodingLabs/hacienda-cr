/**
 * Identification type codes for Costa Rica taxpayers.
 *
 * Used in the emisor (issuer) and receptor (receiver) sections
 * of electronic documents.
 */

/** Taxpayer identification type codes (Tipo de Identificacion). */
export const IdentificationType = {
  /** Cedula Fisica (physical person ID) — 9 digits */
  CEDULA_FISICA: "01",
  /** Cedula Juridica (legal entity ID) — 10 digits */
  CEDULA_JURIDICA: "02",
  /** DIMEX (foreign resident ID) — 11-12 digits */
  DIMEX: "03",
  /** NITE (tax ID for foreigners without DIMEX) — 10 digits */
  NITE: "04",
} as const;

export type IdentificationType = (typeof IdentificationType)[keyof typeof IdentificationType];

/** Human-readable names for identification types. */
export const IDENTIFICATION_TYPE_NAMES: Record<IdentificationType, string> = {
  [IdentificationType.CEDULA_FISICA]: "Cédula Física",
  [IdentificationType.CEDULA_JURIDICA]: "Cédula Jurídica",
  [IdentificationType.DIMEX]: "DIMEX",
  [IdentificationType.NITE]: "NITE",
} as const;

/** Expected identification number lengths per type. */
export const IDENTIFICATION_LENGTHS: Record<IdentificationType, readonly number[]> = {
  [IdentificationType.CEDULA_FISICA]: [9],
  [IdentificationType.CEDULA_JURIDICA]: [10],
  [IdentificationType.DIMEX]: [11, 12],
  [IdentificationType.NITE]: [10],
} as const;
