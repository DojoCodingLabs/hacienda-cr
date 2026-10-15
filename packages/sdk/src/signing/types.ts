/**
 * Types for the XAdES-EPES signing module.
 *
 * @module signing/types
 */

/** Options for signing an XML document. */
export interface SignXmlOptions {
  /** Raw XML string to sign. */
  readonly xml: string;
  /** PKCS#12 (.p12) certificate buffer. */
  readonly p12Buffer: Buffer;
  /** PIN/password for the .p12 file. */
  readonly p12Pin: string;
}

/** Result of extracting credentials from a .p12 file. */
export interface P12Credentials {
  /** RSA private key as CryptoKey. */
  readonly privateKey: CryptoKey;
  /** X.509 certificate as DER-encoded ArrayBuffer. */
  readonly certificateDer: ArrayBuffer;
  /** X.509 certificate as PEM string. */
  readonly certificatePem: string;
}

/** XAdES-EPES policy configuration. */
export interface XadesPolicyConfig {
  /** Policy identifier URI. */
  readonly policyUri: string;
  /** Base64-encoded SHA-1 hash of the policy document. */
  readonly policyHash: string;
  /** Hash algorithm URI for the policy hash. */
  readonly policyHashAlgorithm: string;
  /** Canonicalization method URI. */
  readonly canonicalizationMethod: string;
  /** Signature algorithm URI. */
  readonly signatureAlgorithm: string;
  /** Digest algorithm URI for references. */
  readonly digestAlgorithm: string;
}
