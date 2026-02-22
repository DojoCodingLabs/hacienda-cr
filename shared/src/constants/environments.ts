/**
 * Hacienda API environment configuration constants.
 *
 * Two environments: Sandbox (rut-stag) for testing and Production (rut) for live invoicing.
 */

/** Supported environments for the Hacienda API. */
export const Environment = {
  SANDBOX: "sandbox",
  PRODUCTION: "production",
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

/** API base URLs for each environment. */
export const API_BASE_URLS = {
  [Environment.SANDBOX]: "https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1",
  [Environment.PRODUCTION]: "https://api.comprobanteselectronicos.go.cr/recepcion/v1",
} as const;

/** IDP (Identity Provider) token endpoints for OAuth2 authentication. */
export const IDP_TOKEN_URLS = {
  [Environment.SANDBOX]:
    "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
  [Environment.PRODUCTION]:
    "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token",
} as const;

/** OAuth2 client IDs for each environment. */
export const CLIENT_IDS = {
  [Environment.SANDBOX]: "api-stag",
  [Environment.PRODUCTION]: "api-prod",
} as const;

/** IDP logout/revocation endpoints. */
export const IDP_LOGOUT_URLS = {
  [Environment.SANDBOX]:
    "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/logout",
  [Environment.PRODUCTION]:
    "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token/logout",
} as const;

/** Economic activity lookup API URL. */
export const ECONOMIC_ACTIVITY_API_URL = "https://api.hacienda.go.cr/fe/ae" as const;

/** Costa Rica country code used in clave numerica. */
export const COUNTRY_CODE = "506" as const;
