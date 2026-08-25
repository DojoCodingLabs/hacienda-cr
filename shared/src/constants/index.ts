/**
 * Constants barrel export.
 *
 * All Hacienda-related constants: environment URLs, document type codes,
 * tax codes, identification types, and more.
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

export {
  DocumentTypeCode,
  DOCUMENT_TYPE_NAMES,
  MensajeReceptorCode,
  SituationCode,
} from "./document-types.js";

export {
  TaxCode,
  IvaRateCode,
  IVA_RATE_PERCENTAGES,
  ExonerationType,
  UnitOfMeasure,
  UNITS_OF_MEASURE,
} from "./tax-codes.js";

export {
  REFERENCE_DOC_TYPES,
  REFERENCE_CODES,
  REP_REFERENCE_CODES,
  DISCOUNT_CODES,
  OTHER_CHARGE_TYPES,
  EXONERATION_INSTITUTIONS,
} from "./document-references.js";
export type {
  ReferenceDocType,
  ReferenceCode,
  RepReferenceCode,
  DiscountCode,
  OtherChargeType,
  ExonerationInstitution,
} from "./document-references.js";

export {
  IdentificationType,
  IDENTIFICATION_TYPE_NAMES,
  IDENTIFICATION_LENGTHS,
} from "./identification-types.js";

export { SaleCondition, SALE_CONDITION_NAMES, REP_SALE_CONDITIONS } from "./sale-conditions.js";

export { PaymentMethod, PAYMENT_METHOD_NAMES } from "./payment-methods.js";

export { ProvinceCode, PROVINCE_NAMES } from "./provinces.js";

export {
  XADES_POLICY_URI,
  XADES_POLICY_HASH,
  XADES_POLICY_HASH_ALGORITHM,
  XADES_CANONICALIZATION_METHOD,
  XADES_SIGNATURE_ALGORITHM,
  XADES_DIGEST_ALGORITHM,
} from "./xades-policy.js";

export { CurrencyCode, CURRENCY_CODES } from "./currency-codes.js";
