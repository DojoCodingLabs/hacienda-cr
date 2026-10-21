import { MensajeReceptorCode } from "@dojocoding/hacienda-shared";
/** Authenticate the exact MensajeHacienda root against caller-reviewed leaf pins.
 * Does not acquire trust anchors, validate a CA chain, check revocation, or send HTTP.
 */
import { XMLValidator } from "fast-xml-parser";
import { ResponseVerificationError } from "../errors.js";
import { checkXmlInput } from "../xml/input-limits.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import {
  SignatureCoreError,
  certificateValidity,
  children,
  required,
  resolvePinnedCertificate,
  signatureProfile,
  parseSignatureXml,
  textOf,
  verifySignatureBytes,
} from "./signature-core.js";

const RESPONSE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda";

export interface ResponsePartyIdentity {
  type: string;
  number: string;
}
export interface VerifyHaciendaResponseOptions {
  expectedClave: string;
  expectedIssuer: ResponsePartyIdentity;
  /** null explicitly requires no receptor identity (for example a TE without receptor). */
  expectedReceiver: ResponsePartyIdentity | null;
  /** Exact decimal text, compared without binary floating-point conversion. */
  expectedTotal: string;
  /** Explicit reviewed leaf certificates; embedded KeyInfo never establishes trust. */
  trustedSignerCertificates: readonly string[];
  /** Verification time defaults to the current clock; fixed values are for deterministic tests. */
  now?: Date;
}
export interface VerifiedHaciendaResponse {
  valid: true;
  clave: string;
  status: "accepted" | "rejected";
  issuer: ResponsePartyIdentity;
  receiver: ResponsePartyIdentity | null;
  total: string;
  signerFingerprintSha256: string;
  certificateNotBefore: string;
  certificateNotAfter: string;
}
function fail(reason: ConstructorParameters<typeof ResponseVerificationError>[0]): never {
  throw new ResponseVerificationError(reason);
}
function validParty(value: unknown): value is ResponsePartyIdentity {
  if (!value || typeof value !== "object") return false;
  const item = value as ResponsePartyIdentity;
  return (
    /^0[1-6]$/.test(item.type) &&
    typeof item.number === "string" &&
    item.number.length > 0 &&
    item.number.length <= 20 &&
    !Array.from(item.number).some((character) => character <= " ")
  );
}
function decimal(value: string): string | undefined {
  if (typeof value !== "string" || !/^\+?\d{1,18}(?:\.\d{1,5})?$/.test(value)) return undefined;
  const [integer, fraction = ""] = value.replace(/^\+/, "").split(".");
  return `${required(integer).replace(/^0+(?=\d)/, "")}.${fraction.padEnd(5, "0")}`;
}
export async function verifyHaciendaResponseXml(
  xml: string,
  options: VerifyHaciendaResponseOptions,
): Promise<VerifiedHaciendaResponse> {
  try {
    if (
      !options ||
      !/^\d{50}$/.test(options.expectedClave) ||
      !validParty(options.expectedIssuer) ||
      !(options.expectedReceiver === null || validParty(options.expectedReceiver)) ||
      !decimal(options.expectedTotal) ||
      !Array.isArray(options.trustedSignerCertificates) ||
      options.trustedSignerCertificates.length < 1 ||
      options.trustedSignerCertificates.length > 16 ||
      options.trustedSignerCertificates.some(
        (cert) => typeof cert !== "string" || Buffer.byteLength(cert) > 16384,
      ) ||
      (options.now !== undefined &&
        (!(options.now instanceof Date) || !Number.isFinite(options.now.getTime())))
    )
      fail("invalid-input");
    // Capture trusted caller configuration before the asynchronous schema worker.
    options = {
      ...options,
      expectedIssuer: { ...options.expectedIssuer },
      expectedReceiver: options.expectedReceiver === null ? null : { ...options.expectedReceiver },
      trustedSignerCertificates: [...options.trustedSignerCertificates],
      ...(options.now ? { now: new Date(options.now.getTime()) } : {}),
    };
    if (
      typeof xml !== "string" ||
      checkXmlInput(xml) ||
      xml.includes("\0") ||
      XMLValidator.validate(xml) !== true
    )
      fail("invalid-xml");
    const document = parseSignatureXml(xml);
    const root = document.documentElement;
    if (
      !root ||
      root.localName !== "MensajeHacienda" ||
      root.namespaceURI !== RESPONSE ||
      document.getElementsByTagNameNS(RESPONSE, "MensajeHacienda").length !== 1
    )
      fail("invalid-xml");
    const { certificates } = signatureProfile(root);
    const schema = await validateDocumentXml(xml, { requireSignature: true });
    if (!schema.valid || !schema.hasSignature) fail("invalid-xml");
    const issuer = {
      type: textOf(root, RESPONSE, "TipoIdentificacionEmisor"),
      number: textOf(root, RESPONSE, "NumeroCedulaEmisor"),
    };
    const receiverType =
      children(root, RESPONSE, "TipoIdentificacionReceptor")[0]?.textContent ?? "";
    const receiverNumber = children(root, RESPONSE, "NumeroCedulaReceptor")[0]?.textContent ?? "";
    const receiver =
      receiverType || receiverNumber ? { type: receiverType, number: receiverNumber } : null;
    const clave = textOf(root, RESPONSE, "Clave");
    const total = textOf(root, RESPONSE, "TotalFactura");
    const sameParty = (
      actual: ResponsePartyIdentity | null,
      expected: ResponsePartyIdentity | null,
    ) =>
      actual === null
        ? expected === null
        : expected !== null && actual.type === expected.type && actual.number === expected.number;
    if (
      clave !== options.expectedClave ||
      !sameParty(issuer, options.expectedIssuer) ||
      !sameParty(receiver, options.expectedReceiver) ||
      !decimal(total) ||
      decimal(total) !== decimal(options.expectedTotal)
    )
      fail("context-mismatch");
    const message = textOf(root, RESPONSE, "Mensaje").trim();
    const state = textOf(root, RESPONSE, "EstadoMensaje").trim().toLowerCase();
    const status =
      message === MensajeReceptorCode.ACEPTADO && state === "aceptado"
        ? "accepted"
        : message === MensajeReceptorCode.RECHAZADO && state === "rechazado"
          ? "rejected"
          : undefined;
    if (!status) fail("context-mismatch");
    const certificate = resolvePinnedCertificate(certificates, options.trustedSignerCertificates);
    const validity = certificateValidity(certificate, options.now ?? new Date());
    if (validity.state !== "valid") fail("certificate-time");
    await verifySignatureBytes(xml, certificate);
    return {
      valid: true,
      clave,
      status,
      issuer,
      receiver,
      total,
      signerFingerprintSha256: certificate.fingerprint256.replaceAll(":", "").toLowerCase(),
      certificateNotBefore: new Date(validity.notBefore).toISOString(),
      certificateNotAfter: new Date(validity.notAfter).toISOString(),
    };
  } catch (error) {
    if (error instanceof ResponseVerificationError) throw error;
    if (error instanceof SignatureCoreError) fail(error.reason);
    // Parser/crypto exceptions can contain raw attacker-controlled XML. Do not expose causes.
    fail("invalid-signature");
  }
}
