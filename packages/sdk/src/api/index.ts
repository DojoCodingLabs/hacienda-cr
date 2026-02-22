/**
 * API module — typed HTTP client, document submission, status polling,
 * and submit-and-wait orchestrator for the Hacienda REST API.
 *
 * @module api
 */

// HTTP client
export { HttpClient } from "./http-client.js";
export type { HttpClientOptions, RequestOptions, HttpResponse } from "./http-client.js";

// Rate limiter
export { RateLimiter } from "./rate-limiter.js";
export type { RateLimiterOptions } from "./rate-limiter.js";

// Submission & polling
export {
  submitDocument,
  getStatus,
  isTerminalStatus,
  extractRejectionReason,
} from "./submission.js";
export type { ParsedStatusResponse } from "./submission.js";

// Orchestrator
export { submitAndWait } from "./orchestrator.js";
export type { SubmitAndWaitOptions, SubmitAndWaitResult } from "./orchestrator.js";

// Retry
export { withRetry } from "./retry.js";
export type { RetryOptions } from "./retry.js";

// Comprobantes — list and detail
export { listComprobantes, getComprobante } from "./comprobantes.js";

// Taxpayer lookup
export { lookupTaxpayer } from "./taxpayer.js";
export type { TaxpayerInfo, LookupTaxpayerOptions } from "./taxpayer.js";

// Error codes
export {
  HaciendaRejectionCode,
  REJECTION_CODE_DESCRIPTIONS,
  HTTP_STATUS_DESCRIPTIONS,
  getRejectionDescription,
  getHttpStatusDescription,
  isRetryableStatus,
} from "./error-codes.js";
