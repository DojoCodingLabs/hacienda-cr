/**
 * Hacienda document type codes.
 *
 * Defines the numeric codes for all electronic document types
 * as specified in the Hacienda v4.4 specification.
 *
 * Los catálogos que antes vivían aquí (`MensajeReceptorCode`,
 * `SituationCode`) migraron a `shared/src/generated/`; `DocumentTypeCode`
 * queda a mano porque es el catálogo de la clave numérica, no una
 * enumeración del XSD.
 */

/** Document type codes used in the clave numerica and XML documents. */
export const DocumentTypeCode = {
  /** Factura Electronica */
  FACTURA_ELECTRONICA: "01",
  /** Nota de Debito Electronica */
  NOTA_DEBITO_ELECTRONICA: "02",
  /** Nota de Credito Electronica */
  NOTA_CREDITO_ELECTRONICA: "03",
  /** Tiquete Electronico */
  TIQUETE_ELECTRONICO: "04",
  /** Factura Electronica de Compra */
  FACTURA_ELECTRONICA_COMPRA: "08",
  /** Factura Electronica de Exportacion */
  FACTURA_ELECTRONICA_EXPORTACION: "09",
  /** Recibo Electronico de Pago (new in v4.4) */
  RECIBO_ELECTRONICO_PAGO: "10",
  CONFIRMACION_ACEPTACION: "05",
  CONFIRMACION_ACEPTACION_PARCIAL: "06",
  CONFIRMACION_RECHAZO: "07",
  /** @deprecated Misnamed legacy alias; use FACTURA_ELECTRONICA_COMPRA. */
  COMPRA_PAGO: "08",
  /** @deprecated Misnamed legacy alias; use FACTURA_ELECTRONICA_EXPORTACION. */
  GASTO_VIAJE: "09",
} as const;

export type DocumentTypeCode = (typeof DocumentTypeCode)[keyof typeof DocumentTypeCode];

/** Human-readable names for each document type (in Spanish). */
export const DOCUMENT_TYPE_NAMES: Record<DocumentTypeCode, string> = {
  [DocumentTypeCode.FACTURA_ELECTRONICA]: "Factura Electrónica",
  [DocumentTypeCode.NOTA_DEBITO_ELECTRONICA]: "Nota de Débito Electrónica",
  [DocumentTypeCode.NOTA_CREDITO_ELECTRONICA]: "Nota de Crédito Electrónica",
  [DocumentTypeCode.TIQUETE_ELECTRONICO]: "Tiquete Electrónico",
  [DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA]: "Factura Electrónica de Compra",
  [DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION]: "Factura Electrónica de Exportación",
  [DocumentTypeCode.RECIBO_ELECTRONICO_PAGO]: "Recibo Electrónico de Pago",
  [DocumentTypeCode.CONFIRMACION_ACEPTACION]: "Confirmación de Aceptación",
  [DocumentTypeCode.CONFIRMACION_ACEPTACION_PARCIAL]: "Confirmación de Aceptación Parcial",
  [DocumentTypeCode.CONFIRMACION_RECHAZO]: "Confirmación de Rechazo",
} as const;
