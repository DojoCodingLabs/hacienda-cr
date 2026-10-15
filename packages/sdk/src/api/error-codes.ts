/**
 * Hacienda error and rejection code registry.
 *
 * Maps common Hacienda rejection codes and HTTP error codes to
 * descriptive, typed error messages for developer-friendly diagnostics.
 *
 * @module api/error-codes
 */

// ---------------------------------------------------------------------------
// Hacienda rejection codes (from respuesta-xml)
// ---------------------------------------------------------------------------

/** Known Hacienda rejection reason codes from MensajeHacienda. */
export const HaciendaRejectionCode = {
  /** XML schema validation failure. */
  SCHEMA_INVALID: "01",
  /** Digital signature invalid or missing. */
  SIGNATURE_INVALID: "02",
  /** Taxpayer not registered or inactive. */
  TAXPAYER_INACTIVE: "03",
  /** Emission date outside allowed range. */
  DATE_OUT_OF_RANGE: "04",
  /** Duplicate clave numerica (already submitted). */
  DUPLICATE_CLAVE: "05",
  /** Receiver taxpayer not found. */
  RECEIVER_NOT_FOUND: "06",
  /** Economic activity code invalid. */
  ACTIVITY_CODE_INVALID: "07",
  /** Tax calculation mismatch. */
  TAX_MISMATCH: "08",
  /** Total amount mismatch. */
  TOTAL_MISMATCH: "09",
  /** Sequence number out of range. */
  SEQUENCE_OUT_OF_RANGE: "10",
  /** Certificate expired or not yet valid. */
  CERTIFICATE_INVALID: "11",
  /** Currency code invalid. */
  CURRENCY_INVALID: "12",
} as const;

export type HaciendaRejectionCode =
  (typeof HaciendaRejectionCode)[keyof typeof HaciendaRejectionCode];

/** Human-readable descriptions for rejection codes. */
export const REJECTION_CODE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  "01": "XML schema validation failed. The document does not conform to the v4.4 XSD.",
  "02": "Digital signature is invalid or missing. Verify the .p12 certificate and signing process.",
  "03": "Taxpayer is not registered or is inactive in the Hacienda system.",
  "04": "Emission date is outside the allowed range (cannot be in the future or too far in the past).",
  "05": "Duplicate clave numerica. A document with this key has already been submitted.",
  "06": "Receiver taxpayer identification not found in the Hacienda registry.",
  "07": "Economic activity code is invalid or not registered for this taxpayer.",
  "08": "Tax calculation mismatch. The tax amounts in the document do not match expected values.",
  "09": "Total amount mismatch. The summary totals do not match the line item calculations.",
  "10": "Sequence number is out of the allowed range.",
  "11": "Certificate is expired, not yet valid, or revoked.",
  "12": "Currency code is invalid or not supported.",
};

// ---------------------------------------------------------------------------
// HTTP status code descriptions
// ---------------------------------------------------------------------------

/** HTTP status descriptions specific to the Hacienda API. */
export const HTTP_STATUS_DESCRIPTIONS: Readonly<Record<number, string>> = {
  201: "Document accepted for processing.",
  202: "Document received and queued for processing.",
  400: "Bad request. The submission payload is malformed or missing required fields.",
  401: "Unauthorized. The access token is invalid or expired.",
  403: "Forbidden. The taxpayer does not have permission to submit this document type.",
  404: "Not found. The clave or endpoint does not exist.",
  409: "Conflict. A document with this clave has already been submitted.",
  500: "Internal server error on the Hacienda side. Retry with backoff.",
  502: "Bad gateway. The Hacienda API is temporarily unavailable.",
  503: "Service unavailable. The Hacienda API is under maintenance or overloaded.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a descriptive message for a Hacienda rejection code.
 *
 * @param code - The rejection code string (e.g., "01", "05").
 * @returns A human-readable description, or a generic message for unknown codes.
 */
export function getRejectionDescription(code: string): string {
  return REJECTION_CODE_DESCRIPTIONS[code] ?? `Unknown Hacienda rejection code: ${code}.`;
}

/**
 * Returns a descriptive message for an HTTP status code in the Hacienda context.
 *
 * @param statusCode - The HTTP status code.
 * @returns A human-readable description, or a generic message for unknown codes.
 */
export function getHttpStatusDescription(statusCode: number): string {
  return HTTP_STATUS_DESCRIPTIONS[statusCode] ?? `HTTP ${String(statusCode)} from Hacienda API.`;
}

/**
 * Determines whether an HTTP status code is retryable.
 *
 * Only server errors (5xx) and certain network-related codes are retryable.
 * Client errors (4xx) should NOT be retried.
 *
 * @param statusCode - The HTTP status code.
 * @returns True if the request should be retried.
 */
export function isRetryableStatus(statusCode: number): boolean {
  return statusCode >= 500;
}
