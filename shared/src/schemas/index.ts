/**
 * Schemas barrel export.
 *
 * Zod validation schemas for all document input types.
 */

export {
  TaxCodeSchema,
  IvaRateCodeSchema,
  ExonerationTypeSchema,
  PaymentMethodSchema,
  SaleConditionSchema,
  TelefonoSchema,
  UbicacionSchema,
  type TelefonoInput,
  type UbicacionInput,
} from "./common.js";

export {
  IdentificationTypeSchema,
  IdentificacionSchema,
  type IdentificacionInput,
} from "./identification.js";

export { EmisorSchema, type EmisorInput } from "./emisor.js";

export { ReceptorSchema, type ReceptorInput } from "./receptor.js";

export {
  CodigoComercialSchema,
  ExoneracionSchema,
  ImpuestoSchema,
  DescuentoSchema,
  LineaDetalleSchema,
  type CodigoComercialInput,
  type ExoneracionInput,
  type ImpuestoInput,
  type DescuentoInput,
  type LineaDetalleInput,
} from "./linea-detalle.js";

export {
  ClaveComponentsSchema,
  ClaveInputSchema,
  ClaveNumericaSchema,
  type ClaveComponentsInput,
  type ClaveInputParsed,
} from "./clave.js";

export {
  CodigoTipoMonedaSchema,
  InformacionReferenciaSchema,
  OtroCargoSchema,
  MedioPagoSchema,
  TotalDesgloseImpuestoSchema,
  ResumenFacturaSchema,
  OtroContenidoSchema,
  FacturaElectronicaSchema,
  type FacturaElectronicaInput,
} from "./factura.js";

export {
  EnvironmentSchema,
  CredentialConfigSchema,
  AppConfigSchema,
  type CredentialConfigInput,
  type AppConfigInput,
} from "./environment.js";

export {
  ExactMoneySchema,
  ExactQuantitySchema,
  ExactDiscountInputSchema,
  ExactDiscountSchema,
  ExactFeLineInputSchema,
  ExactFePaymentSchema,
  ExactFeInputSchema,
  RetainedExactFeInputSchema,
  ExactFeCalculatedLineSchema,
  ExactFeSummarySchema,
  ExactFeCalculatedSchema,
  type ExactFeInput,
  type RetainedExactFeInput,
  type ExactFeCalculated,
} from "./exact-fe.js";

export {
  ExactNcTotalInputSchema,
  ExactNcTotalReferenceSchema,
  type ExactNcTotalInput,
  type ExactNcTotalCalculated,
} from "./exact-nc.js";

export {
  ComprobantePartyFilterSchema,
  ComprobantesQuerySchema,
  ComprobanteClaveSchema,
  ComprobanteMetadataSchema,
  ComprobantesMetadataArraySchema,
} from "./history.js";

export { ExactTeInputSchema, type ExactTeInput, type ExactTeCalculated } from "./exact-te.js";

export {
  ExactNdInputSchema,
  ExactNdReferenceSchema,
  type ExactNdInput,
  type ExactNdCalculated,
} from "./exact-nd.js";

export {
  ExactFecInputSchema,
  ExactFecReferenceSchema,
  type ExactFecInput,
  type ExactFecCalculated,
} from "./exact-fec.js";

export {
  ExactNcPartialInputSchema,
  ExactNcPartialReferenceSchema,
  type ExactNcPartialInput,
  type ExactNcPartialCalculated,
} from "./exact-nc-partial.js";
export {
  ExactFeReplacementInputSchema,
  ExactFeReplacementReferenceSchema,
  type ExactFeReplacementInput,
  type ExactFeReplacementCalculated,
} from "./exact-fe-replacement.js";

export {
  ExactFecForeignServiceIva13InputSchema,
  ExactFecForeignServiceIva13ReferenceSchema,
  type ExactFecForeignServiceIva13Input,
  type ExactFecForeignServiceIva13Calculated,
} from "./exact-fec-foreign-service.js";

export {
  ExactRecipientMessageInputSchema,
  ExactRecipientIvaDecisionSchema,
  type ExactRecipientMessageInput,
} from "./exact-recipient-message.js";
