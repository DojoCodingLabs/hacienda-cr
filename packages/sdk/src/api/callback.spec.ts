import { beforeAll, describe, expect, it } from "vitest";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
import { ValidationError } from "../errors.js";
import {
  MAX_CALLBACK_BODY_BYTES,
  MAX_CALLBACK_RESPONSE_XML_BYTES,
  parseCallbackPayload,
  validateCallbackPayload,
} from "./callback.js";

const clave = "50617102600310123456700100001010000000001112345678";
const namespace = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda";
const mensaje = (innerClave = clave) =>
  `<MensajeHacienda xmlns="${namespace}"><Clave>${innerClave}</Clave><NombreEmisor>Synthetic issuer</NombreEmisor><TipoIdentificacionEmisor>02</TipoIdentificacionEmisor><NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor><NombreReceptor>Synthetic receiver</NombreReceptor><TipoIdentificacionReceptor>01</TipoIdentificacionReceptor><NumeroCedulaReceptor>112345678</NumeroCedulaReceptor><Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Synthetic only</DetalleMensaje><MontoTotalImpuesto>13.00000</MontoTotalImpuesto><TotalFactura>113.00000</TotalFactura></MensajeHacienda>`;
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const envelope = (overrides: Record<string, unknown> = {}) => ({
  clave,
  fecha: "2026-01-01T00:00:00-06:00",
  "ind-estado": "aceptado",
  ...overrides,
});

let p12: Buffer;
let signed: string;
beforeAll(async () => {
  p12 = createTestP12("synthetic-callback");
  signed = await signXml(mensaje(), p12, "synthetic-callback");
});

async function expectValidationError(promise: Promise<unknown>, message?: string | RegExp) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ValidationError);
  if (message) expect((error as Error).message).toMatch(message);
}

describe("validateCallbackPayload", () => {
  it("accepts an envelope without respuesta-xml (pending state)", () => {
    const result = validateCallbackPayload(envelope({ "ind-estado": "recibido" }));
    expect(result).toEqual({
      clave,
      fecha: "2026-01-01T00:00:00-06:00",
      "ind-estado": "recibido",
    });
  });

  it("accepts an alphanumeric taxpayer segment, like the shared clave schema", () => {
    const alnum = "506171026" + "AB12345678CD" + clave.slice(21);
    expect(validateCallbackPayload(envelope({ clave: alnum })).clave).toBe(alnum);
  });

  it("throws ValidationError, not SyntaxError, on malformed JSON", () => {
    expect(() => validateCallbackPayload("{bad")).toThrow(ValidationError);
    expect(() => validateCallbackPayload("{bad")).toThrow("Callback body is not valid JSON.");
  });

  it("rejects an oversize JSON string before parsing", () => {
    const body = JSON.stringify(envelope({ padding: "x".repeat(MAX_CALLBACK_BODY_BYTES) }));
    expect(() => validateCallbackPayload(body)).toThrow(/byte limit/);
  });

  it("rejects the camelCase keys Hacienda does not send", () => {
    expect(() =>
      validateCallbackPayload({ clave, fecha: "2026-01-01T00:00:00-06:00", indEstado: "aceptado" }),
    ).toThrow(ValidationError);
  });

  it.each([
    ["missing clave", { clave: undefined }],
    ["short clave", { clave: clave.slice(1) }],
    ["unknown ind-estado", { "ind-estado": "ACEPTADO" }],
    ["invented ind-estado", { "ind-estado": "anulado" }],
    ["empty respuesta-xml", { "respuesta-xml": "" }],
    ["non-strict base64", { "respuesta-xml": "PE1l bnNh" }],
    ["base64url", { "respuesta-xml": "PE1l-_8=" }],
    ["bad padding", { "respuesta-xml": "PE1lb=" }],
  ])("rejects %s", (_name, overrides) => {
    expect(() => validateCallbackPayload(envelope(overrides))).toThrow(ValidationError);
  });
});

describe("parseCallbackPayload", () => {
  it("parses a signed MensajeHacienda bound to the envelope clave, parsing JSON once", async () => {
    const body = JSON.stringify(envelope({ "respuesta-xml": b64(signed) }));
    const result = await parseCallbackPayload(body);
    expect(result.clave).toBe(clave);
    expect(result.status).toBe("aceptado");
    expect(result.responseXml).toBe(signed);
    expect(result.raw).toEqual(JSON.parse(body));
  });

  it("parses a valid envelope without XML", async () => {
    const result = await parseCallbackPayload(envelope({ "ind-estado": "procesando" }));
    expect(result.status).toBe("procesando");
    expect(result.responseXml).toBeUndefined();
  });

  it("requires a signature on the response XML", async () => {
    await expectValidationError(
      parseCallbackPayload(envelope({ "respuesta-xml": b64(mensaje()) })),
      "Invalid callback response XML.",
    );
  });

  it("requires MensajeHacienda as the root element", async () => {
    const other = await signXml(
      `<MensajeReceptor xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeReceptor"><Clave>${clave}</Clave></MensajeReceptor>`,
      p12,
      "synthetic-callback",
    );
    await expectValidationError(parseCallbackPayload(envelope({ "respuesta-xml": b64(other) })));
  });

  it("binds the inner clave to the envelope clave", async () => {
    const otherClave = clave.slice(0, -1) + "9";
    const mismatched = await signXml(mensaje(otherClave), p12, "synthetic-callback");
    await expectValidationError(
      parseCallbackPayload(envelope({ "respuesta-xml": b64(mismatched) })),
      "Callback response XML clave does not match the envelope clave.",
    );
  });

  it("rejects decoded XML above the byte cap", async () => {
    const huge = Buffer.alloc(MAX_CALLBACK_RESPONSE_XML_BYTES + 3, 0x20).toString("base64");
    await expectValidationError(parseCallbackPayload(envelope({ "respuesta-xml": huge })));
  });

  it("rejects decoded bytes that are not UTF-8", async () => {
    const invalid = Buffer.from([0x3c, 0xff, 0xfe, 0x3e]).toString("base64");
    await expectValidationError(
      parseCallbackPayload(envelope({ "respuesta-xml": invalid })),
      "Callback response XML is not valid UTF-8.",
    );
  });

  it("throws ValidationError on malformed JSON", async () => {
    await expectValidationError(parseCallbackPayload("{bad"), "Callback body is not valid JSON.");
  });
});
