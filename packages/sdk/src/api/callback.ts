/**
 * Parser for the asynchronous callback Hacienda POSTs to a submission's
 * `callbackUrl`.
 *
 * The body uses the same keys as `GET /recepcion/{clave}`: `clave`, `fecha`,
 * `ind-estado` and an optional Base64 `respuesta-xml` (a signed
 * `MensajeHacienda`). Structural validation here does not authenticate the
 * signature; use `verifyHaciendaResponseXml` with pinned signer certificates
 * before trusting the response.
 *
 * @module api/callback
 */

import { DOMParser } from "@xmldom/xmldom";
import { z } from "zod";
import { ClaveNumericaSchema, HaciendaStatus } from "@dojocoding/hacienda-shared";
import { validateDocumentXml } from "../xml/index.js";
import { ValidationError } from "../errors.js";

/** Maximum UTF-8 size of a JSON callback body passed as a string. */
export const MAX_CALLBACK_BODY_BYTES = 1024 * 1024;
/** Maximum decoded size of `respuesta-xml`. */
export const MAX_CALLBACK_RESPONSE_XML_BYTES = 512 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_CALLBACK_RESPONSE_XML_BYTES / 3) * 4;
const STRICT_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MENSAJE_HACIENDA_NS =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda";

const HACIENDA_STATUS_VALUES = Object.values(HaciendaStatus) as [
  HaciendaStatus,
  ...HaciendaStatus[],
];

/** Schema for the callback envelope, using Hacienda's hyphenated keys. */
export const CallbackEnvelopeSchema = z.object({
  clave: ClaveNumericaSchema,
  fecha: z.string().min(1).max(100),
  "ind-estado": z.enum(HACIENDA_STATUS_VALUES),
  "respuesta-xml": z
    .string()
    .min(1)
    .max(MAX_BASE64_LENGTH)
    .regex(STRICT_BASE64, "respuesta-xml must be strict Base64")
    .optional(),
});

export type CallbackEnvelope = z.infer<typeof CallbackEnvelopeSchema>;

/** A validated callback with its decoded response XML. */
export interface ParsedCallbackPayload {
  readonly clave: string;
  readonly fecha: string;
  /** Hacienda's `ind-estado`. */
  readonly status: HaciendaStatus;
  /** Decoded, structurally validated `MensajeHacienda` (signature not authenticated). */
  readonly responseXml?: string;
  /** The parsed JSON body. */
  readonly raw: unknown;
}

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  if (Buffer.byteLength(body, "utf8") > MAX_CALLBACK_BODY_BYTES) {
    throw new ValidationError(
      `Callback body exceeds the ${String(MAX_CALLBACK_BODY_BYTES)}-byte limit.`,
    );
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    // Parser messages may echo body fragments; never include them.
    throw new ValidationError("Callback body is not valid JSON.");
  }
}

function validateEnvelope(raw: unknown): CallbackEnvelope {
  const result = CallbackEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(
      "Invalid callback envelope.",
      result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  return result.data;
}

/**
 * Validates a callback body (a JSON string or an already-parsed object)
 * without decoding `respuesta-xml`.
 *
 * @throws {ValidationError} On malformed JSON, oversize input or an invalid envelope.
 */
export function validateCallbackPayload(body: unknown): CallbackEnvelope {
  return validateEnvelope(parseBody(body));
}

/**
 * Validates a callback body and decodes its `respuesta-xml`.
 *
 * The decoded XML must be a `MensajeHacienda` that passes XSD validation with
 * a required signature, and its `Clave` must equal the envelope clave.
 *
 * @throws {ValidationError} On any malformed, oversize or mismatched input.
 */
export async function parseCallbackPayload(body: unknown): Promise<ParsedCallbackPayload> {
  const raw = parseBody(body);
  const envelope = validateEnvelope(raw);
  const encoded = envelope["respuesta-xml"];
  let responseXml: string | undefined;
  if (encoded !== undefined) {
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.byteLength > MAX_CALLBACK_RESPONSE_XML_BYTES) {
      throw new ValidationError("Callback response XML exceeds the size limit.");
    }
    let decoded: string;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ValidationError("Callback response XML is not valid UTF-8.");
    }
    const validation = await validateDocumentXml(decoded, { requireSignature: true });
    if (!validation.valid) {
      throw new ValidationError("Invalid callback response XML.", validation.issues);
    }
    if (validation.rootElement !== "MensajeHacienda") {
      throw new ValidationError("Callback response XML must be a MensajeHacienda.");
    }
    const root = new DOMParser().parseFromString(decoded, "application/xml").documentElement;
    const claves = root
      ? Array.from(root.childNodes).filter(
          (node) =>
            node.nodeType === 1 &&
            node.localName === "Clave" &&
            node.namespaceURI === MENSAJE_HACIENDA_NS,
        )
      : [];
    if (claves.length !== 1 || claves[0]?.textContent !== envelope.clave) {
      throw new ValidationError("Callback response XML clave does not match the envelope clave.");
    }
    responseXml = decoded;
  }
  return {
    clave: envelope.clave,
    fecha: envelope.fecha,
    status: envelope["ind-estado"],
    responseXml,
    raw,
  };
}
