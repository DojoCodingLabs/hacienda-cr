/**
 * Type-safe environment configuration for Hacienda API environments.
 *
 * Provides URLs, client IDs, and realm settings for Sandbox and Production.
 *
 * @module auth/environment
 */

import { API_BASE_URLS, CLIENT_IDS, IDP_TOKEN_URLS } from "@dojocoding/hacienda-shared";
import type { EnvironmentConfig } from "./types.js";
import { Environment } from "./types.js";

// ---------------------------------------------------------------------------
// Environment configs (immutable, sourced from @dojocoding/hacienda-shared)
// ---------------------------------------------------------------------------

const SANDBOX_CONFIG: EnvironmentConfig = Object.freeze({
  name: "Sandbox",
  apiBaseUrl: API_BASE_URLS.sandbox,
  idpTokenUrl: IDP_TOKEN_URLS.sandbox,
  clientId: CLIENT_IDS.sandbox,
});

const PRODUCTION_CONFIG: EnvironmentConfig = Object.freeze({
  name: "Production",
  apiBaseUrl: API_BASE_URLS.production,
  idpTokenUrl: IDP_TOKEN_URLS.production,
  clientId: CLIENT_IDS.production,
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
