/**
 * Configuration types for the SDK, CLI, and MCP server.
 */

import type { Environment } from "../constants/index.js";

/** Environment-specific configuration. */
export interface EnvironmentConfig {
  /** API base URL. */
  apiBaseUrl: string;

  /** IDP token endpoint URL. */
  idpTokenUrl: string;

  /** OAuth2 client ID. */
  clientId: string;

  /** IDP logout/revocation URL. */
  idpLogoutUrl: string;
}

/** User credentials for a specific environment. */
export interface CredentialConfig {
  /** Full username (e.g., "cpj-3101234567@stag.comprobanteselectronicos.go.cr"). */
  username: string;

  /** Path to the .p12 certificate file. */
  p12Path: string;
}

/** Full application configuration. */
export interface AppConfig {
  /** Active environment. */
  environment: Environment;

  /** Per-environment credential configuration. */
  credentials: Partial<Record<Environment, CredentialConfig>>;
}
