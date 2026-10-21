/**
 * Constants barrel export.
 *
 * All Hacienda-related constants: environment URLs, document type codes,
 * tax codes, identification types, and more.
 *
 * Los catálogos migrados a `codes.json` se re-exportan vía
 * `shared/src/index.ts` desde `./generated/index.js`; aquí vive solo la
 * curaduría restante: nombres legibles, mapas derivados, catálogos sin
 * pareja exacta con el XSD, XADES y entornos.
 */

export {
  Environment,
  API_BASE_URLS,
  IDP_TOKEN_URLS,
  CLIENT_IDS,
  IDP_LOGOUT_URLS,
  ECONOMIC_ACTIVITY_API_URL,
  COUNTRY_CODE,
} from "./environments.js";

export { DocumentTypeCode, DOCUMENT_TYPE_NAMES } from "./document-types.js";

export {
  IVA_RATE_PERCENTAGES,
  IVA_RATE_NAMES,
  ExonerationType,
  UnitOfMeasure,
  UNITS_OF_MEASURE,
} from "./tax-codes.js";

export {
  REFERENCE_DOC_TYPES,
  REFERENCE_CODES,
  REP_REFERENCE_CODES,
  CODIGO_REFERENCIA_PAGO_COMPROBANTE,
} from "./document-references.js";
export type { ReferenceDocType, ReferenceCode, RepReferenceCode } from "./document-references.js";

export { IDENTIFICATION_TYPE_NAMES, IDENTIFICATION_LENGTHS } from "./identification-types.js";

export { SALE_CONDITION_NAMES, REP_SALE_CONDITIONS } from "./sale-conditions.js";

export { PAYMENT_METHOD_NAMES } from "./payment-methods.js";

export { PROVINCE_NAMES } from "./provinces.js";

export {
  XADES_POLICY_URI,
  XADES_POLICY_HASH,
  XADES_POLICY_HASH_ALGORITHM,
  XADES_CANONICALIZATION_METHOD,
  XADES_SIGNATURE_ALGORITHM,
  XADES_DIGEST_ALGORITHM,
} from "./xades-policy.js";

export { CurrencyCode } from "./currency-codes.js";
