/**
 * Independent verification of an XAdES-EPES signature over a v4.4 document.
 *
 * The response verifier (`response-verifier.ts`) authenticates what Hacienda
 * answers; this one authenticates what **we** sign: a comprobante produced by
 * the SDK, checked against a caller-reviewed leaf certificate.
 *
 * Trust model: the signer is trusted **only** because the caller pinned its
 * leaf certificate. The certificate embedded in the document never establishes
 * trust, no CA chain is validated, revocation is not checked and nothing is
 * sent over the network. A document whose signature is arithmetically correct
 * but whose signer is not pinned is **not** valid.
 *
 * Verifying a signature is not fiscal acceptance: Hacienda may still reject
 * the document.
 *
 * @module signing/document-verifier
 */
import { type Element } from "@xmldom/xmldom";
import { XMLValidator } from "fast-xml-parser";
import {
  XADES_POLICY_HASH,
  XADES_POLICY_HASH_ALGORITHM,
  XADES_POLICY_URI,
} from "@dojocoding/hacienda-shared";
import { checkXmlInput } from "../xml/input-limits.js";
import { validateDocumentIdentity } from "../xml/document-identity.js";
import {
  DS,
  XADES,
  SignatureCoreError,
  certificateValidity,
  children,
  one,
  required,
  resolvePinnedCertificate,
  signatureProfile,
  parseSignatureXml,
  textOf,
  verifySignatureBytes,
} from "./signature-core.js";

const HACIENDA_NAMESPACE_BASE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4";

/** The seven comprobante types, read from the root element, never guessed. */
export type SignedDocumentType =
  | "FacturaElectronica"
  | "NotaCreditoElectronica"
  | "NotaDebitoElectronica"
  | "TiqueteElectronico"
  | "FacturaElectronicaCompra"
  | "FacturaElectronicaExportacion"
  | "ReciboElectronicoPago";

/** Root element → the type code carried by the clave and the consecutive, and the official namespace. */
const DOCUMENT_TYPES: Record<SignedDocumentType, { code: string; namespace: string }> = {
  FacturaElectronica: {
    code: "01",
    namespace: `${HACIENDA_NAMESPACE_BASE}/facturaElectronica`,
  },
  NotaCreditoElectronica: {
    code: "03",
    namespace: `${HACIENDA_NAMESPACE_BASE}/notaCreditoElectronica`,
  },
  NotaDebitoElectronica: {
    code: "02",
    namespace: `${HACIENDA_NAMESPACE_BASE}/notaDebitoElectronica`,
  },
  TiqueteElectronico: {
    code: "04",
    namespace: `${HACIENDA_NAMESPACE_BASE}/tiqueteElectronico`,
  },
  FacturaElectronicaCompra: {
    code: "08",
    namespace: `${HACIENDA_NAMESPACE_BASE}/facturaElectronicaCompra`,
  },
  FacturaElectronicaExportacion: {
    code: "09",
    namespace: `${HACIENDA_NAMESPACE_BASE}/facturaElectronicaExportacion`,
  },
  ReciboElectronicoPago: {
    code: "10",
    namespace: `${HACIENDA_NAMESPACE_BASE}/reciboElectronicoPago`,
  },
};

/** Named, safe failure codes: they never carry XML, certificates or diagnostics. */
export type DocumentVerificationCode =
  | "InvalidInput"
  | "InvalidXml"
  | "UnsupportedDocument"
  | "NoSignature"
  | "UnsupportedSignature"
  | "CertificateExpired"
  | "CertificateNotYetValid"
  | "CertificateNotPinned"
  | "TrustNotEstablished"
  | "PolicyMismatch"
  | "IdentityMismatch"
  | "SignatureInvalid"
  | "ExternalVerifierMismatch";

