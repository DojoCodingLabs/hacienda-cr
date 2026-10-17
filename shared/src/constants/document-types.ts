/**
 * Hacienda document type codes.
 *
 * Defines the numeric codes for all electronic document types
 * as specified in the Hacienda v4.4 specification.
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

/** Mensaje Receptor (receiver acknowledgment) message codes. */
export const MensajeReceptorCode = {
  /** Aceptado totalmente */
  ACEPTADO: "1",
  /** Aceptado parcialmente */
  ACEPTADO_PARCIALMENTE: "2",
  /** Rechazado */
  RECHAZADO: "3",
} as const;

export type MensajeReceptorCode = (typeof MensajeReceptorCode)[keyof typeof MensajeReceptorCode];

/** Submission situation codes for the clave numerica. */
export const SituationCode = {
  /** Normal */
  NORMAL: "1",
  /** Contingencia (contingency) */
  CONTINGENCIA: "2",
  /** Sin internet (no internet) */
  SIN_INTERNET: "3",
} as const;

export type SituationCode = (typeof SituationCode)[keyof typeof SituationCode];
