/** Independent libxml2 canonicalization + OpenSSL RSA verification. No network. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DOMParser, type Element } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import {
  XADES_POLICY_URI,
  XADES_POLICY_HASH,
  XADES_POLICY_HASH_ALGORITHM,
} from "@dojocoding/hacienda-shared";
import { signXml } from "./signer.js";
import { verifyWithLibxml2AndOpenSsl as oracle } from "./native-oracle.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { buildExactNotaCreditoTotalXml } from "../documents/exact-nc-builder.js";
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
const ds = "http://www.w3.org/2000/09/xmldsig#";
const xades = "http://uri.etsi.org/01903/v1.3.2#";
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing oracle fixture value");
  return value;
}
function one(parent: Element, namespace: string, name: string): Element {
  const nodes = parent.getElementsByTagNameNS(namespace, name);
  if (nodes.length !== 1) throw new Error(`Expected one ${name}`);
  return required(nodes[0]);
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
