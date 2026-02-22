/**
 * Comprobantes API endpoints — list and detail retrieval.
 *
 * Provides typed wrappers for:
 * - GET /comprobantes — List comprobantes with optional filters
 * - GET /comprobantes/{clave} — Get full details by clave
 *
 * @module api/comprobantes
 */

import type {
  ComprobantesQueryParams,
  ComprobantesListResponse,
  ComprobanteDetail,
} from "@dojocoding/hacienda-shared";

import type { HttpClient } from "./http-client.js";

// ---------------------------------------------------------------------------
// List comprobantes
// ---------------------------------------------------------------------------

/**
 * Lists comprobantes from the Hacienda API with optional filters.
 *
 * @param httpClient - The authenticated HTTP client.
 * @param params - Optional query parameters for filtering and pagination.
 * @returns Paginated list of comprobantes.
 *
 * @example
 * ```ts
 * const result = await listComprobantes(httpClient, {
 *   offset: 0,
 *   limit: 10,
 *   fechaEmisionDesde: "2025-01-01",
 *   fechaEmisionHasta: "2025-01-31",
 * });
 * ```
 */
export async function listComprobantes(
  httpClient: HttpClient,
  params?: ComprobantesQueryParams,
): Promise<ComprobantesListResponse> {
  let path = "/comprobantes";

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      path = `${path}?${qs}`;
    }
  }

  const response = await httpClient.get<ComprobantesListResponse>(path);
  return response.data;
}

// ---------------------------------------------------------------------------
// Get comprobante detail
// ---------------------------------------------------------------------------

/**
 * Gets the full details of a comprobante by its clave.
 *
 * @param httpClient - The authenticated HTTP client.
 * @param clave - The 50-digit clave numerica.
 * @returns Full comprobante details including XML payloads.
 *
 * @example
 * ```ts
 * const detail = await getComprobante(httpClient, "50601...");
 * console.log(detail.estado); // "aceptado"
 * ```
 */
export async function getComprobante(
  httpClient: HttpClient,
  clave: string,
): Promise<ComprobanteDetail> {
  const response = await httpClient.get<ComprobanteDetail>(`/comprobantes/${clave}`);
  return response.data;
}
