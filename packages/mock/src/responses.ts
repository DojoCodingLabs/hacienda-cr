import { XMLParser, XMLValidator } from "fast-xml-parser";
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
  // Destructive projection, not general-purpose redaction: never preserve
  // attacker-provided XML, names, identifiers, attributes, CDATA or diagnostics.
  if (
    Buffer.byteLength(xml) > 1024 * 1024 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("Invalid synthetic response");
  const parsed = new XMLParser({
    parseTagValue: false,
    ignoreAttributes: true,
    removeNSPrefix: true,
  }).parse(xml) as { MensajeHacienda?: { Mensaje?: string } };
  const template = parsed.MensajeHacienda?.Mensaje === "1" ? ACCEPTED_XML : ERROR_XML;
  return template
    .replace(/<NombreEmisor>.*?<\/NombreEmisor>/s, "<NombreEmisor>EMISOR_SANITIZADO</NombreEmisor>")
    .replace(
      /<NumeroCedulaEmisor>.*?<\/NumeroCedulaEmisor>/s,
      "<NumeroCedulaEmisor>0000000000</NumeroCedulaEmisor>",
    )
    .replace(
      /<NombreReceptor>.*?<\/NombreReceptor>/s,
      "<NombreReceptor>RECEPTOR_SANITIZADO</NombreReceptor>",
    )
    .replace(
      /<NumeroCedulaReceptor>.*?<\/NumeroCedulaReceptor>/s,
      "<NumeroCedulaReceptor>0000000000</NumeroCedulaReceptor>",
    );
}

/** Builds the recorded response for a terminal outcome. */
export function recordedResponse(
  clave: string,
  outcome: "aceptado" | "rechazado" | "error",
  codigo?: string,
): RecordedResponse {
  if (!/^506\d{6}[A-Za-z0-9]{12}\d{29}$/.test(clave)) throw new Error("Invalid mock clave");
  const bind = (xml: string) => xml.replace(/<Clave>[^<]*<\/Clave>/, `<Clave>${clave}</Clave>`);
  const fecha = new Date().toISOString();
  if (outcome === "aceptado") {
    return {
      clave,
      indEstado: "aceptado",
      fecha,
      respuestaXml: toBase64Xml(bind(ACCEPTED_XML)),
    };
  }
  if (outcome === "error") {
    return {
      clave,
      indEstado: "error",
      fecha,
      respuestaXml: toBase64Xml(bind(ERROR_XML)),
    };
  }
  const code = codigo && REJECTION_XML[codigo] ? codigo : DEFAULT_REJECTION_CODE;
  const xml = REJECTION_XML[code] ?? REJECTION_XML[DEFAULT_REJECTION_CODE] ?? ERROR_XML;
  const detalle = REJECTION_DETAILS[code] ?? REJECTION_DETAILS[DEFAULT_REJECTION_CODE] ?? "";
  return {
    clave,
    indEstado: "rechazado",
    fecha,
    respuestaXml: toBase64Xml(bind(xml)),
    codigo: code,
    detalle,
  };
}
