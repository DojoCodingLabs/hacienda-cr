import { beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { X509Certificate, createHash } from "node:crypto";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "./signer.js";
import { loadP12 } from "./p12-loader.js";
import {
  verifyHaciendaResponseXml,
  type VerifyHaciendaResponseOptions,
} from "./response-verifier.js";
import { ResponseVerificationError } from "../errors.js";
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing synthetic fixture");
  return value;
}
const clave = "50617102600310123456700100001010000000001112345678";
const namespace = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda";
const unsigned = (status: "accepted" | "rejected" = "accepted", receiver = true) =>
  `<MensajeHacienda xmlns="${namespace}"><Clave>${clave}</Clave><NombreEmisor>Synthetic issuer</NombreEmisor><TipoIdentificacionEmisor>02</TipoIdentificacionEmisor><NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor>${receiver ? "<NombreReceptor>Synthetic receiver</NombreReceptor><TipoIdentificacionReceptor>01</TipoIdentificacionReceptor><NumeroCedulaReceptor>112345678</NumeroCedulaReceptor>" : ""}<Mensaje>${status === "accepted" ? "1" : "3"}</Mensaje><EstadoMensaje>${status === "accepted" ? "Aceptado" : "Rechazado"}</EstadoMensaje><DetalleMensaje>Synthetic only</DetalleMensaje><MontoTotalImpuesto>13.00000</MontoTotalImpuesto><TotalFactura>9999999999999.99999</TotalFactura></MensajeHacienda>`;
