import { expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import {
  constants,
  createHash,
  privateEncrypt,
  publicDecrypt,
  verify,
  X509Certificate,
} from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import forge from "node-forge";
// Exercise the public SDK barrel, not an alternate verification implementation.
import { type ResponseVerificationError, verifyHaciendaResponseXml } from "../index.js";

const DS = "http://www.w3.org/2000/09/xmldsig#";
const EXCLUSIVE = "http://www.w3.org/2001/10/xml-exc-c14n#";
const clave = "50617102600310123456700100001010000000001112345678";
const message = `<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda"><Clave>${clave}</Clave><NombreEmisor>Synthetic issuer</NombreEmisor><TipoIdentificacionEmisor>02</TipoIdentificacionEmisor><NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor><Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Synthetic nested DigestAlgorithm regression only</DetalleMensaje><MontoTotalImpuesto>13.00000</MontoTotalImpuesto><TotalFactura>113.00000</TotalFactura></MensajeHacienda>`;
const canonical = (xml: string) =>
  execFileSync("xmllint", ["--nonet", "--exc-c14n", "-"], { input: xml, timeout: 5000 });
// Small independently encoded DER fixture: all lengths here deliberately stay <128.
function der(tag: number, value: Buffer): Buffer {
  expect(value.length).toBeLessThan(128);
  return Buffer.concat([Buffer.from([tag, value.length]), value]);
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing synthetic fixture");
  return value;
}
function children(value: forge.asn1.Asn1): forge.asn1.Asn1[] {
  if (!Array.isArray(value.value)) throw new Error("Expected synthetic DER sequence");
  return value.value as forge.asn1.Asn1[];
}

it("rejects advisory-shaped extra nested DigestAlgorithm children through the exported native verifier", async () => {
  const directory = mkdtempSync(join(tmpdir(), "dojo-nested-digest-"));
  let key: Buffer | undefined;
  try {
    const keyPath = join(directory, "synthetic-key.pem"),
      certificatePath = join(directory, "synthetic-certificate.pem");
    // Low exponent matches the advisory's affected key class; this test owns the
    // synthetic private key. It is a malformed-encoding regression, NOT an
    // attacker-without-private-key signature forgery demonstration.
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-pkeyopt",
        "rsa_keygen_pubexp:3",
        "-nodes",
        "-keyout",
        keyPath,
        "-out",
        certificatePath,
        "-days",
        "1",
        "-subj",
        "/CN=Synthetic advisory regression",
        "-addext",
        "basicConstraints=critical,CA:FALSE",
      ],
      { stdio: "pipe", timeout: 15000 },
    );
    key = readFileSync(keyPath);
    const certificatePem = readFileSync(certificatePath, "utf8"),
      certificate = new X509Certificate(certificatePem),
      publicKey = certificate.publicKey,
      forgeKey = forge.pki.publicKeyFromPem(
        publicKey.export({ format: "pem", type: "pkcs1" }).toString(),
      );
    expect(publicKey.asymmetricKeyDetails).toMatchObject({
      modulusLength: 2048,
      publicExponent: 3n,
    });
    expect(certificate.ca).toBe(false);
    const documentDigest = createHash("sha256").update(canonical(message)).digest("base64"),
      info = `<ds:SignedInfo xmlns:ds="${DS}"><ds:CanonicalizationMethod Algorithm="${EXCLUSIVE}"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI=""><ds:Transforms><ds:Transform Algorithm="${DS}enveloped-signature"/><ds:Transform Algorithm="${EXCLUSIVE}"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${documentDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`,
      signedInfo = canonical(info),
      digest = createHash("sha256").update(signedInfo).digest(),
      validSignature = execFileSync("openssl", ["dgst", "-sha256", "-sign", keyPath], {
        input: signedInfo,
        timeout: 5000,
      }),
      xml = (signature: Buffer) =>
        message.replace(
          "</MensajeHacienda>",
          `<ds:Signature xmlns:ds="${DS}">${info}<ds:SignatureValue>${signature.toString("base64")}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certificate.raw.toString("base64")}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></ds:Signature></MensajeHacienda>`,
        ),
      options = {
        expectedClave: clave,
        expectedIssuer: { type: "02", number: "3101234567" },
        expectedReceiver: null,
        expectedTotal: "113.00000",
        trustedSignerCertificates: [certificatePem],
      };
    // The original response has a genuine native-generated signature and exact
    // caller pin/context. Do not count arbitrary malformed XML as this regression.
    expect(verify("RSA-SHA256", signedInfo, publicKey, validSignature)).toBe(true);
    expect(forgeKey.verify(digest.toString("binary"), validSignature.toString("binary"))).toBe(
      true,
    );
    expect(await verifyHaciendaResponseXml(xml(validSignature), options)).toMatchObject({
      valid: true,
      status: "accepted",
    });
    const recovered = publicDecrypt(
        { key: publicKey, padding: constants.RSA_NO_PADDING },
        validSignature,
      ),
      delimiter = recovered.indexOf(0, 2),
      standardDigestInfo = recovered.subarray(delimiter + 1);
    expect(recovered.subarray(0, 2)).toEqual(Buffer.from([0, 1]));
    expect(delimiter).toBeGreaterThan(10);
    expect(recovered.subarray(2, delimiter).every((byte) => byte === 0xff)).toBe(true);
    expect(standardDigestInfo).toEqual(
      Buffer.concat([Buffer.from("3031300d060960864801650304020105000420", "hex"), digest]),
    );
    for (const extra of [der(0x05, Buffer.alloc(0)), der(0x04, Buffer.alloc(48, 0x41))]) {
      const algorithm = der(
          0x30,
          Buffer.concat([Buffer.from("06096086480165030402010500", "hex"), extra]),
        ),
        malformed = der(0x30, Buffer.concat([algorithm, der(0x04, digest)])),
        parsed = forge.asn1.fromDer(malformed.toString("binary"), {
          strict: true,
          parseAllBytes: true,
        }),
        top = children(parsed);
      // Extra element is INSIDE DigestAlgorithm, not top-level/trailing garbage.
      expect(top).toHaveLength(2);
      const nested = children(required(top[0]));
      expect(nested).toHaveLength(3);
      expect(forge.asn1.derToOid(required(nested[0]).value as string)).toBe(
        "2.16.840.1.101.3.4.2.1",
      );
      expect(required(top[1]).value).toBe(digest.toString("binary"));
      const encoded = Buffer.concat([
          Buffer.from([0, 1]),
          Buffer.alloc(256 - malformed.length - 3, 0xff),
          Buffer.from([0]),
          malformed,
        ]),
        malformedSignature = privateEncrypt({ key, padding: constants.RSA_NO_PADDING }, encoded);
      expect(
        publicDecrypt({ key: publicKey, padding: constants.RSA_NO_PADDING }, malformedSignature),
      ).toEqual(encoded);
      // Actual affected Forge verifier accepts this malformed nested structure,
      // with its default full-DER and PKCS#1 padding checks enabled.
      expect(
        forgeKey.verify(digest.toString("binary"), malformedSignature.toString("binary")),
      ).toBe(true);
      expect(
        forgeKey.verify(
          createHash("sha256").update("different message").digest("binary"),
          malformedSignature.toString("binary"),
        ),
      ).toBe(false);
      expect(verify("RSA-SHA256", signedInfo, publicKey, malformedSignature)).toBe(false);
      const native = vi.spyOn(globalThis.crypto.subtle, "verify"),
        forgeParser = vi.spyOn(forge.asn1, "fromDer");
      try {
        await expect(
          verifyHaciendaResponseXml(xml(malformedSignature), options),
        ).rejects.toMatchObject({
          name: "ResponseVerificationError",
          reason: "invalid-signature",
        } satisfies Partial<ResponseVerificationError>);
        expect(native).toHaveBeenCalledOnce();
        expect(await required(native.mock.results[0]).value).toBe(false);
        expect(forgeParser).not.toHaveBeenCalled();
      } finally {
        native.mockRestore();
        forgeParser.mockRestore();
      }
    }
    // The adversarial controls do not invalidate the unchanged legitimate fixture.
    expect(await verifyHaciendaResponseXml(xml(validSignature), options)).toMatchObject({
      valid: true,
    });
  } finally {
    key?.fill(0);
    rmSync(directory, { recursive: true, force: true });
  }
});
