/**
 * Schemas barrel export.
 *
 * Zod validation schemas for all document input types.
 */

export {
  MonetaryTextSchema,
  MoneyInputSchema,
  MontoSchema,
  MontoPositiveSchema,
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
  DatosImpuestoEspecificoSchema,
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

export {
  ExactFecUsedPersonalGoodsNonSubjectInputSchema,
  ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema,
  ExactFecUsedPersonalGoodsReferenceSchema,
  ExactFecUsedPersonalGoodsLineSchema,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
  type ExactFecUsedPersonalGoodsNonSubjectCalculated,
} from "./exact-fec-used-personal.js";

export {
  DecimalMoneySchema,
  DecimalPositiveMoneySchema,
  DecimalQuantitySchema,
  DecimalRateSchema,
  DecimalFactorSchema,
  DecimalPercentageSchema,
  DecimalExoneratedRateSchema,
  DecimalProportionSchema,
  DecimalSpecificQuantitySchema,
  DecimalExchangeRateSchema,
  DecimalDatosImpuestoEspecificoSchema,
  DecimalExonerationInputSchema,
  DecimalExonerationCalculatedSchema,
  DecimalTaxInputSchema,
  DecimalTaxCalculatedSchema,
  DecimalDiscountSchema,
  DecimalOtherChargeSchema,
  DecimalPaymentSchema,
  DecimalTaxTotalSchema,
  DecimalCurrencySchema,
  DecimalSummarySchema,
  DecimalReferenceSchema,
  DecimalOtherContenidoSchema,
  type DecimalMoney,
  type DecimalDatosImpuestoEspecifico,
  type DecimalTaxInput,
  type DecimalTaxCalculated,
  type DecimalDiscount,
  type DecimalOtherCharge,
  type DecimalPayment,
  type DecimalCurrency,
  type DecimalSummary,
} from "./decimal-fields.js";

export {
  DECIMAL_DOCUMENT_TYPE_CODES,
  DECIMAL_DOCUMENT_TYPE_NAMES,
  DecimalEmisorSchema,
  DecimalReceptorSchema,
  DecimalLineInputSchema,
  DecimalLineWithTariffInputSchema,
  DecimalLineCalculatedSchema,
  DecimalLineWithTariffCalculatedSchema,
  DecimalRepLineInputSchema,
  DecimalRepLineCalculatedSchema,
  DecimalDocumentSourceBaseSchema,
  DecimalDocumentCalculatedBaseSchema,
  DecimalFacturaInputSchema,
  DecimalTiqueteInputSchema,
  DecimalNotaCreditoInputSchema,
  DecimalNotaDebitoInputSchema,
  DecimalFacturaCompraInputSchema,
  DecimalFacturaExportacionInputSchema,
  DecimalReciboPagoInputSchema,
  DecimalFacturaCalculatedSchema,
  DecimalTiqueteCalculatedSchema,
  DecimalNotaCreditoCalculatedSchema,
  DecimalNotaDebitoCalculatedSchema,
  DecimalFacturaCompraCalculatedSchema,
  DecimalFacturaExportacionCalculatedSchema,
  DecimalReciboPagoCalculatedSchema,
  DecimalFacturaDocumentInputSchema,
  DecimalNotaDebitoDocumentInputSchema,
  DecimalNotaCreditoDocumentInputSchema,
  DecimalTiqueteDocumentInputSchema,
  DecimalFacturaCompraDocumentInputSchema,
  DecimalFacturaExportacionDocumentInputSchema,
  DecimalReciboPagoDocumentInputSchema,
  DecimalDocumentInputSchema,
  DecimalFacturaDocumentCalculatedSchema,
  DecimalNotaDebitoDocumentCalculatedSchema,
  DecimalNotaCreditoDocumentCalculatedSchema,
  DecimalTiqueteDocumentCalculatedSchema,
  DecimalFacturaCompraDocumentCalculatedSchema,
  DecimalFacturaExportacionDocumentCalculatedSchema,
  DecimalReciboPagoDocumentCalculatedSchema,
  DecimalDocumentCalculatedSchema,
  type DecimalDocumentTypeCode,
  type DecimalLineInput,
  type DecimalLineWithTariffInput,
  type DecimalLineCalculated,
  type DecimalLineWithTariffCalculated,
  type DecimalRepLineInput,
  type DecimalRepLineCalculated,
  type DecimalFacturaInput,
  type DecimalTiqueteInput,
  type DecimalNotaCreditoInput,
  type DecimalNotaDebitoInput,
  type DecimalFacturaCompraInput,
  type DecimalFacturaExportacionInput,
  type DecimalReciboPagoInput,
  type DecimalDocumentInput,
  type DecimalFacturaCalculated,
  type DecimalTiqueteCalculated,
  type DecimalNotaCreditoCalculated,
  type DecimalNotaDebitoCalculated,
  type DecimalFacturaCompraCalculated,
  type DecimalFacturaExportacionCalculated,
  type DecimalReciboPagoCalculated,
  type DecimalDocumentCalculated,
} from "./decimal-document.js";

export { DecimalMensajeReceptorSchema, type DecimalMensajeReceptor } from "./decimal-recipient.js";
