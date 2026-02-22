/**
 * Auth module types for OAuth2 ROPC token management.
 *
 * @module auth/types
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/** Hacienda API environments. */
export enum Environment {
  Sandbox = "sandbox",
  Production = "production",
}

/** Full configuration for a Hacienda API environment. */
export interface EnvironmentConfig {
  /** Human-readable environment name. */
  readonly name: string;
  /** Base URL for the Hacienda REST API (recepcion). */
  readonly apiBaseUrl: string;
  /** IDP token endpoint for OAuth2 ROPC. */
  readonly idpTokenUrl: string;
  /** OAuth2 client ID for this environment. */
  readonly clientId: string;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** Identification type codes used by Hacienda. */
export enum IdType {
  /** Persona Fisica (physical person). */
  PersonaFisica = "01",
  /** Persona Juridica (juridical person / company). */
  PersonaJuridica = "02",
  /** DIMEX (foreign resident). */
  DIMEX = "03",
  /** NITE (non-registered entity). */
  NITE = "04",
}

/** Zod schema for credential input validation. */
export const CredentialInputSchema = z.object({
  /** Identification type code. */
  idType: z.nativeEnum(IdType, {
    error:
      "Invalid identification type. Must be 01 (Fisica), 02 (Juridica), 03 (DIMEX), or 04 (NITE).",
  }),
  /** Identification number (cedula). */
  idNumber: z
    .string()
    .min(9, "Identification number must be at least 9 digits.")
    .max(12, "Identification number must be at most 12 digits.")
    .regex(/^\d+$/, "Identification number must contain only digits."),
  /** Password for the Hacienda IDP. */
  password: z.string().min(1, "Password is required."),
  /** Optional path to .p12 certificate file (used for signing, not auth). */
  p12Path: z.string().optional(),
  /** Optional PIN for .p12 file. */
  p12Pin: z.string().optional(),
});

/** Validated credential input. */
export type CredentialInput = z.infer<typeof CredentialInputSchema>;

/** Resolved credentials ready for authentication. */
export interface AuthCredentials {
  /** Hacienda-formatted username (e.g. cpf-01-0123456789). */
  readonly username: string;
  /** Password for the Hacienda IDP. */
  readonly password: string;
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/** Raw token response from the Hacienda IDP. */
export interface TokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  /** Access token TTL in seconds. */
  readonly expires_in: number;
  /** Refresh token TTL in seconds. */
  readonly refresh_expires_in: number;
  readonly token_type: string;
}

/** Zod schema for validating token responses from the IDP. */
export const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_expires_in: z.number().positive(),
  token_type: z.string(),
});

/** Internal token state with computed expiry timestamps. */
export interface TokenState {
  /** JWT access token. */
  readonly accessToken: string;
  /** Refresh token for silent re-auth. */
  readonly refreshToken: string;
  /** Absolute timestamp (ms) when the access token expires. */
  readonly accessTokenExpiresAt: number;
  /** Absolute timestamp (ms) when the refresh token expires. */
  readonly refreshTokenExpiresAt: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Error codes for the auth module. */
export enum AuthErrorCode {
  /** Invalid credentials provided. */
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  /** Token request failed (network or server error). */
  TOKEN_REQUEST_FAILED = "TOKEN_REQUEST_FAILED",
  /** Token response did not match expected schema. */
  INVALID_TOKEN_RESPONSE = "INVALID_TOKEN_RESPONSE",
  /** No token available — must authenticate first. */
  NOT_AUTHENTICATED = "NOT_AUTHENTICATED",
  /** Refresh token has expired — must re-authenticate. */
  REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED",
  /** Token refresh failed. */
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",
  /** The .p12 file was not found at the specified path. */
  P12_FILE_NOT_FOUND = "P12_FILE_NOT_FOUND",
}

/** Typed error for the auth module. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "AuthError";
    this.code = code;
  }
}
