/**
 * Auth module — OAuth2 ROPC token management, credential building,
 * and type-safe environment configuration for the Hacienda IDP.
 *
 * @module auth
 */

// Types & schemas
export {
  AuthError,
  AuthErrorCode,
  CredentialInputSchema,
  Environment,
  IdType,
  TokenResponseSchema,
} from "./types.js";
export type {
  AuthCredentials,
  CredentialInput,
  EnvironmentConfig,
  TokenResponse,
  TokenState,
} from "./types.js";

// Environment
export { getEnvironmentConfig } from "./environment.js";

// Credentials
export { buildUsername, loadCredentials } from "./credentials.js";

// Token manager
export { TokenManager } from "./token-manager.js";
export type { TokenManagerOptions } from "./token-manager.js";
