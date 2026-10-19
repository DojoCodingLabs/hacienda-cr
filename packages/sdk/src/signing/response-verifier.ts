/** Authenticate the exact MensajeHacienda root against caller-reviewed leaf pins.
 * Does not acquire trust anchors, validate a CA chain, check revocation, or send HTTP.
 */
import { X509Certificate } from "node:crypto";
import { DOMParser, XMLSerializer, type Element } from "@xmldom/xmldom";
import { XMLValidator } from "fast-xml-parser";
import xpath from "xpath";
import * as xadesjs from "xadesjs";
import * as xmldsigjs from "xmldsigjs";
import { MensajeReceptorCode } from "@dojocoding/hacienda-shared";
import { ResponseVerificationError } from "../errors.js";
import { checkXmlInput } from "../xml/input-limits.js";
import { validateDocumentXml } from "../xml/schema-validator.js";

const DS = "http://www.w3.org/2000/09/xmldsig#";
const RESPONSE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda";
const XADES = "http://uri.etsi.org/01903/v1.3.2#";
const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
const EXCLUSIVE = "http://www.w3.org/2001/10/xml-exc-c14n#";
const SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
const ENVELOPED = `${DS}enveloped-signature`;
const RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";

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
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) fail("invalid-xml");
  return value;
}
function children(parent: Element, ns: string, name: string): Element[] {
  return Array.from(parent.childNodes).filter(
    (node): node is Element =>
      node.nodeType === 1 &&
      (node as Element).namespaceURI === ns &&
      (node as Element).localName === name,
  );
}
function one(parent: Element, ns: string, name: string): Element {
  const nodes = children(parent, ns, name);
  if (nodes.length !== 1) fail("invalid-xml");
  return required(nodes[0]);
}
function text(parent: Element, name: string): string {
  return one(parent, RESPONSE, name).textContent ?? "";
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
function isInside(node: Element, ancestor: Element): boolean {
  for (
    let current: Element | null = node;
    current;
    current = current.parentNode?.nodeType === 1 ? (current.parentNode as Element) : null
  )
    if (current === ancestor) return true;
  return false;
}
/** Enforce a deliberately bounded signature profile before library resolution.
 * The root must be signed as a whole; no XPath, XSLT, remote URI or arbitrary Object refs.
 */
function signatureProfile(root: Element): { signature: Element; certificates: Element[] } {
  const signatures = root.getElementsByTagNameNS(DS, "Signature");
  if (signatures.length !== 1) fail("unsupported-signature");
  const signature = one(root, DS, "Signature");
  const ids = new Map<string, Element>();
  for (const element of [root, ...Array.from(root.getElementsByTagName("*"))]) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.localName?.toLowerCase() !== "id") continue;
      // The verifier/library resolve only canonical unqualified Id. Reject aliases,
      // duplicated values and IDs outside signature metadata (root XSD has no Id).
      if (
        attribute.name !== "Id" ||
        attribute.namespaceURI ||
        !/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(attribute.value) ||
        ids.has(attribute.value) ||
        !isInside(element, signature)
      )
        fail("unsupported-signature");
      ids.set(attribute.value, element);
    }
  }
  const info = one(signature, DS, "SignedInfo");
  for (const method of [
    one(info, DS, "CanonicalizationMethod"),
    one(info, DS, "SignatureMethod"),
  ]) {
    if (Array.from(method.childNodes).some((node) => node.nodeType === 1))
      fail("unsupported-signature");
  }
  if (
    ![C14N, EXCLUSIVE].includes(
      one(info, DS, "CanonicalizationMethod").getAttribute("Algorithm") ?? "",
    ) ||
    one(info, DS, "SignatureMethod").getAttribute("Algorithm") !== RSA_SHA256
  )
    fail("unsupported-signature");
  const references = children(info, DS, "Reference");
  if (references.length < 1 || references.length > 3) fail("unsupported-signature");
  const uris = new Set<string>();
  let rootReferences = 0;
  for (const reference of references) {
    if (!reference.hasAttribute("URI")) fail("unsupported-signature");
    const uri = required(reference.getAttribute("URI"));
    if (uris.has(uri)) fail("unsupported-signature");
    uris.add(uri);
    if (
      one(reference, DS, "DigestMethod").getAttribute("Algorithm") !== SHA256 ||
      Array.from(one(reference, DS, "DigestMethod").childNodes).some((node) => node.nodeType === 1)
    )
      fail("unsupported-signature");
    const transformContainers = children(reference, DS, "Transforms");
    if (transformContainers.length > 1) fail("unsupported-signature");
    const transforms = transformContainers[0]
      ? children(transformContainers[0], DS, "Transform")
      : [];
    const algorithms = transforms.map((transform) => {
      if (Array.from(transform.childNodes).some((node) => node.nodeType === 1))
        fail("unsupported-signature");
      return transform.getAttribute("Algorithm") ?? "";
    });
    if (uri === "") {
      rootReferences++;
      if (
        algorithms.length < 1 ||
        algorithms.length > 2 ||
        algorithms[0] !== ENVELOPED ||
        (algorithms.length === 2 && ![C14N, EXCLUSIVE].includes(algorithms[1] ?? ""))
      )
        fail("unsupported-signature");
    } else {
      const target = /^#[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(uri)
        ? ids.get(uri.slice(1))
        : undefined;
      if (
        !target ||
        !(
          (target.namespaceURI === XADES && target.localName === "SignedProperties") ||
          target === children(signature, DS, "KeyInfo")[0]
        ) ||
        algorithms.length > 1 ||
        (algorithms.length === 1 && ![C14N, EXCLUSIVE].includes(algorithms[0] ?? ""))
      )
        fail("unsupported-signature");
    }
  }
  if (rootReferences !== 1) fail("unsupported-signature");
  // No remote key resolvers, alternate key values, nested manifests or nested signatures.
  const keyInfo = one(signature, DS, "KeyInfo");
  if (
    Array.from(keyInfo.childNodes).some(
      (node) =>
        node.nodeType === 1 &&
        ((node as Element).namespaceURI !== DS || (node as Element).localName !== "X509Data"),
    )
  )
    fail("unsupported-signature");
  const certificates = Array.from(keyInfo.getElementsByTagNameNS(DS, "X509Certificate"));
  if (
    certificates.length < 1 ||
    certificates.length > 8 ||
    signature.getElementsByTagNameNS(DS, "Manifest").length
  )
    fail("unsupported-signature");
  return { signature, certificates };
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
    const document = new DOMParser().parseFromString(xml, "application/xml");
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
      type: text(root, "TipoIdentificacionEmisor"),
      number: text(root, "NumeroCedulaEmisor"),
    };
    const receiverType =
      children(root, RESPONSE, "TipoIdentificacionReceptor")[0]?.textContent ?? "";
    const receiverNumber = children(root, RESPONSE, "NumeroCedulaReceptor")[0]?.textContent ?? "";
    const receiver =
      receiverType || receiverNumber ? { type: receiverType, number: receiverNumber } : null;
    const clave = text(root, "Clave");
    const total = text(root, "TotalFactura");
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
    const message = text(root, "Mensaje").trim();
    const state = text(root, "EstadoMensaje").trim().toLowerCase();
    const status =
      message === MensajeReceptorCode.ACEPTADO && state === "aceptado"
        ? "accepted"
        : message === MensajeReceptorCode.RECHAZADO && state === "rechazado"
          ? "rejected"
          : undefined;
    if (!status) fail("context-mismatch");
    const trusted = options.trustedSignerCertificates.map((cert) => new X509Certificate(cert));
    const embedded = certificates.map((element) => {
      const value = (element.textContent ?? "").replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length > 22000)
        fail("unsupported-signature");
      return new X509Certificate(Buffer.from(value, "base64"));
    });
    const certificate = trusted.find((pin) => embedded.some((cert) => cert.raw.equals(pin.raw)));
    if (!certificate) fail("untrusted-signer");
    const now = (options.now ?? new Date()).getTime();
    const before = Date.parse(certificate.validFrom);
    const after = Date.parse(certificate.validTo);
    if (!Number.isFinite(before) || !Number.isFinite(after) || now < before || now > after)
      fail("certificate-time");
    if (
      certificate.publicKey.asymmetricKeyType !== "rsa" ||
      (certificate.publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 ||
      certificate.ca
    )
      fail("untrusted-signer");
    xadesjs.setNodeDependencies({ DOMParser, XMLSerializer, xpath });
    xmldsigjs.Application.setEngine("NodeJS", globalThis.crypto as Crypto);
    const key = await globalThis.crypto.subtle.importKey(
      "spki",
      certificate.publicKey.export({ format: "der", type: "spki" }),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"],
    );
    const verifier = new xmldsigjs.SignedXml();
    const verificationDocument = xadesjs.Parse(xml);
    verifier.LoadXml(required(verificationDocument.getElementsByTagNameNS(DS, "Signature")[0]));
    if (!(await verifier.Verify({ key, content: verificationDocument.documentElement })))
      fail("invalid-signature");
    return {
      valid: true,
      clave,
      status,
      issuer,
      receiver,
      total,
      signerFingerprintSha256: certificate.fingerprint256.replaceAll(":", "").toLowerCase(),
      certificateNotBefore: new Date(before).toISOString(),
      certificateNotAfter: new Date(after).toISOString(),
    };
  } catch (error) {
    if (error instanceof ResponseVerificationError) throw error;
    // Parser/crypto exceptions can contain raw attacker-controlled XML. Do not expose causes.
    fail("invalid-signature");
  }
}