export interface VerifySignedDocumentOptions {
  /**
   * Explicit reviewed leaf certificates (PEM). Trust comes from here and
   * nowhere else: the certificate embedded in the document never establishes
   * it. Without pins the result declares the trust as not established and is
   * not valid.
   */
  trustedSignerCertificates?: readonly string[];
  /** Verification instant; defaults to the current clock. */
  now?: Date;
  /**
   * A second implementation to contrast against (for example the repository's
   * libxml2 + OpenSSL oracle). It returns whether the document verifies.
   */
  externalVerifier?: (xml: string) => boolean | Promise<boolean>;
}

export interface SignedDocumentVerification {
  /** Whether every check passed. */
  valid: boolean;
  /** The document type, read from the root element; null when the root is unknown. */
  documentType: SignedDocumentType | null;
  /** The namespace of the root element, when it could be read. */
  namespace: string | null;
  /** The successful checks, named. */
  checks: {
    input: boolean;
    documentType: boolean;
    signatureProfile: boolean;
    canonicalization: boolean;
    /** The digests of every reference match the signed content. */
    digest: boolean;
    /** The RSA signature over the canonicalized `ds:SignedInfo` is valid. */
    signature: boolean;
    certificate: boolean;
    policy: boolean;
    identity: boolean;
    trust: "pinned" | "not-established" | "failed";
  };
  /** The failures, named. */
  errors: { code: DocumentVerificationCode; message: string }[];
  /** The outcome of the cross-check lane against a second implementation. */
  external: "skipped" | "passed" | "failed";
  /** SHA-256 fingerprint of the pinned signer certificate, when it was resolved. */
  signerFingerprintSha256: string | null;
}

/** Descendant lookup by namespace and local name. */
function descendant(parent: Element, ns: string, name: string): Element {
  const nodes = parent.getElementsByTagNameNS(ns, name);
  if (nodes.length !== 1) throw new SignatureCoreError("unsupported-signature");
  return required(nodes[0]);
}

/** The type of the document, read from the root element alone. */
function documentTypeOf(root: Element): SignedDocumentType | null {
  const name = root.localName ?? "";
  return Object.hasOwn(DOCUMENT_TYPES, name) ? (name as SignedDocumentType) : null;
}

/** Read the identity facts the key carries and check them against each other. */
function identityOf(root: Element, namespace: string, code: string): boolean {
  const emisor = one(root, namespace, "Emisor");
  const issuerId = one(emisor, namespace, "Identificacion");
  const emisorNumero = textOf(issuerId, namespace, "Numero");
  const emisorTipo = textOf(issuerId, namespace, "Tipo");
  const receptor = children(root, namespace, "Receptor")[0];
  const receiverId = receptor ? children(receptor, namespace, "Identificacion")[0] : undefined;
  const receptorNumero = receiverId ? textOf(receiverId, namespace, "Numero") : undefined;
  const receptorTipo = receiverId ? textOf(receiverId, namespace, "Tipo") : undefined;
  const issues = validateDocumentIdentity(
    {
      clave: textOf(root, namespace, "Clave"),
      numeroConsecutivo: textOf(root, namespace, "NumeroConsecutivo"),
      fechaEmision: textOf(root, namespace, "FechaEmision"),
      emisor: { identificacion: { numero: emisorNumero, tipo: emisorTipo } },
      ...(receptorNumero
        ? { receptor: { identificacion: { numero: receptorNumero, tipo: receptorTipo } } }
        : {}),
    },
    code,
  );
  return issues.length === 0;
}

