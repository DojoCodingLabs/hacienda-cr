/**
 * @hacienda-cr/sdk
 *
 * Core SDK for Costa Rica electronic invoicing (Hacienda API v4.4).
 * Provides auth, XML generation, digital signing, and API client.
 */

export const PACKAGE_NAME = "@hacienda-cr/sdk" as const;

// Auth module
export {
  AuthError,
  AuthErrorCode,
  buildUsername,
  CredentialInputSchema,
  Environment,
  getEnvironmentConfig,
  IdType,
  loadCredentials,
  TokenManager,
  TokenResponseSchema,
} from "./auth/index.js";
export type {
  AuthCredentials,
  CredentialInput,
  EnvironmentConfig,
  TokenManagerOptions,
  TokenResponse,
  TokenState,
} from "./auth/index.js";
