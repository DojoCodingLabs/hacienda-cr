/**
 * Schemas barrel export.
 *
 * Zod validation schemas for all document input types.
 */

export {
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
