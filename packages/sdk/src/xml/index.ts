/**
 * XML module — XML generation and validation for Hacienda v4.4.
 */

export { buildXml, getNamespaceUri, getSchemaFragment, type BuildXmlOptions } from "./builder.js";

export {
  validateFacturaInput,
  type FacturaValidationError,
  type FacturaValidationResult,
} from "./validator.js";
