/**
 * Tests for the XAdES-EPES signing module.
 *
 * Uses a self-signed .p12 certificate generated at runtime for testing.
 * These tests verify the signing pipeline produces valid XML with
 * the expected signature elements — NOT that the signature is accepted
 * by Hacienda (which requires a real certificate).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { signXml, signAndEncode } from "./signer.js";
import { loadP12 } from "./p12-loader.js";
import { SigningError } from "../errors.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>50601012300310123456700100001010000000001199999999</Clave>
  <CodigoActividad>620100</CodigoActividad>
  <NumeroConsecutivo>00100001010000000001</NumeroConsecutivo>
  <FechaEmision>2025-07-27T10:30:00-06:00</FechaEmision>
  <Emisor>
    <Nombre>Test Empresa S.A.</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>3101234567</Numero>
    </Identificacion>
  </Emisor>
  <ResumenFactura>
    <TotalComprobante>1000.00</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>`;

const TEST_P12_PIN = "test1234";

let tempDir: string;
let p12Buffer: Buffer;

// ---------------------------------------------------------------------------
// Setup: Generate self-signed .p12 certificate
// ---------------------------------------------------------------------------

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "hacienda-signing-test-"));

  const keyPath = join(tempDir, "test.key");
  const certPath = join(tempDir, "test.crt");
  const p12Path = join(tempDir, "test.p12");

  try {
    // Generate RSA 2048 private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: "pipe" });

    // Generate self-signed certificate
    execSync(
      `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=Test/O=TestOrg/C=CR"`,
      { stdio: "pipe" },
    );

    // Create .p12 file (use -legacy for openssl 3.x compatibility with node-forge)
    try {
      execSync(
        `openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -passout pass:${TEST_P12_PIN} -legacy`,
        { stdio: "pipe" },
      );
    } catch {
      // If -legacy flag is not supported (openssl < 3.0), try without it
      execSync(
        `openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -passout pass:${TEST_P12_PIN}`,
        { stdio: "pipe" },
      );
    }

    p12Buffer = readFileSync(p12Path);
  } catch (error) {
    // If openssl is not available, skip tests gracefully
    console.warn("openssl not available, signing tests will be skipped:", error);
  }

  return () => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };
});

// ---------------------------------------------------------------------------
// P12 Loader Tests
// ---------------------------------------------------------------------------

describe("loadP12", () => {
  it("extracts private key and certificate from a valid .p12 file", async () => {
    if (!p12Buffer) return;

    const credentials = await loadP12(p12Buffer, TEST_P12_PIN);

    expect(credentials.privateKey).toBeDefined();
    expect(credentials.privateKey.type).toBe("private");
    expect(credentials.certificateDer).toBeInstanceOf(ArrayBuffer);
    expect(credentials.certificateDer.byteLength).toBeGreaterThan(0);
    expect(credentials.certificatePem).toContain("-----BEGIN CERTIFICATE-----");
    expect(credentials.certificatePem).toContain("-----END CERTIFICATE-----");
  });

  it("throws SigningError for wrong PIN", async () => {
    if (!p12Buffer) return;

    await expect(loadP12(p12Buffer, "wrong-pin")).rejects.toThrow(SigningError);
  });

  it("throws SigningError for invalid .p12 data", async () => {
    const invalidBuffer = Buffer.from("not a p12 file");

    await expect(loadP12(invalidBuffer, "any-pin")).rejects.toThrow(SigningError);
  });

  it("throws SigningError for empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);

    await expect(loadP12(emptyBuffer, "any-pin")).rejects.toThrow(SigningError);
  });
});

// ---------------------------------------------------------------------------
// signXml Tests
// ---------------------------------------------------------------------------

describe("signXml", () => {
  it("produces signed XML with a Signature element", async () => {
    if (!p12Buffer) return;

    const signedXml = await signXml(SAMPLE_XML, p12Buffer, TEST_P12_PIN);

    expect(signedXml).toContain("<ds:Signature");
    expect(signedXml).toContain("</ds:Signature>");
  });

  it("includes SignatureValue in the signed XML", async () => {
    if (!p12Buffer) return;

    const signedXml = await signXml(SAMPLE_XML, p12Buffer, TEST_P12_PIN);

    expect(signedXml).toContain("<ds:SignatureValue");
  });

  it("includes KeyInfo with X509 certificate data", async () => {
    if (!p12Buffer) return;

    const signedXml = await signXml(SAMPLE_XML, p12Buffer, TEST_P12_PIN);

    expect(signedXml).toContain("<ds:KeyInfo");
    expect(signedXml).toContain("<ds:X509Certificate>");
  });

  it("includes XAdES signed properties", async () => {
    if (!p12Buffer) return;

    const signedXml = await signXml(SAMPLE_XML, p12Buffer, TEST_P12_PIN);

    // Should contain XAdES elements (SignedProperties, SigningCertificate, etc.)
    expect(signedXml).toContain("SignedProperties");
  });

  it("preserves the original document content", async () => {
    if (!p12Buffer) return;

    const signedXml = await signXml(SAMPLE_XML, p12Buffer, TEST_P12_PIN);

    expect(signedXml).toContain(
      "<Clave>50601012300310123456700100001010000000001199999999</Clave>",
    );
    expect(signedXml).toContain("<Nombre>Test Empresa S.A.</Nombre>");
    expect(signedXml).toContain("<TotalComprobante>1000.00</TotalComprobante>");
  });

  it("throws SigningError for wrong PIN", async () => {
    if (!p12Buffer) return;

    await expect(signXml(SAMPLE_XML, p12Buffer, "wrong-pin")).rejects.toThrow(SigningError);
  });

  it("throws SigningError for invalid certificate", async () => {
    const invalidP12 = Buffer.from("not a p12 file");

    await expect(signXml(SAMPLE_XML, invalidP12, "any-pin")).rejects.toThrow(SigningError);
  });
});

// ---------------------------------------------------------------------------
// signAndEncode Tests
// ---------------------------------------------------------------------------

describe("signAndEncode", () => {
  it("returns a valid Base64 string", async () => {
    if (!p12Buffer) return;

    const base64 = await signAndEncode(SAMPLE_XML, p12Buffer, TEST_P12_PIN);

    // Validate it's proper Base64
    expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);

    // Decode and verify it contains signed XML
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    expect(decoded).toContain("<ds:Signature");
    expect(decoded).toContain("<Clave>");
  });

  it("produces a string longer than the original XML (due to signature)", async () => {
    if (!p12Buffer) return;

    const base64 = await signAndEncode(SAMPLE_XML, p12Buffer, TEST_P12_PIN);
    const originalBase64Length = Buffer.from(SAMPLE_XML).toString("base64").length;

    // The signed version should be significantly larger
    expect(base64.length).toBeGreaterThan(originalBase64Length);
  });

  it("throws SigningError for invalid inputs", async () => {
    const invalidP12 = Buffer.from("not a p12 file");

    await expect(signAndEncode(SAMPLE_XML, invalidP12, "any-pin")).rejects.toThrow(SigningError);
  });
});
