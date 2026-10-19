/**
 * Response helpers over the sanitized recorded payloads.
 *
 * @module mock/responses
 */
import {
  ACCEPTED_XML,
  DEFAULT_REJECTION_CODE,
  ERROR_XML,
  REJECTION_DETAILS,
  REJECTION_XML,
} from "./__fixtures__/recorded-responses.js";
import type { RecordedResponse } from "./types.js";

/** Encodes a sanitized payload the way the Hacienda API returns it. */
export function toBase64Xml(xml: string): string {
  return Buffer.from(xml, "utf8").toString("base64");
}

/**
 * Sanitizes a `MensajeHacienda` XML payload before it is recorded.
 *
 * Removes anything that could carry taxpayer data: the emisor/receptor
 * names, identification numbers and the signature placeholder are replaced
 * with fixed placeholders.
 */
export function sanitizeResponseXml(xml: string): string {
  return xml
    .replace(/(<NombreEmisor>)[^<]*(<\/NombreEmisor>)/g, "$1EMISOR_SANITIZADO$2")
    .replace(/(<NumeroCedulaEmisor>)[^<]*(<\/NumeroCedulaEmisor>)/g, "$1CEDULA_SANITIZADA$2")
    .replace(/(<NombreReceptor>)[^<]*(<\/NombreReceptor>)/g, "$1RECEPTOR_SANITIZADO$2")
    .replace(/(<NumeroCedulaReceptor>)[^<]*(<\/NumeroCedulaReceptor>)/g, "$1CEDULA_SANITIZADA$2")
    .replace(/(<ds:SignatureValue>)[^<]*(<\/ds:SignatureValue>)/g, "$1PLACEHOLDER$2")
    .replace(/(<ds:DigestValue>)[^<]*(<\/ds:DigestValue>)/g, "$1PLACEHOLDER$2");
}

/** Builds the recorded response for a terminal outcome. */
export function recordedResponse(
  clave: string,
  outcome: "aceptado" | "rechazado" | "error",
  codigo?: string,
): RecordedResponse {
  const fecha = new Date().toISOString();
  if (outcome === "aceptado") {
    return {
      clave,
      indEstado: "aceptado",
      fecha,
      respuestaXml: toBase64Xml(ACCEPTED_XML),
    };
  }
  if (outcome === "error") {
    return {
      clave,
      indEstado: "error",
      fecha,
      respuestaXml: toBase64Xml(ERROR_XML),
    };
  }
  const code = codigo && REJECTION_XML[codigo] ? codigo : DEFAULT_REJECTION_CODE;
  const xml = REJECTION_XML[code] ?? REJECTION_XML[DEFAULT_REJECTION_CODE] ?? ERROR_XML;
  const detalle = REJECTION_DETAILS[code] ?? REJECTION_DETAILS[DEFAULT_REJECTION_CODE] ?? "";
  return {
    clave,
    indEstado: "rechazado",
    fecha,
    respuestaXml: toBase64Xml(xml),
    codigo: code,
    detalle,
  };
}
