/** Pure outcome classifier for sandbox evidence bundles. No I/O, no imports. */

/** Extraction of codes from result classes into one exhaustive list. */
export const RESULT_CLASSES = [
  "ACCEPTED",
  "REJECTED",
  "TRANSPORT_BLOCKED",
  "PENDING",
  "INVALID_LOCAL",
];

/** HaciendaStatus values (shared/src/types/api.ts); the enum is not exported
 * from the SDK dist barrel, so the strings are matched literally. */
const FISCAL_STATUS_CLASS = {
  aceptado: "ACCEPTED",
  rechazado: "REJECTED",
  recibido: "PENDING",
  procesando: "PENDING",
  error: "TRANSPORT_BLOCKED",
};

/** Raw receipt/poll bodies may embed a fiscal response in JSON. */
const FISCAL_MARKERS = ["ind-estado", "respuesta-xml"];

/**
 * True when the parsed or raw body looks like a Hacienda fiscal response.
 * `null`/`undefined`/gateway text (HTML, Cloudflare JSON) return false.
 */
export function containsFiscalMarkers(body) {
  if (body === null || body === undefined) return false;
  if (typeof body === "string") return FISCAL_MARKERS.some((marker) => body.includes(marker));
  if (typeof body !== "object") return false;
  return FISCAL_MARKERS.some((marker) => marker in body);
}

/**
 * Class for a terminal/observed Hacienda result reported by `submitAndWait`.
 * `error` (Hacienda-side system status) is transport infra, not the document.
 */
export function classifySubmissionResult(result) {
  const status = typeof result?.status === "string" ? result.status : "";
  return FISCAL_STATUS_CLASS[status] ?? null;
}

/**
 * Class for an exception delivered by the transport/SDK path.
 * Priority: fiscal evidence → REJECTED; delivery observed → PENDING;
 * anything else (gateway 4xx/5xx, DNS/TLS, timeout before delivery) →
 * TRANSPORT_BLOCKED.
 */
export function classifyDeliveryError({
  responseFiscal = false,
  errorCauseHeader = null,
  deliveryConfirmed = false,
} = {}) {
  if (responseFiscal || (typeof errorCauseHeader === "string" && errorCauseHeader.length > 0)) {
    return "REJECTED";
  }
  if (deliveryConfirmed) return "PENDING";
  return "TRANSPORT_BLOCKED";
}

/**
 * True when the error came from the delivery/transport/SDK path and not from
 * a local pre-flight failure (validation, XSD, signature, usage guard). SDK
 * delivery errors are `ApiError` (any `statusCode`, even undefined for
 * timeouts) or `AuthenticationError`; local failures are plain `Error`s with
 * A-Z_ guard codes.
 */
export function isDeliveryError(error) {
  if (!error || typeof error !== "object") return false;
  if (typeof error.statusCode === "number") return true;
  return error.name === "ApiError" || error.name === "AuthenticationError";
}
