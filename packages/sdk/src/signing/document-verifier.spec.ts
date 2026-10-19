/** Verification of the SDK's own signed documents against reviewed leaf pins. */
import { describe, expect, it } from "vitest";
import { createTestP12 } from "../__fixtures__/signing.js";
import { loadP12 } from "./p12-loader.js";
import { signXml } from "./signer.js";
import { verifySignedDocumentXml } from "./document-verifier.js";
import { verifyWithLibxml2AndOpenSsl } from "./native-oracle.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { GOLDEN_CORPUS } from "../golden-corpus/index.js";
import { XADES_POLICY_HASH, XADES_POLICY_URI } from "@dojocoding/hacienda-shared";

const PIN = "synthetic";

async function credential(options: { expiresAt?: Date } = {}) {
  const p12 = createTestP12(PIN, options);
  const loaded = await loadP12(p12, PIN);
  return { p12, certificatePem: loaded.certificatePem };
}

async function signedFactura(expiresAt?: Date) {
  const { p12, certificatePem } = await credential(expiresAt ? { expiresAt } : {});
  const signed = await signXml(buildFacturaXml(SIMPLE_INVOICE), p12, PIN);
  return { signed, certificatePem };
}

describe("verificación del documento firmado", () => {
  it("verifica un comprobante firmado con un pin de hoja revisado", async () => {
    const { signed, certificatePem } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documentType).toBe("FacturaElectronica");
    expect(result.checks).toMatchObject({
      input: true,
      documentType: true,
      signatureProfile: true,
      canonicalization: true,
      digest: true,
      signature: true,
      certificate: true,
      policy: true,
      identity: true,
      trust: "pinned",
    });
    expect(result.signerFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("declara el tipo por la raíz, sin inferirlo del contenido", async () => {
    const { signed, certificatePem } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.documentType).toBe("FacturaElectronica");
    expect(result.namespace).toBe(
      "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica",
    );
  });

  it("no verifica un documento sin firma", async () => {
    const result = await verifySignedDocumentXml(buildFacturaXml(SIMPLE_INVOICE), {
      trustedSignerCertificates: [await credential().then((c) => c.certificatePem)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("NoSignature");
  });

  it("rechaza un XML mal formado", async () => {
    const result = await verifySignedDocumentXml("<FacturaElectronica><oops>", {});
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("InvalidXml");
  });

  it("declara la confianza como no establecida sin pin de hoja", async () => {
    const { signed } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {});
    expect(result.valid).toBe(false);
    expect(result.checks.trust).toBe("not-established");
    expect(result.errors.map((error) => error.code)).toContain("TrustNotEstablished");
  });

  it("falla cuando el certificado embebido no está en los pins", async () => {
    const { signed } = await signedFactura();
    const other = await credential();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [other.certificatePem],
    });
    expect(result.valid).toBe(false);
    expect(result.checks.trust).toBe("failed");
    expect(result.errors.map((error) => error.code)).toContain("CertificateNotPinned");
  });

  it("falla con un certificado vencido", async () => {
    const { signed, certificatePem } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [certificatePem],
      now: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("CertificateExpired");
  });

  it("falla con un identificador de política adulterado", async () => {
    const { signed, certificatePem } = await signedFactura();
    // Only the policy identifier is altered: the root namespace shares the
    // prefix, so the replacement targets the full identifier.
    const altered = signed.replace(
      XADES_POLICY_URI,
      XADES_POLICY_URI.replace("/xml-schemas/", "/xmlschemas/"),
    );
    const result = await verifySignedDocumentXml(altered, {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("PolicyMismatch");
  });

  it("falla con un hash de política adulterado", async () => {
    const { signed, certificatePem } = await signedFactura();
    const altered = signed.replace(XADES_POLICY_HASH, "A".repeat(43) + "=");
    const result = await verifySignedDocumentXml(altered, {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("PolicyMismatch");
  });

  it("falla cuando se altera un byte del documento", async () => {
    const { signed, certificatePem } = await signedFactura();
    const altered = signed.replace("Empresa Test S.A.", "Altered Test S.A.");
    const result = await verifySignedDocumentXml(altered, {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("SignatureInvalid");
  });

  it("falla cuando se altera la firma", async () => {
    const { signed, certificatePem } = await signedFactura();
    const match = /<ds:SignatureValue[^>]*>([^<]+)</.exec(signed);
    expect(match).not.toBeNull();
    const original = match?.[1] ?? "";
    const altered = (original.startsWith("A") ? "B" : "A") + original.slice(1);
    const result = await verifySignedDocumentXml(signed.replace(original, altered), {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("SignatureInvalid");
  });
});

describe("validación cruzada con una segunda implementación", () => {
  it("omite el lane externo cuando no hay herramienta", async () => {
    const { signed, certificatePem } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [certificatePem],
    });
    expect(result.external).toBe("skipped");
    expect(result.valid).toBe(true);
  });

  it("contrasta con el oráculo de libxml2 y OpenSSL, sin red", async () => {
    const { signed, certificatePem } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [certificatePem],
      externalVerifier: verifyWithLibxml2AndOpenSsl,
    });
    expect(result.external).toBe("passed");
    expect(result.valid).toBe(true);
    expect(verifyWithLibxml2AndOpenSsl(signed.replace("Empresa Test S.A.", "Altered"))).toBe(false);
  });

  it("falla cuando el verificador externo discrepa", async () => {
    const { signed, certificatePem } = await signedFactura();
    const result = await verifySignedDocumentXml(signed, {
      trustedSignerCertificates: [certificatePem],
      externalVerifier: () => false,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("ExternalVerifierMismatch");
  });
});

describe("corpus dorado firmado", () => {
  it("verifica cada entrada firmada bajo el verificador y bajo el oráculo", async () => {
    const { p12, certificatePem } = await credential();
    for (const entry of GOLDEN_CORPUS as {
      slug: string;
      input: unknown;
      build: (input: unknown) => string;
    }[]) {
      const signed = await signXml(entry.build(entry.input), p12, PIN);
      const result = await verifySignedDocumentXml(signed, {
        trustedSignerCertificates: [certificatePem],
        externalVerifier: verifyWithLibxml2AndOpenSsl,
      });
      expect(result.errors, `${entry.slug}: ${JSON.stringify(result.errors)}`).toEqual([]);
      expect(result.valid, entry.slug).toBe(true);
      expect(verifyWithLibxml2AndOpenSsl(signed), entry.slug).toBe(true);
    }
  }, 120_000);
});