/** The policy block: identifier, digest method and hash must match the published policy. */
function policyMatches(root: Element): boolean {
  const signature = one(root, DS, "Signature");
  const qualifying = descendant(signature, XADES, "QualifyingProperties");
  const container = qualifying.parentNode;
  if (
    !container ||
    container.nodeType !== 1 ||
    (container as Element).namespaceURI !== DS ||
    (container as Element).localName !== "Object" ||
    container.parentNode !== signature
  )
    return false;
  const signatureId = signature.getAttribute("Id");
  if (!signatureId || qualifying.getAttribute("Target") !== `#${signatureId}`) return false;
  const properties = one(qualifying, XADES, "SignedProperties");
  const id = properties.getAttribute("Id");
  const references = children(one(signature, DS, "SignedInfo"), DS, "Reference");
  if (
    !id ||
    references.filter(
      (reference) =>
        reference.getAttribute("URI") === `#${id}` &&
        reference.getAttribute("Type") === "http://uri.etsi.org/01903#SignedProperties",
    ).length !== 1
  )
    return false;
  const signedSignature = one(properties, XADES, "SignedSignatureProperties");
  const policy = one(signedSignature, XADES, "SignaturePolicyIdentifier");
  if (root.getElementsByTagNameNS(XADES, "SignaturePolicyIdentifier").length !== 1) return false;
  const identifier = descendant(policy, XADES, "Identifier").textContent?.trim() ?? "";
  const hash = descendant(policy, XADES, "SigPolicyHash");
  const method = descendant(hash, DS, "DigestMethod").getAttribute("Algorithm") ?? "";
  const value = descendant(hash, DS, "DigestValue").textContent?.trim() ?? "";
  return (
    identifier === XADES_POLICY_URI &&
    method === XADES_POLICY_HASH_ALGORITHM &&
    value === XADES_POLICY_HASH
  );
}

/** Run the external cross-check lane, when one is configured. */
async function runExternal(
  xml: string,
  options: VerifySignedDocumentOptions,
): Promise<"skipped" | "passed" | "failed"> {
  if (options.externalVerifier) {
    const verified = await options.externalVerifier(xml);
    return verified ? "passed" : "failed";
  }
  return "skipped";
}

/**
 * Verify a comprobante signed by the SDK.
 *
 * @param xml - The signed document.
 * @param options - The reviewed pins, the verification instant and the optional
 * cross-check lane.
 * @returns The named checks, the named failures and the cross-check outcome.
 */
