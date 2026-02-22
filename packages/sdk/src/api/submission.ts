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
import { HaciendaStatus } from "@dojocoding/hacienda-shared";

import { ApiError } from "../errors.js";
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

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/**
 * Submits a document to Hacienda (POST /recepcion).
 *
 * Sends the signed, Base64-encoded XML document along with metadata
 * to the Hacienda API for processing.
 *
 * @param httpClient - The authenticated HTTP client.
 * @param request - The submission request payload.
 * @returns The submission response with status and location.
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
): Promise<SubmissionResponse> {
  let response: HttpResponse<SubmissionResponse>;
  try {
    response = await httpClient.post<SubmissionResponse>("/recepcion", request);
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
): Promise<ParsedStatusResponse> {
  const response = await httpClient.get<StatusResponse>(`/recepcion/${clave}`);
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
