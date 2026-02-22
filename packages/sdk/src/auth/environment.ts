/**
 * Type-safe environment configuration for Hacienda API environments.
 *
 * Provides URLs, client IDs, and realm settings for Sandbox and Production.
 *
 * @module auth/environment
 */

import type { EnvironmentConfig } from "./types.js";
import { Environment } from "./types.js";

// ---------------------------------------------------------------------------
// Environment configs (immutable)
// ---------------------------------------------------------------------------

const SANDBOX_CONFIG: EnvironmentConfig = Object.freeze({
  name: "Sandbox",
  apiBaseUrl: "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1",
  idpTokenUrl:
    "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
  clientId: "api-stag",
});

const PRODUCTION_CONFIG: EnvironmentConfig = Object.freeze({
  name: "Production",
  apiBaseUrl: "https://api.comprobanteselectronicos.go.cr/recepcion/v1",
  idpTokenUrl:
    "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token",
  clientId: "api-prod",
});

/** Map of environment to its configuration. */
const ENVIRONMENT_CONFIGS: Readonly<Record<Environment, EnvironmentConfig>> = Object.freeze({
  [Environment.Sandbox]: SANDBOX_CONFIG,
  [Environment.Production]: PRODUCTION_CONFIG,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the full environment configuration for the given environment.
 *
 * @param env - The target environment (Sandbox or Production).
 * @returns Immutable configuration object with all URLs and settings.
 *
 * @example
 * ```ts
 * const config = getEnvironmentConfig(Environment.Sandbox);
 * console.log(config.idpTokenUrl);
 * // "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token"
 * ```
 */
export function getEnvironmentConfig(env: Environment): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[env];
}