export async function verifySignedDocumentXml(
  xml: string,
  options: VerifySignedDocumentOptions = {},
): Promise<SignedDocumentVerification> {
  const errors: { code: DocumentVerificationCode; message: string }[] = [];
  const checks: SignedDocumentVerification["checks"] = {
    input: false,
    documentType: false,
    signatureProfile: false,
    canonicalization: false,
    digest: false,
    signature: false,
    certificate: false,
    policy: false,
    identity: false,
    trust: "not-established",
  };
  const fail = (code: DocumentVerificationCode, message: string): void => {
    errors.push({ code, message });
  };
  let documentType: SignedDocumentType | null = null;
  let namespace: string | null = null;
  let fingerprint: string | null = null;
  let external: "skipped" | "passed" | "failed" = "skipped";

  if (
    options.trustedSignerCertificates !== undefined &&
    (!Array.isArray(options.trustedSignerCertificates) ||
      options.trustedSignerCertificates.length > 16 ||
      options.trustedSignerCertificates.some(
        (cert) => typeof cert !== "string" || Buffer.byteLength(cert) > 16384,
      ))
  )
    fail("InvalidInput", "The trusted certificate pins are not a valid set.");
  if (
    options.now !== undefined &&
    (!(options.now instanceof Date) || !Number.isFinite(options.now.getTime()))
  )
    fail("InvalidInput", "The verification instant is not a date.");
  if (errors.length === 0) {
    if (typeof xml !== "string" || checkXmlInput(xml) || xml.includes("\0"))
      fail("InvalidXml", "The document is not a bounded XML input.");
    else if (XMLValidator.validate(xml) !== true)
      fail("InvalidXml", "The document is not well-formed XML.");
    else {
      checks.input = true;
      let document;
      try {
        document = parseSignatureXml(xml);
      } catch {
        checks.input = false;
      }
      const root = document?.documentElement;
      if (!root || root.nodeName === "parsererror")
        fail("InvalidXml", "The document could not be parsed.");
      else {
        namespace = root.namespaceURI ?? null;
        documentType = documentTypeOf(root);
        if (!documentType)
          fail(
            "UnsupportedDocument",
            "The root element is not one of the seven comprobante types.",
          );
        else if (namespace !== DOCUMENT_TYPES[documentType].namespace)
          fail("UnsupportedDocument", "The root namespace does not match the document type.");
        else {
          checks.documentType = true;
          const signatures = root.getElementsByTagNameNS(DS, "Signature");
          if (signatures.length === 0)
            fail("NoSignature", "The document carries no ds:Signature element.");
          else {
            try {
              const { signature, certificates } = signatureProfile(root);
              checks.signatureProfile = true;
              const method = one(one(signature, DS, "SignedInfo"), DS, "CanonicalizationMethod");
              checks.canonicalization =
                method.getAttribute("Algorithm") ===
                  "http://www.w3.org/TR/2001/REC-xml-c14n-20010315" ||
                method.getAttribute("Algorithm") === "http://www.w3.org/2001/10/xml-exc-c14n#";
              const pins = options.trustedSignerCertificates ?? [];
              if (pins.length === 0) {
                checks.trust = "not-established";
                fail(
                  "TrustNotEstablished",
                  "No leaf certificate was pinned: the embedded certificate does not establish trust.",
                );
              } else {
                try {
                  const certificate = resolvePinnedCertificate(certificates, pins);
                  fingerprint = certificate.fingerprint256.replaceAll(":", "").toLowerCase();
                  checks.trust = "pinned";
                  const validity = certificateValidity(certificate, options.now ?? new Date());
                  checks.certificate = validity.state === "valid";
                  if (validity.state === "expired")
                    fail("CertificateExpired", "The signer certificate expired.");
                  else if (validity.state === "not-yet-valid")
                    fail("CertificateNotYetValid", "The signer certificate is not valid yet.");
                } catch (error) {
                  checks.trust = "failed";
                  if (error instanceof SignatureCoreError && error.reason === "untrusted-signer")
                    fail(
                      "CertificateNotPinned",
                      "The embedded certificate is not among the pinned leaf certificates.",
                    );
                  else fail("SignatureInvalid", "The signer certificate could not be verified.");
                }
              }
              if (checks.trust === "pinned") {
                try {
                  const certificate = resolvePinnedCertificate(
                    certificates,
                    options.trustedSignerCertificates ?? [],
                  );
                  await verifySignatureBytes(xml, certificate);
                  checks.digest = true;
                  checks.signature = true;
                } catch (error) {
                  if (error instanceof SignatureCoreError && error.reason === "untrusted-signer")
                    fail("CertificateNotPinned", "The embedded certificate is not pinned.");
                  else
                    fail(
                      "SignatureInvalid",
                      "The reference digests or the signature do not verify.",
                    );
                }
              }
              try {
                checks.policy = policyMatches(root);
                if (!checks.policy)
                  fail("PolicyMismatch", "The signature policy does not match the published one.");
              } catch {
                checks.policy = false;
                fail("PolicyMismatch", "The signature policy block is missing or malformed.");
              }
              try {
                checks.identity = identityOf(
                  root,
                  namespace ?? "",
                  DOCUMENT_TYPES[documentType].code,
                );
                if (!checks.identity)
                  fail("IdentityMismatch", "The key, the parties and the document do not agree.");
              } catch {
                checks.identity = false;
                fail("IdentityMismatch", "The document identity could not be read.");
              }
            } catch (error) {
              if (error instanceof SignatureCoreError && error.reason === "unsupported-signature")
                fail(
                  "UnsupportedSignature",
                  "The signature shape is outside the accepted profile.",
                );
              else fail("InvalidXml", "The signature could not be read.");
            }
          }
        }
      }
    }
  }

  // External implementations receive only bounded, well-formed input.
  if (checks.input) {
    try {
      external = await runExternal(xml, options);
    } catch {
      external = "failed";
    }
  }
  if (external !== "skipped") {
    const internallyValid = errors.length === 0;
    if (internallyValid !== (external === "passed"))
      fail(
        "ExternalVerifierMismatch",
        `The SDK verifier and the external implementation disagree (sdk: ${
          internallyValid ? "valid" : "invalid"
        }, external: ${external}).`,
      );
  }

  return {
    valid: errors.length === 0,
    documentType,
    namespace,
    checks,
    errors,
    external,
    signerFingerprintSha256: fingerprint,
  };
}
