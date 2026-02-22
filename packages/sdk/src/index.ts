/**
 * @hacienda-cr/sdk
 *
 * Core SDK for Costa Rica electronic invoicing (Hacienda API v4.4).
 * Provides auth, XML generation, digital signing, and API client.
 */

export const PACKAGE_NAME = "@hacienda-cr/sdk" as const;

// ---------------------------------------------------------------------------
// Client — primary entry point
// ---------------------------------------------------------------------------

export { HaciendaClient, HaciendaClientOptionsSchema } from "./client.js";
export type { HaciendaClientOptions } from "./client.js";

// ---------------------------------------------------------------------------
// SDK error hierarchy
// ---------------------------------------------------------------------------

export {
  HaciendaError,
  HaciendaErrorCode,
  ValidationError,
  ApiError,
  AuthenticationError,
  SigningError,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Auth module
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Clave numerica — 50-digit key generation and parsing
// ---------------------------------------------------------------------------

export {
  buildClave,
  ClaveInputSchema,
  parseClave,
  COUNTRY_CODE,
  DocumentType,
  Situation,
  type ClaveInput,
  type ClaveParsed,
} from "./clave/index.js";

// ---------------------------------------------------------------------------
// Config — configuration file management and sequence persistence
// ---------------------------------------------------------------------------

export {
  // Config manager
  getConfigDir,
  getConfigPath,
  ensureConfigDir,
  loadConfig,
  saveConfig,
  listProfiles,
  deleteProfile,
  // Sequence store
  buildSequenceKey,
  getSequencesPath,
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  SequenceOverflowError,
  // Schemas and constants
  EnvironmentSchema,
  CedulaTypeSchema,
  ProfileSchema,
  ConfigFileSchema,
  SequenceFileSchema,
  MAX_SEQUENCE,
  DEFAULT_BRANCH,
  DEFAULT_POS,
  // Types
  type Environment as ConfigEnvironment,
  type CedulaType,
  type Profile,
  type ConfigFile,
  type ResolvedConfig,
  type SequenceFile,
  type ConfigManagerOptions,
  type SequenceStoreOptions,
} from "./config/index.js";

// XML module — XML generation and validation
export {
  buildXml,
  getNamespaceUri,
  getSchemaFragment,
  validateFacturaInput,
  type BuildXmlOptions,
  type FacturaValidationError,
  type FacturaValidationResult,
} from "./xml/index.js";

// Tax calculation module
export {
  round5,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  type LineItemTaxInput,
  type LineItemInput,
  type CalculatedLineItem,
  type InvoiceSummary,
} from "./tax/index.js";

// Document builders
export { buildFacturaXml } from "./documents/index.js";
