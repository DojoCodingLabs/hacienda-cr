/**
 * XAdES-EPES signing policy constants.
 *
 * These values are required when generating XAdES-EPES digital signatures
 * for Hacienda electronic documents.
 *
 * Source: Anexo 2 (ejemplo de firma, p. 87) of the vendored
 * `ANEXOS Y ESTRUCTURAS_V4.4.pdf`; the `policy` block of
 * `packages/sdk/schemas/manifest.json` mirrors it and
 * `packages/sdk/src/signing/policy-manifest.spec.ts` fails when these
 * constants diverge from it.
 */

/** XAdES-EPES policy identifier URI. */
export const XADES_POLICY_URI =
  "https://cdn.comprobanteselectronicos.go.cr/xmlschemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf" as const;

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
