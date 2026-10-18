/** Independent libxml2 canonicalization + OpenSSL RSA verification. No network. */
import { createHash, X509Certificate } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DOMParser, XMLSerializer, type Element } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import {
  XADES_POLICY_URI,
  XADES_POLICY_HASH,
  XADES_POLICY_HASH_ALGORITHM,
} from "@dojocoding/hacienda-shared";
import { signXml } from "./signer.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { buildExactNotaCreditoTotalXml } from "../documents/exact-nc-builder.js";
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
const ds = "http://www.w3.org/2000/09/xmldsig#";
const xades = "http://uri.etsi.org/01903/v1.3.2#";
const canonicalMethod = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing oracle fixture value");
  return value;
}
function one(parent: Element, namespace: string, name: string): Element {
  const nodes = parent.getElementsByTagNameNS(namespace, name);
  if (nodes.length !== 1) throw new Error(`Expected one ${name}`);
  return required(nodes[0]);
}
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
function oracle(xml: string): boolean {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const root = required(doc.documentElement);
  const signature = one(root, ds, "Signature");
  const info = one(signature, ds, "SignedInfo");
  if (one(info, ds, "CanonicalizationMethod").getAttribute("Algorithm") !== canonicalMethod)
    throw new Error("Unexpected canonicalization");
  const references = info.getElementsByTagNameNS(ds, "Reference");
  if (references.length !== 2) throw new Error("Expected document and properties references");
  for (const ref of Array.from(references)) {
    if (
      one(ref, ds, "DigestMethod").getAttribute("Algorithm") !==
      "http://www.w3.org/2001/04/xmlenc#sha256"
    )
      return false;
    const uri = ref.getAttribute("URI");
    let target: Element;
    if (uri === "") {
      target = root.cloneNode(true) as Element;
      const nested = one(target, ds, "Signature");
      required(nested.parentNode).removeChild(nested);
    } else {
      const candidates = Array.from(root.getElementsByTagName("*")).filter(
        (node) => node.getAttribute("Id") === uri?.slice(1),
      );
      if (!uri?.startsWith("#") || candidates.length !== 1) return false;
      target = required(candidates[0]);
    }
    const transforms = Array.from(ref.getElementsByTagNameNS(ds, "Transform")).map((node) =>
      node.getAttribute("Algorithm"),
    );
    if (
      transforms.some((value) => value !== canonicalMethod && value !== `${ds}enveloped-signature`)
    )
      return false;
    if (
      createHash("sha256").update(canonical(target)).digest("base64") !==
      one(ref, ds, "DigestValue").textContent
    )
      return false;
  }
  const cert = new X509Certificate(
    Buffer.from(required(one(signature, ds, "X509Certificate").textContent), "base64"),
  );
  const directory = mkdtempSync(join(tmpdir(), "dojo-signature-oracle-"));
  try {
    writeFileSync(
      join(directory, "public.pem"),
      cert.publicKey.export({ type: "spki", format: "pem" }),
    );
    writeFileSync(
      join(directory, "signature.bin"),
      Buffer.from(required(one(signature, ds, "SignatureValue").textContent), "base64"),
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
}
describe("reviewed policy independent oracle", () => {
  it("independently verifies the legitimate exact total NC document/properties digests and RSA signature", async () => {
    const signed = await signXml(
      buildExactNotaCreditoTotalXml(exactNcFixture()),
      createTestP12("synthetic"),
      "synthetic",
    );
    expect(oracle(signed)).toBe(true);
  });
  it("emits the primary policy digest and independently verifies all references and RSA", async () => {
    const signed = await signXml(
      buildFacturaXml(SIMPLE_INVOICE),
      createTestP12("synthetic"),
      "synthetic",
    );
    const root = required(
      new DOMParser().parseFromString(signed, "application/xml").documentElement,
    );
    const policy = one(root, xades, "SignaturePolicyId");
    expect(one(policy, xades, "Identifier").textContent).toBe(XADES_POLICY_URI);
    expect(one(policy, xades, "Identifier").hasAttribute("Qualifier")).toBe(false);
    const hash = one(policy, xades, "SigPolicyHash");
    expect(one(hash, ds, "DigestMethod").getAttribute("Algorithm")).toBe(
      XADES_POLICY_HASH_ALGORITHM,
    );
    const bytes = readFileSync(
      new URL(
        "../../schemas/2024/v4.4/Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf",
        import.meta.url,
      ),
    );
    expect(one(hash, ds, "DigestValue").textContent).toBe(
      createHash("sha256").update(bytes).digest("base64"),
    );
    expect(XADES_POLICY_HASH).toBe(createHash("sha256").update(bytes).digest("base64"));
    expect(oracle(signed)).toBe(true);
    expect(oracle(signed.replace("Empresa Test S.A.", "Altered Test S.A."))).toBe(false);
    expect(oracle(signed.replace(XADES_POLICY_HASH, "A".repeat(43) + "="))).toBe(false);
    const signatureValue = required(one(root, ds, "SignatureValue").textContent);
    const alteredSignature = (signatureValue[0] === "A" ? "B" : "A") + signatureValue.slice(1);
    expect(oracle(signed.replace(signatureValue, alteredSignature))).toBe(false);
  });
});
