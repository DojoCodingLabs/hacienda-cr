/**
 * PKCS#12 (.p12) certificate loader.
 *
 * Extracts the private key and X.509 certificate from a .p12 file
 * using `node-forge` for parsing and Node.js native `crypto` for
 * WebCrypto key import.
 *
 * @module signing/p12-loader
 */

import { createPrivateKey } from "node:crypto";
import forge from "node-forge";

import { SigningError } from "../errors.js";
import type { P12Credentials } from "./types.js";

// ---------------------------------------------------------------------------
// OID constants (not in @types/node-forge but present at runtime)
// ---------------------------------------------------------------------------

/** OID for PKCS#8 shrouded key bag. */
const OID_PKCS8_SHROUDED_KEY_BAG = "1.2.840.113549.1.12.10.1.2";

/** OID for certificate bag. */
const OID_CERT_BAG = "1.2.840.113549.1.12.10.1.3";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts the private key and certificate from a PKCS#12 (.p12) file.
 *
 * Uses `node-forge` for ASN.1 parsing and `node:crypto` as a bridge
 * to import the key into WebCrypto (RSASSA-PKCS1-v1_5 with SHA-256).
 *
 * @param p12Buffer - Raw bytes of the .p12 file.
 * @param pin - Password/PIN for the .p12 file.
 * @returns Extracted private key (as CryptoKey) and certificate.
 * @throws {SigningError} If the .p12 cannot be parsed or credentials extracted.
 */
export async function loadP12(p12Buffer: Buffer, pin: string): Promise<P12Credentials> {
  try {
    // 1. Parse the PKCS#12 structure with node-forge
    const p12DerString = forge.util.binary.raw.encode(new Uint8Array(p12Buffer));
    const p12Asn1 = forge.asn1.fromDer(p12DerString);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pin);

    // 2. Extract the private key
    const keyBags = p12.getBags({ bagType: OID_PKCS8_SHROUDED_KEY_BAG });
    const keyBagArray = keyBags[OID_PKCS8_SHROUDED_KEY_BAG];

    if (!keyBagArray || keyBagArray.length === 0 || !keyBagArray[0]?.key) {
      throw new SigningError("No private key found in .p12 file.");
    }

    const forgeKey = keyBagArray[0].key;
    const pemKey = forge.pki.privateKeyToPem(forgeKey);

    // 3. Extract the certificate
    const certBags = p12.getBags({ bagType: OID_CERT_BAG });
    const certBagArray = certBags[OID_CERT_BAG];

    if (!certBagArray || certBagArray.length === 0 || !certBagArray[0]?.cert) {
      throw new SigningError("No certificate found in .p12 file.");
    }

    const forgeCert = certBagArray[0].cert;

    // 4. Convert certificate to DER and PEM
    const certDerBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(forgeCert)).getBytes();
    const certificateDer = bufferFromBinaryString(certDerBytes);
    const certificatePem = forge.pki.certificateToPem(forgeCert);

    // 5. Import private key into WebCrypto via node:crypto bridge
    //    forge PEM (PKCS#1 RSA) -> node:crypto KeyObject -> PKCS#8 DER -> WebCrypto
    const nodeKeyObject = createPrivateKey(pemKey);
    const pkcs8Der = nodeKeyObject.export({ type: "pkcs8", format: "der" });

    const privateKey = await globalThis.crypto.subtle.importKey(
      "pkcs8",
      pkcs8Der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    // 6. Get certificate DER as a proper ArrayBuffer
    const certUint8 = new Uint8Array(certificateDer);
    const certArrayBuffer = certUint8.buffer.slice(
      certUint8.byteOffset,
      certUint8.byteOffset + certUint8.byteLength,
    ) as ArrayBuffer;

    return {
      privateKey,
      certificateDer: certArrayBuffer,
      certificatePem,
    };
  } catch (error) {
    if (error instanceof SigningError) {
      throw error;
    }
    throw new SigningError(
      `Failed to load .p12 file: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a binary string (each char code is one byte) to a Buffer.
 * This is needed because `forge.asn1.toDer().getBytes()` returns
 * a binary string, not a Uint8Array.
 */
function bufferFromBinaryString(binaryString: string): Buffer {
  return Buffer.from(binaryString, "binary");
}
