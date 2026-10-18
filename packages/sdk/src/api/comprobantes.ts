/** Documented read-only history metadata. This API cannot recover original XML,
 * observe acceptance, infer sequence cutover or certify historical completeness. */
import {
  ComprobantesQuerySchema,
  ComprobanteClaveSchema,
  ComprobanteMetadataSchema,
  ComprobantesMetadataArraySchema,
} from "@dojocoding/hacienda-shared";
import type {
  ComprobantesQueryParams,
  ComprobantesListResponse,
  ComprobanteDetail,
} from "@dojocoding/hacienda-shared";
import { ApiError, ValidationError } from "../errors.js";
import type { HttpClient } from "./http-client.js";
export interface HistoryRequestOptions {
  readonly signal?: AbortSignal;
}
function protocol(status?: number): never {
  // Never attach raw provider data or Zod issues containing customer metadata.
  throw new ApiError("Invalid Hacienda history metadata response", status);
}
function filterMatches(
  filter: string | undefined,
  party: { tipoIdentificacion: string; numeroIdentificacion: string },
) {
  return (
    !filter ||
    (party.tipoIdentificacion === filter.slice(0, 2) &&
      /^\d{1,12}$/.test(party.numeroIdentificacion) &&
      party.numeroIdentificacion.padStart(12, "0") === filter.slice(2).padStart(12, "0"))
  );
}
/** One bounded page. 200/206 and raw range headers are observations, not proof of
 * exhaustive history or effective range semantics. No automatic continuation. */
export async function listComprobantes(
  httpClient: HttpClient,
  params?: ComprobantesQueryParams,
  options?: HistoryRequestOptions,
): Promise<ComprobantesListResponse> {
  const parsed = ComprobantesQuerySchema.safeParse(params === undefined ? {} : params);
  if (!parsed.success)
    throw new ValidationError(
      "Unsupported or invalid history filters; use offset, limit, emisor and receptor only",
    );
  options?.signal?.throwIfAborted();
  const requested = parsed.data,
    query = new URLSearchParams();
  for (const [key, value] of Object.entries(requested))
    if (value !== undefined) query.set(key, String(value));
  const response = await httpClient.get<unknown>(`/comprobantes?${query}`, {
    signal: options?.signal,
  });
  options?.signal?.throwIfAborted();
  if (response.status !== 200 && response.status !== 206) return protocol(response.status);
  const page = ComprobantesMetadataArraySchema.safeParse(response.data);
  if (
    !page.success ||
    page.data.length > requested.limit ||
    page.data.some(
      (row) =>
        !filterMatches(requested.emisor, row.emisor) ||
        !filterMatches(requested.receptor, row.receptor),
    )
  )
    return protocol(response.status);
  return {
    comprobantes: page.data,
    offset: requested.offset,
    limit: requested.limit,
    pagination: {
      httpStatus: response.status,
      acceptRange: response.headers.get("accept-range"),
      contentRange: response.headers.get("content-range"),
    },
  };
}
/** Metadata only. Never promises submitted XML/status/Hacienda response bytes. */
export async function getComprobante(
  httpClient: HttpClient,
  clave: string,
  options?: HistoryRequestOptions,
): Promise<ComprobanteDetail> {
  if (!ComprobanteClaveSchema.safeParse(clave).success)
    throw new ValidationError("History clave must match the current 50-character clave schema");
  options?.signal?.throwIfAborted();
  const response = await httpClient.get<unknown>(`/comprobantes/${clave}`, {
    signal: options?.signal,
  });
  options?.signal?.throwIfAborted();
  const detail = ComprobanteMetadataSchema.safeParse(response.data);
  if (response.status !== 200 || !detail.success || detail.data.clave !== clave)
    return protocol(response.status);
  return detail.data;
}
