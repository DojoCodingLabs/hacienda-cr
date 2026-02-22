/**
 * Credential builder for Hacienda API authentication.
 *
 * Constructs the username format required by the IDP and validates
 * credential inputs using Zod schemas.
 *
 * @module auth/credentials
 */

import { existsSync } from "node:fs";

import type { AuthCredentials, CredentialInput } from "./types.js";
import { AuthError, AuthErrorCode, CredentialInputSchema, IdType } from "./types.js";

// ---------------------------------------------------------------------------
// Username construction
// ---------------------------------------------------------------------------

/** Prefix mapping for identification types. */
const ID_TYPE_PREFIX: Readonly<Record<IdType, string>> = {
  [IdType.PersonaFisica]: "cpf",
  [IdType.PersonaJuridica]: "cpj",
  [IdType.DIMEX]: "cpf",
  [IdType.NITE]: "cpf",
};

/**
 * Builds the Hacienda-formatted username from identification components.
 *
 * Format: `{prefix}-{tipo_cedula}-{cedula}`
 *
 * @param idType - Identification type code (01, 02, 03, 04).
 * @param idNumber - Identification number (cedula).
 * @returns Formatted username string.
 *
 * @example
 * ```ts
 * buildUsername(IdType.PersonaFisica, "0123456789");
 * // "cpf-01-0123456789"
 *
 * buildUsername(IdType.PersonaJuridica, "3101234567");
 * // "cpj-02-3101234567"
 * ```
 */
export function buildUsername(idType: IdType, idNumber: string): string {
  const prefix = ID_TYPE_PREFIX[idType];
  return `${prefix}-${idType}-${idNumber}`;
}

// ---------------------------------------------------------------------------
// Credential loading
// ---------------------------------------------------------------------------

/**
 * Validates and loads credentials from the given input.
 *
 * Performs Zod validation on all fields and optionally checks that the .p12
 * file exists on disk (when a path is provided).
 *
 * @param input - Raw credential input (may come from config/env).
 * @returns Resolved {@link AuthCredentials} ready for token requests.
 * @throws {AuthError} If validation fails or .p12 file is missing.
 *
 * @example
 * ```ts
 * const creds = loadCredentials({
 *   idType: IdType.PersonaJuridica,
 *   idNumber: "3101234567",
 *   password: process.env.HACIENDA_PASSWORD!,
 *   p12Path: "~/.hacienda-cr/keys/company.p12",
 *   p12Pin: process.env.HACIENDA_P12_PIN,
 * });
 * ```
 */
export function loadCredentials(input: CredentialInput): AuthCredentials {
  const result = CredentialInputSchema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join("; ");
    throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, `Invalid credentials: ${messages}`);
  }

  const validated = result.data;

  // Verify .p12 file exists when a path is provided.
  if (validated.p12Path && !existsSync(validated.p12Path)) {
    throw new AuthError(
      AuthErrorCode.P12_FILE_NOT_FOUND,
      `The .p12 file was not found at path: ${validated.p12Path}`,
    );
  }

  const username = buildUsername(validated.idType, validated.idNumber);

  return {
    username,
    password: validated.password,
  };
}
