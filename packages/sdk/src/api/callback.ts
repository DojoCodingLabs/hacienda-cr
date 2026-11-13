import { z } from "zod";
import { validateDocumentXml } from "../xml/index.js";
import { ValidationError } from "../errors.js";

export const CallbackEnvelopeSchema = z.object({
  clave: z.string().regex(/^\d{50}$/),
  fecha: z.string().min(1),
  indEstado: z.string().min(1),
  respuestaXml: z.string().optional(),
});

export type CallbackEnvelope = z.infer<typeof CallbackEnvelopeSchema>;

export interface ParsedCallbackPayload {
  readonly clave: string;
  readonly fecha: string;
  readonly indEstado: string;
  readonly responseXml?: string;
  readonly raw: unknown;
}

export function validateCallbackPayload(body: unknown): CallbackEnvelope {
  const normalized = typeof body === "string" ? JSON.parse(body) : body;
  return CallbackEnvelopeSchema.parse(normalized);
}

export async function parseCallbackPayload(body: unknown): Promise<ParsedCallbackPayload> {
  const envelope = validateCallbackPayload(body);
  let responseXml: string | undefined;
  if (envelope.respuestaXml) {
    let decoded: string;
    try {
      decoded = Buffer.from(envelope.respuestaXml, "base64").toString("utf8");
    } catch (error) {
      throw new ValidationError("Invalid callback response encoding.", undefined, error);
    }
    const validation = await validateDocumentXml(decoded);
    if (!validation.valid) {
      throw new ValidationError("Invalid callback response XML.", validation.issues);
    }
    responseXml = decoded;
  }
  return {
    clave: envelope.clave,
    fecha: envelope.fecha,
    indEstado: envelope.indEstado,
    responseXml,
    raw: typeof body === "string" ? JSON.parse(body) : body,
  };
}
