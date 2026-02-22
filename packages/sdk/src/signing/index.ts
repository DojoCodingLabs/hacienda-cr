/**
 * Signing module — XAdES-EPES digital signature for Hacienda documents.
 *
 * Provides .p12 certificate loading and XML signing according to
 * Hacienda v4.4 requirements (XAdES-EPES v1.3.2+, RSA 2048 + SHA-256).
 *
 * @module signing
 */

export { loadP12 } from "./p12-loader.js";
export { signXml, signAndEncode } from "./signer.js";
export type { P12Credentials, SignXmlOptions, XadesPolicyConfig } from "./types.js";
