/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Independent verification of XAdES-EPES v4.4 XML signatures.
 *
 * @module signing/verifier
 */
import { checkXmlInput } from "../xml/input-limits.js";
import { DOMParser } from "@xmldom/xmldom";
import * as xmldsigjs from "xmldsigjs";
import forge from "node-forge";
import { XADES_POLICY_URI, XADES_POLICY_HASH } from "@dojocoding/hacienda-shared";
import { SigningError } from "../errors.js";

export const C14N_REQUIRED = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

export interface VerifySignatureOptions {
  trustRoots?: string[];
  externalVerifierBinary?: string;
}

export interface VerifyChecks {
  input: boolean;
  digest: boolean;
  signature: boolean;
  policy: boolean;
  certificate: boolean;
  certificateChain: "ok" | "partial" | "none";
  canonicalization: boolean;
}

export interface VerifyResult {
  valid: boolean;
  errors: string[];
  checks: VerifyChecks;
  external: "skipped" | "passed" | "failed" | "error";
}

function parseXml(xml: string): any {
  const issue = checkXmlInput(xml);
  if (issue) throw new SigningError(issue);
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  if (parsed.documentElement?.nodeName === "parsererror") {
    throw new SigningError("Malformed XML cannot be verified.");
  }
  return parsed;
}

interface CertInfo {
  valid: boolean;
  expired: boolean;
  notYetValid: boolean;
  key: forge.pki.rsa.PublicKey;
  cert: forge.pki.Certificate;
}

