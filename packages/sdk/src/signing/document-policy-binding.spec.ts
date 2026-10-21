import { it, expect, vi } from "vitest";
import * as ds from "xmldsigjs";
import * as xa from "xadesjs";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as xpath from "xpath";
import { XADES_POLICY_URI, XADES_POLICY_HASH } from "@dojocoding/hacienda-shared";
import { createTestP12 } from "../__fixtures__/signing.js";
import { loadP12 } from "./p12-loader.js";
import { verifySignedDocumentXml } from "./document-verifier.js";
import { signXml } from "./signer.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
it("rejects an unsigned EPES policy appended to a valid pinned XML signature", async () => {
  xa.setNodeDependencies({ DOMParser, XMLSerializer, xpath });
  ds.Application.setEngine("NodeJS", globalThis.crypto as Crypto);
  const credentials = await loadP12(createTestP12("synthetic"), "synthetic");
  const document = xa.Parse(buildFacturaXml(SIMPLE_INVOICE));
  const signer = new ds.SignedXml();
  const result = await signer.Sign(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    credentials.privateKey,
    document,
    {
      references: [{ uri: "", hash: "SHA-256", transforms: ["enveloped", "c14n"] }],
      x509: [Buffer.from(credentials.certificateDer).toString("base64")],
    },
  );
  const signature = required(result.GetXml());
  signature.appendChild(
    required(
      xa.Parse(
        `<ds:Object xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"><xades:SignaturePolicyIdentifier><xades:SignaturePolicyId><xades:SigPolicyId><xades:Identifier>${XADES_POLICY_URI}</xades:Identifier></xades:SigPolicyId><xades:SigPolicyHash><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${XADES_POLICY_HASH}</ds:DigestValue></xades:SigPolicyHash></xades:SignaturePolicyId></xades:SignaturePolicyIdentifier></ds:Object>`,
      ).documentElement,
    ),
  );
  required(document.documentElement).appendChild(signature);
  const xml = new XMLSerializer().serializeToString(document as never);
  const verified = await verifySignedDocumentXml(xml, {
    trustedSignerCertificates: [credentials.certificatePem],
  });
  expect(verified.valid).toBe(false);
  expect(verified.errors.map((e) => e.code)).toContain("PolicyMismatch");
});
it("rejects an invalid clock without accepting certificate validity", async () => {
  const p12 = createTestP12("synthetic"),
    credentials = await loadP12(p12, "synthetic");
  const xml = await signXml(buildFacturaXml(SIMPLE_INVOICE), p12, "synthetic");
  const result = await verifySignedDocumentXml(xml, {
    trustedSignerCertificates: [credentials.certificatePem],
    now: new Date(NaN),
  });
  expect(result.valid).toBe(false);
  expect(required(result.errors[0]).code).toBe("InvalidInput");
  const wrongTarget = await verifySignedDocumentXml(
    xml.replace(/Target="[^"]+"/, 'Target="#unrelated"'),
    {
      trustedSignerCertificates: [credentials.certificatePem],
    },
  );
  expect(wrongTarget.valid).toBe(false);
  expect(wrongTarget.errors.map((error) => error.code)).toContain("PolicyMismatch");
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing required value");
  return value;
}

it("rejects namespace-invalid XML as a structured result without stderr diagnostics", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    const external = vi.fn(() => true);
    const result = await verifySignedDocumentXml(
      "<secret:FacturaElectronica><Clave>synthetic</Clave></secret:FacturaElectronica>",
      { externalVerifier: external },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("InvalidXml");
    expect(log).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
    expect(external).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
    stderr.mockRestore();
  }
});

it("accepts a signed XSD-valid anonymous-receiver tiquete without inventing identification", async () => {
  const { SIMPLE_TIQUETE } = await import("../__fixtures__/document-fixtures.js");
  const { buildTiqueteXml } = await import("../documents/tiquete-builder.js");
  const { validateDocumentXml } = await import("../xml/schema-validator.js");
  const invoice = structuredClone(SIMPLE_TIQUETE);
  invoice.receptor = { nombre: "Consumidor final" };
  const xml = buildTiqueteXml(invoice);
  expect((await validateDocumentXml(xml)).valid).toBe(true);
  const p12 = createTestP12("synthetic"),
    credentials = await loadP12(p12, "synthetic");
  const signed = await signXml(xml, p12, "synthetic");
  const verified = await verifySignedDocumentXml(signed, {
    trustedSignerCertificates: [credentials.certificatePem],
  });
  expect(verified.valid, JSON.stringify(verified.errors)).toBe(true);
});
