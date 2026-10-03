import forge from "node-forge";

/** Self-signed credential for local tests; never contacts Hacienda. */
export function createTestP12(
  pin: string,
  options: { bits?: number; expiresAt?: Date; mismatchKey?: boolean } = {},
): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(options.bits ?? 2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = options.mismatchKey
    ? forge.pki.rsa.generateKeyPair(2048).publicKey
    : keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = options.expiresAt ?? new Date(Date.now() + 86400000);
  cert.setSubject([{ name: "commonName", value: "Test" }]);
  cert.setIssuer(cert.subject.attributes);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pin, { algorithm: "3des" });
  return Buffer.from(forge.asn1.toDer(asn1).getBytes(), "binary");
}