function extractCertificate(doc: any): CertInfo {
  const certNodes = doc.getElementsByTagNameNS(
    "http://www.w3.org/2000/09/xmldsig#",
    "X509Certificate",
  );
  if (certNodes.length === 0) throw new SigningError("No X509Certificate found in KeyInfo.");
  const base64 = certNodes[0].textContent?.replace(/\s+/g, "") ?? "";
  if (!base64) throw new SigningError("X509Certificate is empty.");
  let cert: forge.pki.Certificate;
  try {
    const der = forge.util.decode64(base64);
    const asn1 = forge.asn1.fromDer(der);
    cert = forge.pki.certificateFromAsn1(asn1);
  } catch (e) {
    throw new SigningError(
      `Failed to parse signer certificate: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const now = new Date();
  if (now < cert.validity.notBefore)
    return {
      valid: false,
      expired: false,
      notYetValid: true,
      key: cert.publicKey as forge.pki.rsa.PublicKey,
      cert,
    };
  if (now > cert.validity.notAfter)
    return {
      valid: false,
      expired: true,
      notYetValid: false,
      key: cert.publicKey as forge.pki.rsa.PublicKey,
      cert,
    };
  return {
    valid: true,
    expired: false,
    notYetValid: false,
    key: cert.publicKey as forge.pki.rsa.PublicKey,
    cert,
  };
}

function allByLocalName(root: any, name: string, acc: any[] = []): any[] {
  if (root && root.nodeType === 1 && root.localName === name) acc.push(root);
  if (root && root.childNodes) {
    for (const child of root.childNodes) allByLocalName(child, name, acc);
  }
  return acc;
}

async function verifySignatureInternally(
  xml: string,
  doc: any,
): Promise<{ digestOk: boolean; sigOk: boolean; digestErr: string; sigErr: string }> {
  const signedXml = new xmldsigjs.SignedXml(doc);
  const sigNodes = doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature");
  if (sigNodes.length === 0)
    return { digestOk: false, sigOk: false, digestErr: "No Signature element found.", sigErr: "" };
  signedXml.LoadXml(sigNodes[0]);
  let digestOk = false;
  let sigOk = false;
  let digestErr = "";
  let sigErr = "";
  try {
    digestOk = await (signedXml as any).ValidateReferences(doc.documentElement);
  } catch (e) {
    digestErr = e instanceof Error ? e.message : String(e);
  }
  try {
    const keys = await (signedXml as any).GetPublicKeys();
    const res = await (signedXml as any).ValidateSignatureValue(keys);
    sigOk = res === true || res?.valid === true;
  } catch (e) {
    sigErr = e instanceof Error ? e.message : String(e);
    sigOk = false;
  }
  return { digestOk, sigOk, digestErr, sigErr };
}

function checkPolicy(doc: any, errors: string[], checks: VerifyChecks) {
  const policyIdNodes = allByLocalName(doc, "SignaturePolicyId");
  const policyIdNode = policyIdNodes[0];
  const idNodes = policyIdNode ? allByLocalName(policyIdNode, "Identifier") : [];
  const policyUri = (idNodes[0]?.textContent ?? "").trim();
  const hashNodes = policyIdNode ? allByLocalName(policyIdNode, "DigestValue") : [];
  const policyHash = (hashNodes[0]?.textContent ?? "").trim();
  const canonMethodNodes = Array.from(
    doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "CanonicalizationMethod"),
  );
  const canonAlgorithms = canonMethodNodes
    .map((n: any) => n.getAttribute("Algorithm"))
    .filter(Boolean);

  console.error("DEBUG POLICYNODE=", policyIdNodes[0] ? policyIdNodes[0].toString() : "NONE");
  console.error("DEBUG POLICYURI=", JSON.stringify(policyUri));
  console.error("DEBUG POLICYHASH=", JSON.stringify(policyHash));
  console.error("DEBUG EXPECTED=", JSON.stringify(XADES_POLICY_HASH));
  if (policyUri !== XADES_POLICY_URI) errors.push("PolicyMismatch: SignaturePolicyId differs.");
  if (policyHash !== XADES_POLICY_HASH) errors.push("PolicyMismatch: SigPolicyHash differs.");
  if (!canonAlgorithms.includes(C14N_REQUIRED))
    errors.push("CanonicalizationMismatch: C14N 1.0 missing.");

  checks.policy =
    policyUri === XADES_POLICY_URI &&
    policyHash === XADES_POLICY_HASH &&
    (canonAlgorithms.length === 0 || canonAlgorithms.includes(C14N_REQUIRED));
  checks.canonicalization = canonAlgorithms.length === 0 || canonAlgorithms.includes(C14N_REQUIRED);
}

function checkCertificate(
  certInfo: CertInfo,
  trustRoots: string[] | undefined,
  checks: VerifyChecks,
  errors: string[],
) {
  if (!certInfo.valid) {
    if (certInfo.expired) {
      checks.certificate = false;
      errors.push("CertificateExpired");
      return;
    }
    if (certInfo.notYetValid) {
      checks.certificate = false;
      errors.push("CertificateNotYetValid");
      return;
    }
  }
  checks.certificate = true;
  if (trustRoots && trustRoots.length > 0) {
    checks.certificateChain = "ok";
  } else {
    checks.certificateChain = "partial";
  }
}

async function externalLane(xml: string, externalBinary: string | undefined, result: VerifyResult) {
  const env = externalBinary || process.env.XMLSEC1_BIN;
  if (!env) {
    result.external = "skipped";
    return;
  }
  const cp = await import("node:child_process");
  try {
    cp.execFileSync(env, ["--verify", "--trusted-pem", "/dev/null", "--", "-"], {
      input: xml,
      stdio: ["pipe", "pipe", "ignore"],
    });
    result.external = "passed";
  } catch {
    result.external = "failed";
    const msg = "ExternalVerifierMismatch: internal vs xmlsec1 disagree.";
    if (!result.errors.includes(msg)) result.errors.push(msg);
  }
}

export async function verifyXmlSignature(
  xml: string,
  options: VerifySignatureOptions = {},
): Promise<VerifyResult> {
  const result: VerifyResult = {
    valid: false,
    errors: [],
    checks: {
      input: false,
      digest: false,
      signature: false,
      policy: false,
      certificate: false,
      certificateChain: "none",
      canonicalization: false,
    },
    external: "skipped",
  };

  let doc: any;
  try {
    doc = parseXml(xml);
    result.checks.input = true;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }

  let certInfo: CertInfo;
  try {
    certInfo = extractCertificate(doc);
    checkCertificate(certInfo, options.trustRoots, result.checks, result.errors);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }

  checkPolicy(doc, result.errors, result.checks);

  let internal: { digestOk: boolean; sigOk: boolean; digestErr: string; sigErr: string } = {
    digestOk: false,
    sigOk: false,
    digestErr: "",
    sigErr: "",
  };
  try {
    internal = await verifySignatureInternally(xml, doc);
  } catch (e) {
    internal = {
      digestOk: false,
      sigOk: false,
      digestErr: e instanceof Error ? e.message : String(e),
      sigErr: "",
    };
  }

  result.checks.digest = internal.digestOk;
  if (!internal.digestOk) {
    result.errors.push("DigestMismatch: " + (internal.digestErr || "Digest validation failed."));
  }

  result.checks.signature = internal.sigOk;
  if (!internal.sigOk) {
    result.errors.push("InvalidSignature: " + (internal.sigErr || "Signature validation failed."));
  }

  await externalLane(xml, options.externalVerifierBinary, result);
  if (result.external === "failed") {
    const msg = "ExternalVerifierMismatch: internal vs xmlsec1 disagree.";
    if (!result.errors.includes(msg)) result.errors.push(msg);
  }

  const allInternalOk =
    result.checks.input &&
    result.checks.digest &&
    result.checks.signature &&
    result.checks.policy &&
    result.checks.certificate &&
    result.checks.canonicalization;
  result.valid = allInternalOk && result.external !== "failed";
  return result;
}

export async function verifySigningPolicy(xml: string, options: VerifySignatureOptions = {}) {
  const res = await verifyXmlSignature(xml, options);
  return {
    valid: res.valid,
    checks: [res.checks.policy],
    errors: res.errors.filter((e) => e.includes("Policy")),
  };
}
