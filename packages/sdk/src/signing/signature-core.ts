/**
 * Shared XAdES signature core.
 *
 * The strict signature profile, the pinned-leaf trust decision and the native
 * RSA verification live here so that every verifier in the SDK applies the
 * same rules: the response verifier (`response-verifier.ts`) and the document
 * verifier (`document-verifier.ts`).
 *
 * This module is internal: it is not exported from the package barrel.
 */
import { X509Certificate } from "node:crypto";
import { DOMParser, XMLSerializer, type Element, type Document } from "@xmldom/xmldom";
import * as xadesjs from "xadesjs";
import * as xmldsigjs from "xmldsigjs";
import * as xpath from "xpath";

export const DS = "http://www.w3.org/2000/09/xmldsig#";
export const XADES = "http://uri.etsi.org/01903/v1.3.2#";
export const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
export const EXCLUSIVE = "http://www.w3.org/2001/10/xml-exc-c14n#";
export const SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
export const ENVELOPED = `${DS}enveloped-signature`;
export const RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";

/** Safe reason codes: they never carry XML, certificates or parser diagnostics. */
export type SignatureCoreReason =
  | "invalid-xml"
  | "unsupported-signature"
  | "untrusted-signer"
  | "certificate-time"
  | "invalid-signature";

/** Raised by the shared core; each caller maps it to its own public error. */
export class SignatureCoreError extends Error {
  constructor(readonly reason: SignatureCoreReason) {
    super(`Signature core failure: ${reason}.`);
    this.name = "SignatureCoreError";
  }
}

function fail(reason: SignatureCoreReason): never {
  throw new SignatureCoreError(reason);
}

/** Return the value, or fail with the given reason. */
export function required<T>(
  value: T | null | undefined,
  reason: SignatureCoreReason = "invalid-xml",
): T {
  if (value === null || value === undefined) fail(reason);
  return value;
}

/** Direct element children with the given namespace and local name. */
export function children(parent: Element, ns: string, name: string): Element[] {
  return Array.from(parent.childNodes).filter(
    (node): node is Element =>
      node.nodeType === 1 &&
      (node as Element).namespaceURI === ns &&
      (node as Element).localName === name,
  );
}

/** The single child with the given namespace and local name. */
export function one(parent: Element, ns: string, name: string): Element {
  const nodes = children(parent, ns, name);
  if (nodes.length !== 1) fail("invalid-xml");
  return required(nodes[0]);
}

/** Text content of the single child with the given namespace and local name. */
export function textOf(parent: Element, ns: string, name: string): string {
  return one(parent, ns, name).textContent ?? "";
}

/** Whether `node` is `ancestor` or lives inside it. */
export function isInside(node: Element, ancestor: Element): boolean {
  for (
    let current: Element | null = node;
    current;
    current = current.parentNode?.nodeType === 1 ? (current.parentNode as Element) : null
  )
    if (current === ancestor) return true;
  return false;
}

/**
 * Enforce a deliberately bounded signature profile before library resolution.
 * The root must be signed as a whole; no XPath, XSLT, remote URI or arbitrary
 * Object refs.
 */
export function signatureProfile(root: Element): { signature: Element; certificates: Element[] } {
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

/** The certificate the caller pinned, or a failure: the embedded certificate never establishes trust. */
export function resolvePinnedCertificate(
  certificates: readonly Element[],
  pins: readonly string[],
): X509Certificate {
  const trusted = pins.map((pin) => new X509Certificate(pin));
  const embedded = certificates.map((element) => {
    const value = (element.textContent ?? "").replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length > 22000)
      fail("unsupported-signature");
    return new X509Certificate(Buffer.from(value, "base64"));
  });
  const certificate = trusted.find((pin) => embedded.some((cert) => cert.raw.equals(pin.raw)));
  if (!certificate) fail("untrusted-signer");
  if (
    certificate.publicKey.asymmetricKeyType !== "rsa" ||
    (certificate.publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 ||
    certificate.ca
  )
    fail("untrusted-signer");
  return certificate;
}

/** Validity window of the signer certificate against the verification instant. */
export function certificateValidity(
  certificate: X509Certificate,
  now: Date,
): { notBefore: number; notAfter: number; state: "valid" | "expired" | "not-yet-valid" } {
  const notBefore = Date.parse(certificate.validFrom);
  const notAfter = Date.parse(certificate.validTo);
  if (!Number.isFinite(notBefore) || !Number.isFinite(notAfter))
    return { notBefore, notAfter, state: "expired" };
  const at = now.getTime();
  if (!Number.isFinite(at)) throw new SignatureCoreError("certificate-time");
  if (at < notBefore) return { notBefore, notAfter, state: "not-yet-valid" };
  if (at > notAfter) return { notBefore, notAfter, state: "expired" };
  return { notBefore, notAfter, state: "valid" };
}

/** Parse without logging attacker-controlled diagnostics; normalize every failure. */
export function parseSignatureXml(xml: string): Document {
  try {
    return new DOMParser({
      onError: () => {
        throw new Error("Invalid XML");
      },
    }).parseFromString(xml, "application/xml");
  } catch {
    throw new SignatureCoreError("invalid-xml");
  }
}

/**
 * Verify the signature bytes with the native WebCrypto engine: the reference
 * digests and the RSA signature over the canonicalized `ds:SignedInfo`.
 */
export async function verifySignatureBytes(
  xml: string,
  certificate: X509Certificate,
): Promise<void> {
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
}
