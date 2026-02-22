/**
 * XAdES-EPES signing policy constants.
 *
 * These values are required when generating XAdES-EPES digital signatures
 * for Hacienda electronic documents.
 */

/** XAdES-EPES policy identifier URI. */
export const XADES_POLICY_URI =
  "https://tribunet.hacienda.go.cr/docs/esquemas/2016/v4.1/Resolucion_Comprobantes_Electronicos_DGT-R-48-2016.pdf" as const;

/** XAdES-EPES policy hash (SHA-1, Base64-encoded). */
export const XADES_POLICY_HASH = "Ohixl6upD6av8N7pEvDABhEL6hM=" as const;

/** XAdES-EPES policy hash algorithm. */
export const XADES_POLICY_HASH_ALGORITHM = "http://www.w3.org/2000/09/xmldsig#sha1" as const;

/** XML canonicalization method for XAdES signatures. */
export const XADES_CANONICALIZATION_METHOD =
  "http://www.w3.org/TR/2001/REC-xml-c14n-20010315" as const;

/** Signing algorithm: RSA with SHA-256. */
export const XADES_SIGNATURE_ALGORITHM =
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" as const;

/** Digest algorithm for reference digests. */
export const XADES_DIGEST_ALGORITHM = "http://www.w3.org/2001/04/xmlenc#sha256" as const;
