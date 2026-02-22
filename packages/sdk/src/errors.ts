/**
 * SDK-specific error classes.
 *
 * Provides a hierarchy of typed errors for different failure modes:
 * - {@link HaciendaError} — Base error class for all SDK errors.
 * - {@link ValidationError} — Input validation failures (Zod schema, bad args).
 * - {@link ApiError} — HTTP/network errors from the Hacienda REST API.
 * - {@link AuthenticationError} — Authentication and token lifecycle failures.
 * - {@link SigningError} — XAdES-EPES digital signature failures.
 *
 * @module errors
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * Broad error categories for SDK errors.
 *
 * These are intentionally coarse-grained. Each error subclass carries
 * a human-readable `message` and optional `cause` for detailed diagnostics.
 */
export enum HaciendaErrorCode {
  /** Input failed Zod or business-rule validation. */
  VALIDATION_FAILED = "VALIDATION_FAILED",
  /** The Hacienda REST API returned an error or was unreachable. */
  API_ERROR = "API_ERROR",
  /** Authentication or token lifecycle failure. */
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  /** XAdES-EPES signing operation failed. */
  SIGNING_FAILED = "SIGNING_FAILED",
  /** A catch-all for unexpected internal errors. */
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// ---------------------------------------------------------------------------
// Base error
// ---------------------------------------------------------------------------

/**
 * Base error class for all SDK errors.
 *
 * Every error thrown by the public API of `@dojocoding/hacienda-sdk` is an instance
 * of (or extends) this class, making it easy to catch SDK errors generically:
 *
 * ```ts
 * try {
 *   await client.authenticate();
 * } catch (err) {
 *   if (err instanceof HaciendaError) {
 *     console.error(`[${err.code}] ${err.message}`);
 *   }
 * }
 * ```
 */
export class HaciendaError extends Error {
  readonly code: HaciendaErrorCode;

  constructor(code: HaciendaErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "HaciendaError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------

/**
 * Thrown when input data fails Zod schema validation or business-rule checks.
 *
 * The `details` field carries structured information about which fields
 * failed and why (typically Zod issue objects).
 */
export class ValidationError extends HaciendaError {
  readonly details: unknown;

  constructor(message: string, details?: unknown, cause?: unknown) {
    super(HaciendaErrorCode.VALIDATION_FAILED, message, cause);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Thrown when a request to the Hacienda REST API fails.
 *
 * Captures the HTTP status code and response body (when available)
 * so callers can decide on retry strategies or surface meaningful messages.
 */
export class ApiError extends HaciendaError {
  /** HTTP status code, or `undefined` for network-level failures. */
  readonly statusCode: number | undefined;
  /** Raw response body (parsed JSON or text), if available. */
  readonly responseBody: unknown;

  constructor(message: string, statusCode?: number, responseBody?: unknown, cause?: unknown) {
    super(HaciendaErrorCode.API_ERROR, message, cause);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Thrown when authentication or token management fails.
 *
 * Wraps lower-level {@link AuthError} instances from the auth module
 * into the SDK-level error hierarchy so callers only need to catch
 * `HaciendaError` at the top level.
 */
export class AuthenticationError extends HaciendaError {
  constructor(message: string, cause?: unknown) {
    super(HaciendaErrorCode.AUTHENTICATION_FAILED, message, cause);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when XML digital signing (XAdES-EPES) fails.
 *
 * Common causes: missing/invalid .p12 file, wrong PIN, unsupported
 * key algorithm, or internal crypto errors.
 */
export class SigningError extends HaciendaError {
  constructor(message: string, cause?: unknown) {
    super(HaciendaErrorCode.SIGNING_FAILED, message, cause);
    this.name = "SigningError";
  }
}
