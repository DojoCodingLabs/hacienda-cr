/**
 * Hacienda document type names (Spanish).
 *
 * El catálogo numérico `DocumentTypeCode` se genera desde `codes.json`
 * (`shared/src/generated/document-type-code.ts`, ANEXOS V4.4 p. 65 inciso c);
 * aquí vive solo la tabla de nombres legibles.
 */
import { DocumentTypeCode } from "../generated/index.js";

/** Human-readable names for each document type (in Spanish). */
export const DOCUMENT_TYPE_NAMES: Record<DocumentTypeCode, string> = {
  [DocumentTypeCode.FACTURA_ELECTRONICA]: "Factura Electrónica",
  [DocumentTypeCode.NOTA_DEBITO_ELECTRONICA]: "Nota de Débito Electrónica",
  [DocumentTypeCode.NOTA_CREDITO_ELECTRONICA]: "Nota de Crédito Electrónica",
  [DocumentTypeCode.TIQUETE_ELECTRONICO]: "Tiquete Electrónico",
  [DocumentTypeCode.CONFIRMACION_ACEPTACION]: "Confirmación de aceptación",
  [DocumentTypeCode.CONFIRMACION_ACEPTACION_PARCIAL]: "Confirmación de aceptación parcial",
  [DocumentTypeCode.CONFIRMACION_RECHAZO]: "Confirmación de rechazo",
  [DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA]: "Factura Electrónica de Compra",
  [DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION]: "Factura Electrónica de Exportación",
  [DocumentTypeCode.RECIBO_ELECTRONICO_PAGO]: "Recibo Electrónico de Pago",
} as const;
