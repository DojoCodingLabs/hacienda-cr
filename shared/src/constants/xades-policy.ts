/**
 * XAdES-EPES signing policy constants.
 *
 * Reviewed against the official Annex 2 policy identifier and the exact
 * vendored resolution PDF (SHA-256), 17 October 2026. See
 * docs/specs/a2-policy-catalog-readiness.md for provenance and migration.
 */

/** XAdES-EPES policy identifier URI. */
export const XADES_POLICY_URI =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf" as const;

/** XAdES-EPES policy hash (SHA-256, Base64-encoded). */
export const XADES_POLICY_HASH = "DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=" as const;

/** XAdES-EPES policy hash algorithm. */
export const XADES_POLICY_HASH_ALGORITHM = "http://www.w3.org/2001/04/xmlenc#sha256" as const;

/** XML canonicalization method for XAdES signatures. */
export const XADES_CANONICALIZATION_METHOD =
  "http://www.w3.org/TR/2001/REC-xml-c14n-20010315" as const;

/** Signing algorithm: RSA with SHA-256. */
export const XADES_SIGNATURE_ALGORITHM =
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" as const;

/** Digest algorithm for reference digests. */
export const XADES_DIGEST_ALGORITHM = "http://www.w3.org/2001/04/xmlenc#sha256" as const;
