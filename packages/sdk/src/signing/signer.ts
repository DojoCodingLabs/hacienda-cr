/**
 * XAdES-EPES XML signing for Hacienda Costa Rica.
 *
 * Signs XML documents according to XAdES-EPES v1.3.2+ requirements:
 * - Policy URI and SHA-1 policy hash
 * - RSA 2048 + SHA-256 signature
 * - Canonical XML 1.0 (C14N) canonicalization
 *
 * Uses `xadesjs` / `xmldsigjs` for XML signature generation, `node-forge`
 * for .p12 parsing, and `@xmldom/xmldom` for DOM operations in Node.js.
 *
 * @module signing/signer
 */

import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import xpath from "xpath";
import * as xadesjs from "xadesjs";
import * as xmldsigjs from "xmldsigjs";

import { XADES_POLICY_HASH, XADES_POLICY_URI } from "@dojocoding/hacienda-shared";

import { SigningError } from "../errors.js";
import { loadP12 } from "./p12-loader.js";

// ---------------------------------------------------------------------------
// Module initialization
// ---------------------------------------------------------------------------

let initialized = false;

/**
 * Initializes the xadesjs and xmldsigjs libraries with Node.js
 * DOM dependencies and the native WebCrypto engine.
 */
function ensureInitialized(): void {
  if (initialized) return;

  // Register DOM dependencies for Node.js (xadesjs/xmldsigjs are browser-oriented)
  xadesjs.setNodeDependencies({ DOMParser, XMLSerializer, xpath });

  // Set the crypto engine to Node.js native WebCrypto
  xmldsigjs.Application.setEngine("NodeJS", globalThis.crypto as Crypto);
  xadesjs.Application.setEngine("NodeJS", globalThis.crypto as Crypto);

  initialized = true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Signs an XML document with XAdES-EPES using a .p12 certificate.
 *
 * Implements the full Hacienda XAdES-EPES v1.3.2+ signing:
 * - Enveloped signature (inserted into the XML document)
 * - SignaturePolicy with Hacienda's policy URI and SHA-1 hash
 * - RSA-SHA256 signature algorithm
 * - Canonical XML 1.0 canonicalization
 * - X.509 certificate embedded in KeyInfo
 *
 * @param xml - The XML document string to sign.
 * @param p12Buffer - Raw bytes of the PKCS#12 (.p12) certificate file.
 * @param p12Pin - Password/PIN for the .p12 file.
 * @returns The signed XML document as a string.
 * @throws {SigningError} If signing fails for any reason.
 *
 * @example
 * ```ts
 * import { readFileSync } from "node:fs";
 * import { signXml } from "@dojocoding/hacienda-sdk";
 *
 * const xml = '<FacturaElectronica>...</FacturaElectronica>';
 * const p12 = readFileSync("taxpayer.p12");
 * const signed = await signXml(xml, p12, "mypin");
 * ```
 */
export async function signXml(xml: string, p12Buffer: Buffer, p12Pin: string): Promise<string> {
  ensureInitialized();

  try {
    // 1. Load the .p12 credentials
    const credentials = await loadP12(p12Buffer, p12Pin);

    // 2. Convert certificate DER to Base64 string (xadesjs expects strings)
    const certBase64 = Buffer.from(credentials.certificateDer).toString("base64");

    // 3. Parse the XML document using xadesjs (which uses @xmldom/xmldom under the hood)
    const xmlDoc = xadesjs.Parse(xml);

    // 4. Create the XAdES signed XML object
    const signedXml = new xadesjs.SignedXml();

    // 5. Generate a unique ID for this signature
    const sigId = "xmldsig-" + generateId();

    // 6. Build and apply the XAdES-EPES signature with policy
    const signatureXml = await signedXml.Sign(
      // Signing algorithm parameters
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      } as Algorithm,
      credentials.privateKey,
      xmlDoc,
      {
        // XAdES-EPES policy
        policy: {
          // xadesjs extends AlgorithmIdentifier with a runtime `value` property
          // for pre-computed digest values. The types don't reflect this, so we cast.
          hash: {
            name: "SHA-1",
            value: Buffer.from(XADES_POLICY_HASH, "base64"),
          } as unknown as AlgorithmIdentifier,
          identifier: {
            qualifier: "OIDAsURN",
            value: XADES_POLICY_URI,
          },
        },
        // Signing certificate (as Base64 string)
        signingCertificate: certBase64,
        // Signing time
        signingTime: {
          value: new Date(),
        },
        // References: enveloped signature over the whole document
        references: [
          {
            id: "r-" + generateId(),
            uri: "",
            hash: "SHA-256",
            transforms: ["enveloped", "c14n"],
          },
        ],
        // Embed the X.509 certificate in KeyInfo (as Base64 string)
        x509: [certBase64],
        // Signature element ID
        id: sigId,
      },
    );

    // 7. Append the signature to the XML document
    const rootElement = xmlDoc.documentElement;
    const signatureNode = signatureXml.GetXml();
    if (!signatureNode) {
      throw new SigningError("XAdES signing produced no signature element.");
    }
    rootElement.appendChild(signatureNode);

    // 8. Serialize back to string
    const serializer = new XMLSerializer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- xadesjs returns a browser-style Document; xmldom expects its own Node type
    return serializer.serializeToString(xmlDoc as any);
  } catch (error) {
    if (error instanceof SigningError) {
      throw error;
    }
    throw new SigningError(
      `XML signing failed: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}

/**
 * Signs an XML document and returns the result as a Base64-encoded string.
 *
 * This is the full sign-to-Base64 pipeline needed for Hacienda API submission:
 * 1. Takes raw XML
 * 2. Signs it with XAdES-EPES
 * 3. Encodes the signed XML as Base64
 *
 * @param xml - The XML document string to sign.
 * @param p12Buffer - Raw bytes of the PKCS#12 (.p12) certificate file.
 * @param p12Pin - Password/PIN for the .p12 file.
 * @returns Base64-encoded signed XML document string.
 * @throws {SigningError} If signing fails for any reason.
 *
 * @example
 * ```ts
 * const base64Xml = await signAndEncode(xml, p12Buffer, "pin");
 * // Ready for Hacienda API submission as comprobanteXml
 * ```
 */
export async function signAndEncode(
  xml: string,
  p12Buffer: Buffer,
  p12Pin: string,
): Promise<string> {
  const signedXml = await signXml(xml, p12Buffer, p12Pin);
  return Buffer.from(signedXml, "utf-8").toString("base64");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Generates a short random hex ID for signature element IDs. */
function generateId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("hex");
}
