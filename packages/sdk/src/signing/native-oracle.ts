/**
 * Independent cross-check of an XAdES signature with native tools.
 *
 * `libxml2` (`xmllint --c14n`) owns the canonical bytes and OpenSSL owns the
 * RSA verification, so neither the SDK's engine nor its canonicalization is
 * trusted for the comparison. No network and no credentials are involved.
 *
 * The module is internal to the repository: it is not exported from the
 * package barrel, because it requires `libxml2-utils` and `openssl` on the
 * host.
 *
 * @module signing/native-oracle
 */
import { createHash, X509Certificate } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DOMParser, XMLSerializer, type Element } from "@xmldom/xmldom";
import { DS, C14N, required } from "./signature-core.js";

/** The single descendant with the given namespace and local name. */
function one(parent: Element, namespace: string, name: string): Element {
  const nodes = parent.getElementsByTagNameNS(namespace, name);
  if (nodes.length !== 1) throw new Error(`Expected one ${name}`);
  return required(nodes[0]);
}

/** Canonical bytes of an element, produced by libxml2. */
function canonical(element: Element): Buffer {
  const clone = element.cloneNode(true) as Element;
  // Inclusive canonicalization includes all in-scope ancestor namespaces.
  // Namespace fixup is explicit; libxml2 owns canonical byte generation.
  let ancestor = element.parentNode;
  while (ancestor?.nodeType === 1) {
    const attributes = (ancestor as Element).attributes;
    for (let n = 0; n < attributes.length; n++) {
      const attr = required(attributes.item(n));
      if ((attr.name === "xmlns" || attr.prefix === "xmlns") && !clone.hasAttribute(attr.name))
        clone.setAttributeNS("http://www.w3.org/2000/xmlns/", attr.name, attr.value);
    }
    ancestor = ancestor.parentNode;
  }
  return execFileSync("xmllint", ["--nonet", "--c14n", "-"], {
    input: new XMLSerializer().serializeToString(clone),
    timeout: 5000,
  });
}

/**
 * Verify a signed document with libxml2 + OpenSSL.
 *
 * @param xml - The signed document.
 * @returns Whether the reference digests and the RSA signature verify.
 */
export function verifyWithLibxml2AndOpenSsl(xml: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const root = required(doc.documentElement);
    const signature = one(root, DS, "Signature");
    const info = one(signature, DS, "SignedInfo");
    if (one(info, DS, "CanonicalizationMethod").getAttribute("Algorithm") !== C14N)
      throw new Error("Unexpected canonicalization");
    const references = info.getElementsByTagNameNS(DS, "Reference");
    if (references.length !== 2) throw new Error("Expected document and properties references");
    for (const ref of Array.from(references)) {
      if (
        one(ref, DS, "DigestMethod").getAttribute("Algorithm") !==
        "http://www.w3.org/2001/04/xmlenc#sha256"
      )
        return false;
      const uri = ref.getAttribute("URI");
      let target: Element;
      if (uri === "") {
        target = root.cloneNode(true) as Element;
        const nested = one(target, DS, "Signature");
        required(nested.parentNode).removeChild(nested);
      } else {
        const candidates = Array.from(root.getElementsByTagName("*")).filter(
          (node) => node.getAttribute("Id") === uri?.slice(1),
        );
        if (!uri?.startsWith("#") || candidates.length !== 1) return false;
        target = required(candidates[0]);
      }
      const transforms = Array.from(ref.getElementsByTagNameNS(DS, "Transform")).map((node) =>
        node.getAttribute("Algorithm"),
      );
      if (transforms.some((value) => value !== C14N && value !== `${DS}enveloped-signature`))
        return false;
      if (
        createHash("sha256").update(canonical(target)).digest("base64") !==
        one(ref, DS, "DigestValue").textContent
      )
        return false;
    }
    const cert = new X509Certificate(
      Buffer.from(required(one(signature, DS, "X509Certificate").textContent), "base64"),
    );
    const directory = mkdtempSync(join(tmpdir(), "dojo-signature-oracle-"));
    try {
      writeFileSync(
        join(directory, "public.pem"),
        cert.publicKey.export({ type: "spki", format: "pem" }),
      );
      writeFileSync(
        join(directory, "signature.bin"),
        Buffer.from(required(one(signature, DS, "SignatureValue").textContent), "base64"),
      );
      execFileSync(
        "openssl",
        [
          "dgst",
          "-sha256",
          "-verify",
          join(directory, "public.pem"),
          "-signature",
          join(directory, "signature.bin"),
        ],
        { input: canonical(info), stdio: ["pipe", "pipe", "pipe"], timeout: 5000 },
      );
      return true;
    } catch {
      return false;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  } catch {
    return false;
  }
}
