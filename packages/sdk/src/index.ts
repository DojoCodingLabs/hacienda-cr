/**
 * @dojocoding/hacienda-sdk
 *
 * Core SDK for Costa Rica electronic invoicing (Hacienda API v4.4).
 * Provides auth, XML generation, digital signing, and API client.
 */

export const PACKAGE_NAME = "@dojocoding/hacienda-sdk" as const;

// ---------------------------------------------------------------------------
// Client — primary entry point
// ---------------------------------------------------------------------------

export { HaciendaClient, HaciendaClientOptionsSchema } from "./client.js";
export type { HaciendaClientOptions } from "./client.js";

// ---------------------------------------------------------------------------
// Bootstrap — convenience auth helper for CLI / MCP consumers
// ---------------------------------------------------------------------------

export { bootstrapClient } from "./bootstrap.js";
export type { BootstrapResult, BootstrapOptions } from "./bootstrap.js";

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
  ResponseVerificationError,
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
  validateDocumentXml,
  type DocumentXmlValidationResult,
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
export {
  buildFacturaXml,
  buildTiqueteXml,
  buildNotaCreditoXml,
  buildNotaDebitoXml,
  buildFacturaCompraXml,
  buildFacturaExportacionXml,
  buildReciboPagoXml,
  buildMensajeReceptorXml,
  parseDocumentXml,
} from "./documents/index.js";
export type { ParsedDocument, ParseDocumentResult } from "./documents/index.js";

// ---------------------------------------------------------------------------
// Logging module — structured logging
// ---------------------------------------------------------------------------

export { Logger, LogLevel, noopLogger, sanitizeLogString, redactSecrets } from "./logging/index.js";
export type { LoggerOptions, LogFormat, LogWriter, LogEntry } from "./logging/index.js";

// ---------------------------------------------------------------------------
// Signing module — XAdES-EPES digital signature
// ---------------------------------------------------------------------------

export {
  loadP12,
  signXml,
  signAndEncode,
  verifyHaciendaResponseXml,
  verifySignedDocumentXml,
} from "./signing/index.js";
export type {
  P12Credentials,
  SignXmlOptions,
  XadesPolicyConfig,
  DocumentVerificationCode,
  SignedDocumentType,
  SignedDocumentVerification,
  VerifySignedDocumentOptions,
} from "./signing/index.js";

// ---------------------------------------------------------------------------
// API module — HTTP client, submission, polling, orchestrator
// ---------------------------------------------------------------------------

export {
  HttpClient,
  RateLimiter,
  submitDocument,
  getStatus,
  isTerminalStatus,
  extractRejectionReason,
  submitAndWait,
  withRetry,
  listComprobantes,
  getComprobante,
  lookupTaxpayer,
} from "./api/index.js";
export type {
  HistoryRequestOptions,
  HttpClientOptions,
  RequestOptions,
  HttpResponse,
  RateLimiterOptions,
  ParsedStatusResponse,
  SubmitAndWaitOptions,
  SubmitAndWaitResult,
  RetryOptions,
  TaxpayerInfo,
  LookupTaxpayerOptions,
} from "./api/index.js";
export {
  HaciendaRejectionCode,
  REJECTION_CODE_DESCRIPTIONS,
  HTTP_STATUS_DESCRIPTIONS,
  getRejectionDescription,
  getHttpStatusDescription,
  isRetryableStatus,
} from "./api/index.js";

export type { ResponseVerificationReason } from "./errors.js";
export type {
  ResponsePartyIdentity,
  VerifyHaciendaResponseOptions,
  VerifiedHaciendaResponse,
} from "./signing/index.js";

export { calculateExactFe, calculateRetainedExactFe } from "./tax/exact-fe.js";
export { buildExactFacturaXml } from "./documents/exact-fe-builder.js";
export type {
  ExactFeInput,
  RetainedExactFeInput,
  ExactFeCalculated,
} from "@dojocoding/hacienda-shared";

export { calculateExactNcTotal } from "./tax/exact-nc.js";
export { buildExactNotaCreditoTotalXml } from "./documents/exact-nc-builder.js";
export type { ExactNcTotalInput, ExactNcTotalCalculated } from "@dojocoding/hacienda-shared";

export { calculateExactTe } from "./tax/exact-te.js";
export { buildExactTiqueteXml } from "./documents/exact-te-builder.js";
export type { ExactTeInput, ExactTeCalculated } from "@dojocoding/hacienda-shared";

export { calculateExactNd } from "./tax/exact-nd.js";
export { buildExactNotaDebitoXml } from "./documents/exact-nd-builder.js";
export type { ExactNdInput, ExactNdCalculated } from "@dojocoding/hacienda-shared";

export { calculateExactFec } from "./tax/exact-fec.js";
export { buildExactFacturaCompraXml } from "./documents/exact-fec-builder.js";
export type { ExactFecInput, ExactFecCalculated } from "@dojocoding/hacienda-shared";

export { calculateExactNcPartial } from "./tax/exact-nc-partial.js";
export { buildExactNotaCreditoPartialXml } from "./documents/exact-nc-partial-builder.js";
export { calculateExactFeReplacement } from "./tax/exact-fe-replacement.js";
export { buildExactFacturaReplacementXml } from "./documents/exact-fe-replacement-builder.js";
export type {
  ExactNcPartialInput,
  ExactNcPartialCalculated,
  ExactFeReplacementInput,
  ExactFeReplacementCalculated,
} from "@dojocoding/hacienda-shared";

export { calculateExactFecForeignServiceIva13 } from "./tax/exact-fec-foreign-service.js";
export { buildExactFacturaCompraForeignServiceIva13Xml } from "./documents/exact-fec-foreign-service-builder.js";
export type {
  ExactFecForeignServiceIva13Input,
  ExactFecForeignServiceIva13Calculated,
} from "@dojocoding/hacienda-shared";

export { buildExactMensajeReceptorXml } from "./documents/exact-recipient-message-builder.js";
export type { ExactRecipientMessageInput } from "@dojocoding/hacienda-shared";

export { calculateExactFecUsedPersonalGoodsNonSubject } from "./tax/exact-fec-used-personal.js";
export { buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml } from "./documents/exact-fec-used-personal-builder.js";
export type {
  ExactFecUsedPersonalGoodsNonSubjectInput,
  ExactFecUsedPersonalGoodsNonSubjectCalculated,
} from "@dojocoding/hacienda-shared";
