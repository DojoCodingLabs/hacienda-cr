/**
 * Invoice submission (POST /recepcion) and status polling (GET /recepcion/{clave}).
 *
 * Provides typed wrappers over the Hacienda REST API for document
 * submission and status checking.
 *
 * @module api/submission
 */

import type {
  SubmissionRequest,
  SubmissionResponse,
  StatusResponse,
} from "@dojocoding/hacienda-shared";
import { ClaveNumericaSchema, HaciendaStatus } from "@dojocoding/hacienda-shared";

import { ApiError, ValidationError } from "../errors.js";
import { guardSubmissionIdentity } from "../delivery/submission-identity.js";
import type { SubmissionIdentityStore } from "../delivery/submission-identity.js";
import type { HttpClient, HttpResponse } from "./http-client.js";
import { getRejectionDescription } from "./error-codes.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parsed status response with decoded response XML. */
export interface ParsedStatusResponse {
  /** 50-digit clave. */
  readonly clave: string;
  /** Current processing status. */
  readonly status: HaciendaStatus;
  /** Hacienda response date (ISO 8601). */
  readonly date?: string;
  /** Decoded response XML from Hacienda (if available). */
  readonly responseXml?: string;
  /** Raw status response. */
  readonly raw: StatusResponse;
}

/** Options for {@link submitDocument}. */
export interface SubmitDocumentOptions {
  /** Abort the authentication wait, request and response read. */
  readonly signal?: AbortSignal;
  /**
   * Opt-in submission-identity guard: binds the clave to the SHA-256 of the
   * signed bytes before the POST and refuses divergent or repeated sends.
   */
  readonly identityStore?: SubmissionIdentityStore;
  /**
   * Explicitly authorize another POST of the SAME signed bytes for a clave the
   * guard already recorded. Requires `identityStore`. Use only after
   * reconciling by clave; different bytes are refused regardless.
   */
  readonly retrySameBytes?: boolean;
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/**
 * Submits a document to Hacienda (POST /recepcion).
 *
 * Sends the signed, Base64-encoded XML document along with metadata
 * to the Hacienda API for processing.
 *
 * With `options.identityStore`, the clave is bound to `sha256(signed bytes)`
 * before any network call: a different digest for a recorded clave, or a
 * second POST of the same digest without `retrySameBytes`, is refused with a
 * {@link SubmissionIdentityError}. Without a store the legacy behavior is kept.
 *
 * @param httpClient - The authenticated HTTP client.
 * @param request - The submission request payload.
 * @param options - Cancellation and the optional submission-identity guard.
 * @returns The submission response with status and location.
 * @throws {SubmissionIdentityError} When the identity guard refuses the POST.
 * @throws {ApiError} On HTTP errors:
 *   - 400: Bad request (malformed payload)
 *   - 401: Unauthorized (invalid token)
 *   - 409: Conflict (duplicate clave)
 *
 * @example
 * ```ts
 * const response = await submitDocument(httpClient, {
 *   clave: "50601...",
 *   fecha: "2025-07-27T10:30:00-06:00",
 *   emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
 *   comprobanteXml: base64SignedXml,
 * });
 * ```
 */
export async function submitDocument(
  httpClient: HttpClient,
  request: SubmissionRequest,
  options?: SubmitDocumentOptions,
): Promise<SubmissionResponse> {
  options?.signal?.throwIfAborted();
  if (options?.retrySameBytes && !options.identityStore)
    throw new ValidationError("retrySameBytes requires an identityStore.");
  if (options?.identityStore)
    await guardSubmissionIdentity(options.identityStore, request, {
      retrySameBytes: options.retrySameBytes === true,
    });
  options?.signal?.throwIfAborted();
  let response: HttpResponse<SubmissionResponse>;
  try {
    response = await httpClient.post<SubmissionResponse>("/recepcion", request, {
      ...(options?.signal ? { signal: options.signal } : {}),
      skipRetry: true,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      // Enrich the error message for known status codes
      if (error.statusCode === 409) {
        throw new ApiError(
          `Duplicate submission: a document with clave ${request.clave} has already been submitted.`,
          409,
          error.responseBody,
          error,
        );
      }
      throw error;
    }
    throw error;
  }

  return {
    status: response.status,
    location: response.headers.get("Location") ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Status polling
// ---------------------------------------------------------------------------

/**
 * Retrieves the processing status of a submitted document (GET /recepcion/{clave}).
 *
 * Queries Hacienda for the current status of a document. The response
 * may include a Base64-encoded response XML with acceptance/rejection details.
 *
 * @param httpClient - The authenticated HTTP client.
 * @param clave - The 50-digit clave numerica of the submitted document.
 * @returns Parsed status response with decoded XML.
 * @throws {ApiError} If the request fails.
 *
 * @example
 * ```ts
 * const status = await getStatus(httpClient, "50601...");
 * if (status.status === "aceptado") {
 *   console.log("Document accepted!");
 * }
 * ```
 */
export async function getStatus(
  httpClient: HttpClient,
  clave: string,
  options?: { signal?: AbortSignal },
): Promise<ParsedStatusResponse> {
  const response = await httpClient.get<StatusResponse>(`/recepcion/${clave}`, options);
  const data = response.data;

  // Decode the Base64 response XML if present
  let responseXml: string | undefined;
  if (data["respuesta-xml"]) {
    try {
      responseXml = Buffer.from(data["respuesta-xml"], "base64").toString("utf-8");
    } catch {
      // If decoding fails, leave it undefined
      responseXml = undefined;
    }
  }

  return {
    clave: data.clave,
    status: data["ind-estado"],
    date: data.fecha,
    responseXml,
    raw: data,
  };
}

/**
 * Extracts a rejection reason from a Hacienda response XML.
 *
 * Parses the decoded `respuesta-xml` to find the rejection code and
 * maps it to a human-readable description.
 *
 * @param responseXml - Decoded XML string from Hacienda's response.
 * @returns A human-readable rejection description, or undefined if not found.
 */
export function extractRejectionReason(responseXml: string): string | undefined {
  // Extract DetalleMensaje from the response XML using regex
  // (avoiding an XML parser dependency for a simple extraction)
  const detalleMatch = /<DetalleMensaje>(.*?)<\/DetalleMensaje>/s.exec(responseXml);
  const codigoMatch = /<Codigo>(\d+)<\/Codigo>/s.exec(responseXml);

  const parts: string[] = [];

  if (codigoMatch?.[1]) {
    const code = codigoMatch[1];
    parts.push(`[Code ${code}] ${getRejectionDescription(code)}`);
  }

  if (detalleMatch?.[1]) {
    parts.push(detalleMatch[1].trim());
  }

  return parts.length > 0 ? parts.join(" — ") : undefined;
}

/**
 * Determines whether a status is terminal (no further polling needed).
 *
 * @param status - The Hacienda processing status.
 * @returns True if the status is terminal (aceptado, rechazado, or error).
 */
export function isTerminalStatus(status: HaciendaStatus): boolean {
  return (
    status === HaciendaStatus.ACEPTADO ||
    status === HaciendaStatus.RECHAZADO ||
    status === HaciendaStatus.ERROR
  );
}

// ---------------------------------------------------------------------------
// Durable delivery recovery
// ---------------------------------------------------------------------------

/**
 * The status endpoint did not find the clave at `observedAt`.
 *
 * This is never proof that the POST never arrived (`conclusive` is always
 * `false`): a just-received document may not be indexed yet, and the answer
 * says nothing about a request still in flight. It is not a permission to
 * resubmit. Re-query with backoff inside a reconciliation window defined by
 * your own policy; the SDK does not define one. Any later resend must carry
 * the SAME signed bytes under the SAME clave. The submission-identity guard
 * enforces that when you pass an `identityStore`, and requires an explicit
 * `retrySameBytes: true` for the resend.
 */
export interface ReconcileNotFound {
  readonly kind: "not_found";
  /** Always `false`: absence from the status endpoint is not conclusive. */
  readonly conclusive: false;
  /** HTTP status of the response that reported the clave as unknown. */
  readonly httpStatus: 404 | 400;
  /**
   * Which recognized response shape was observed: a plain 404, or the
   * sandbox's 400 whose `X-Error-Cause` says the comprobante "no ha sido
   * recibido" (see docs/testing/sandbox-403-debug.md).
   */
  readonly evidence: "http_404" | "x_error_cause_not_received";
  /** When the response was observed (ISO 8601, local clock). */
  readonly observedAt: string;
  /** Redacted `X-Error-Cause` header, when present. */
  readonly errorCause?: string;
}

/**
 * Result of {@link reconcileByClave}.
 *
 * - `found`: Hacienda knows the clave; `status` is its current state.
 * - `not_found`: see {@link ReconcileNotFound}. Inconclusive, and never a
 *   permission to resubmit.
 * - `unknown`: the query failed (5xx, network error, timeout, any other 4xx,
 *   or a 400 that is not the recognized "no ha sido recibido" answer) or the
 *   response did not belong to the clave. Nothing is established; query
 *   again later and do not resubmit.
 */
export type ReconcileResult =
  | { readonly kind: "found"; readonly status: ParsedStatusResponse }
  | ReconcileNotFound
  | { readonly kind: "unknown"; readonly error: Error };

const CLAVE_TOKEN = /506\d{6}[A-Za-z0-9]{12}\d{29}/g;
/** Observed sandbox wording: `El comprobante [...] no ha sido recibido.` */
const NOT_RECEIVED_CAUSE = /^El comprobante\b[\s\S]{0,200}?\bno ha sido recibido\.?$/i;

/**
 * Classifies a status-query error as the "clave not found yet" answer.
 *
 * Recognizes exactly two shapes and fails closed on anything else: a 404, or
 * a 400 whose `X-Error-Cause` matches the observed sandbox text
 * "El comprobante [...] no ha sido recibido." and names no other clave.
 *
 * @internal Shared by {@link reconcileByClave} and the submit-and-wait poller.
 */
export function classifyNotYetReceived(
  error: unknown,
  clave: string,
): Pick<ReconcileNotFound, "httpStatus" | "evidence" | "errorCause"> | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const errorCause = error.errorCause?.trim();
  if (error.statusCode === 404)
    return { httpStatus: 404, evidence: "http_404", ...(errorCause ? { errorCause } : {}) };
  if (error.statusCode !== 400 || !errorCause || !NOT_RECEIVED_CAUSE.test(errorCause))
    return undefined;
  const named = errorCause.match(CLAVE_TOKEN) ?? [];
  if (named.some((other) => other !== clave)) return undefined;
  return { httpStatus: 400, evidence: "x_error_cause_not_received", errorCause };
}

/**
 * Reconciles a document after an ambiguous submission by querying its
 * status by clave (GET /recepcion/{clave}).
 *
 * This helper never submits a document or allocates a consecutive; it only
 * reads the server-side state of an existing clave. The clave is validated
 * before any network access. Cancellation through `options.signal` is
 * propagated rather than reported as `unknown`. A `not_found` result is
 * inconclusive by contract; see {@link ReconcileNotFound}.
 *
 * @param httpClient - The authenticated HTTP client.
 * @param clave - The 50-character clave (taxpayer segment may be alphanumeric).
 * @returns A discriminated {@link ReconcileResult}.
 * @throws {ValidationError} If the clave is malformed.
 */
export async function reconcileByClave(
  httpClient: HttpClient,
  clave: string,
  options?: { signal?: AbortSignal },
): Promise<ReconcileResult> {
  if (typeof clave !== "string" || !ClaveNumericaSchema.safeParse(clave).success) {
    throw new ValidationError("Invalid clave for reconciliation.");
  }
  options?.signal?.throwIfAborted();
  try {
    const status = await getStatus(httpClient, clave, options);
    if (status.clave !== clave) {
      return {
        kind: "unknown",
        error: new ApiError("Status response clave does not match the requested clave.", 200),
      };
    }
    return { kind: "found", status };
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    const notFound = classifyNotYetReceived(error, clave);
    if (notFound)
      return {
        kind: "not_found",
        conclusive: false,
        observedAt: new Date().toISOString(),
        ...notFound,
      };
    return {
      kind: "unknown",
      error: error instanceof Error ? error : new Error("Status query failed."),
    };
  }
}