let p12: Buffer;
let signed: string;
let options: VerifyHaciendaResponseOptions;
beforeAll(async () => {
  p12 = createTestP12("synthetic-response");
  const credentials = await loadP12(p12, "synthetic-response");
  signed = await signXml(unsigned(), p12, "synthetic-response");
  options = {
    expectedClave: clave,
    expectedIssuer: { type: "02", number: "3101234567" },
    expectedReceiver: { type: "01", number: "112345678" },
    expectedTotal: "9999999999999.99999",
    trustedSignerCertificates: [credentials.certificatePem],
  };
});
const reject = async (xml: string, reason?: string, configuration = options) => {
  try {
    await verifyHaciendaResponseXml(xml, configuration);
    throw new Error("Verification unexpectedly succeeded");
  } catch (error) {
    expect(error).toBeInstanceOf(ResponseVerificationError);
    if (reason) expect(error).toHaveProperty("reason", reason);
    expect((error as Error).cause).toBeUndefined();
    expect((error as Error).message).not.toContain("Synthetic");
  }
};
describe("explicitly pinned MensajeHacienda verifier", () => {
  it("verifies all references, RSA signature, pinned signer and exact metadata without rounding", async () => {
    const result = await verifyHaciendaResponseXml(signed, options);
    expect(result).toMatchObject({
      valid: true,
      clave,
      status: "accepted",
      issuer: options.expectedIssuer,
      receiver: options.expectedReceiver,
      total: "9999999999999.99999",
    });
    expect(result.signerFingerprintSha256).toBe(
      new X509Certificate(required(options.trustedSignerCertificates[0])).fingerprint256
        .replaceAll(":", "")
        .toLowerCase(),
    );
  });
  it("performs no network lookup and captures caller context before async validation", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network prohibited"));
    const configuration = {
      ...options,
      expectedIssuer: { ...options.expectedIssuer },
      trustedSignerCertificates: [...options.trustedSignerCertificates],
    };
    try {
      const pending = verifyHaciendaResponseXml(signed, configuration);
      configuration.expectedIssuer.number = "different";
      configuration.expectedTotal = "0";
      configuration.trustedSignerCertificates.length = 0;
      expect(await pending).toMatchObject({ valid: true, total: "9999999999999.99999" });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
  it("rejects an alternate embedded key and a substituted certificate", async () => {
    await reject(
      signed.replace("</ds:KeyInfo>", "<ds:KeyValue/></ds:KeyInfo>"),
      "unsupported-signature",
    );
    const other = await loadP12(createTestP12("substitute"), "substitute");
    const otherDer = Buffer.from(other.certificateDer).toString("base64");
    await reject(
      signed.replace(/(<ds:X509Certificate[^>]*>)[^<]+/, `$1${otherDer}`),
      "untrusted-signer",
    );
    // Even authorizing the substituted leaf cannot make a signature from another key valid.
    await reject(
      signed.replace(/(<ds:X509Certificate[^>]*>)[^<]+/, `$1${otherDer}`),
      "invalid-signature",
      { ...options, trustedSignerCertificates: [other.certificatePem] },
    );
  });
  it("verifies rejection and an explicitly absent receiver", async () => {
    const xml = await signXml(unsigned("rejected", false), p12, "synthetic-response");
    expect(
      await verifyHaciendaResponseXml(xml, { ...options, expectedReceiver: null }),
    ).toMatchObject({ valid: true, status: "rejected", receiver: null });
  });
  it("rejects altered signed message content", async () => {
    await reject(signed.replace("Synthetic only", "Tampered"), "invalid-signature");
  });
  it("rejects altered signature value", async () => {
    await reject(signed.replace(/(<ds:SignatureValue[^>]*>)[A-Za-z0-9]/, "$1!"));
  });
  it("never trusts embedded KeyInfo without an explicit matching pin", async () => {
    const other = await loadP12(createTestP12("other"), "other");
    await reject(signed, "untrusted-signer", {
      ...options,
      trustedSignerCertificates: [other.certificatePem],
    });
  });
  it.each(["clave", "issuer", "receiver", "total"])(
    "binds expected %s before trusting a signed response",
    async (field) => {
      const next = { ...options };
      if (field === "clave") next.expectedClave = "9".repeat(50);
      if (field === "issuer") next.expectedIssuer = { type: "02", number: "3101999999" };
      if (field === "receiver") next.expectedReceiver = null;
      if (field === "total") next.expectedTotal = "9999999999999.99998";
      await reject(signed, "context-mismatch", next);
    },
  );
  it("rejects inconsistent terminal code and text even with a valid signature", async () => {
    await reject(
      await signXml(unsigned().replace("Aceptado", "Rechazado"), p12, "synthetic-response"),
      "context-mismatch",
    );
  });
  it("rejects expired and not-yet-valid pins using verification time", async () => {
    const certificate = new X509Certificate(required(options.trustedSignerCertificates[0]));
    await reject(signed, "certificate-time", {
      ...options,
      now: new Date(Date.parse(certificate.validTo) + 1),
    });
    await reject(signed, "certificate-time", {
      ...options,
      now: new Date(Date.parse(certificate.validFrom) - 1),
    });
  });
  it("rejects DTD, entities, excessive depth/bytes, malformed and foreign roots", async () => {
    for (const xml of [
      "<!DOCTYPE x [<!ENTITY y SYSTEM 'https://example.invalid/'>]>" + signed,
      signed.replace("Synthetic only", "<!ENTITY x 'xx'>"),
      "<x>".repeat(129) + "</x>".repeat(129),
      " ".repeat(8 * 1024 * 1024 + 1),
      "<x>",
      signed.replaceAll(namespace, "https://example.invalid/"),
    ])
      await reject(xml, "invalid-xml");
  });
  it("rejects wrapping, duplicate IDs and ambiguous signature containers", async () => {
    await reject(`<wrapper>${signed}</wrapper>`, "invalid-xml");
    const id = required(required(signed.match(/Id="([^"]+)"/))[1]);
    await reject(signed.replace("<ds:KeyInfo", `<ds:KeyInfo Id="${id}"`), "unsupported-signature");
    await reject(
      signed.replace(
        "</MensajeHacienda>",
        "<ds:Signature xmlns:ds='http://www.w3.org/2000/09/xmldsig#'/></MensajeHacienda>",
      ),
      "unsupported-signature",
    );
  });
  it("rejects external/detached references, XPath/XSLT and weak algorithms before resolution", async () => {
    for (const xml of [
      signed.replace('URI=""', 'URI="https://example.invalid/response"'),
      signed.replace('URI=""', 'URI="#unsigned"'),
      signed.replace(
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/1999/REC-xpath-19991116",
      ),
      signed.replaceAll(
        "http://www.w3.org/2001/04/xmlenc#sha256",
        "http://www.w3.org/2000/09/xmldsig#sha1",
      ),
      signed.replace(
        "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
        "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
      ),
    ])
      await reject(xml, "unsupported-signature");
  });
  it("rejects unsigned responses and malformed/empty trust or context", async () => {
    await reject(unsigned(), "unsupported-signature");
    for (const next of [
      { ...options, trustedSignerCertificates: [] },
      { ...options, expectedTotal: "Infinity" },
      { ...options, expectedTotal: "1e3" },
      { ...options, now: new Date(NaN) },
    ])
      await reject(signed, "invalid-input", next);
  });
});

describe("independent libxml2/OpenSSL response fixture", () => {
  it("verifies native-generated XMLDSig (no xadesjs signing) and rejects a signature substitution", async () => {
    const directory = mkdtempSync(join(tmpdir(), "dojo-native-response-"));
    try {
      const keyPath = join(directory, "key.pem"),
        certificatePath = join(directory, "certificate.pem");
      execFileSync(
        "openssl",
        [
          "req",
          "-x509",
          "-newkey",
          "rsa:2048",
          "-nodes",
          "-keyout",
          keyPath,
          "-out",
          certificatePath,
          "-days",
          "1",
          "-subj",
          "/CN=Synthetic response oracle",
          "-addext",
          "basicConstraints=critical,CA:FALSE",
        ],
        { stdio: "pipe", timeout: 15000 },
      );
      const certificate = readFileSync(certificatePath, "utf8");
      const canonical = (xml: string) =>
        execFileSync("xmllint", ["--nonet", "--exc-c14n", "-"], { input: xml, timeout: 5000 });
      const digest = createHash("sha256").update(canonical(unsigned())).digest("base64");
      const ds = "http://www.w3.org/2000/09/xmldsig#";
      const exclusive = "http://www.w3.org/2001/10/xml-exc-c14n#";
      const info = `<ds:SignedInfo xmlns:ds="${ds}"><ds:CanonicalizationMethod Algorithm="${exclusive}"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI=""><ds:Transforms><ds:Transform Algorithm="${ds}enveloped-signature"/><ds:Transform Algorithm="${exclusive}"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${digest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
      const signature = execFileSync("openssl", ["dgst", "-sha256", "-sign", keyPath], {
        input: canonical(info),
        timeout: 5000,
      }).toString("base64");
      const der = new X509Certificate(certificate).raw.toString("base64");
      const xml = unsigned().replace(
        "</MensajeHacienda>",
        `<ds:Signature xmlns:ds="${ds}">${info}<ds:SignatureValue>${signature}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${der}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></ds:Signature></MensajeHacienda>`,
      );
      const configuration = { ...options, trustedSignerCertificates: [certificate] };
      expect(await verifyHaciendaResponseXml(xml, configuration)).toMatchObject({
        valid: true,
        status: "accepted",
        total: "9999999999999.99999",
      });
      await reject(
        xml.replace(signature, Buffer.alloc(256).toString("base64")),
        "invalid-signature",
        configuration,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
