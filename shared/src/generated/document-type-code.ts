// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const DocumentTypeCode = {
  /** Factura electrónica */
  FACTURA_ELECTRONICA: "01",
  /** Nota de débito electrónica */
  NOTA_DEBITO_ELECTRONICA: "02",
  /** Nota de crédito electrónica */
  NOTA_CREDITO_ELECTRONICA: "03",
  /** Tiquete electrónico */
  TIQUETE_ELECTRONICO: "04",
  /** Confirmación de aceptación del comprobante electrónico */
  CONFIRMACION_ACEPTACION: "05",
  /** Confirmación de aceptación parcial del comprobante electrónico */
  CONFIRMACION_ACEPTACION_PARCIAL: "06",
  /** Confirmación de rechazo del comprobante electrónico */
  CONFIRMACION_RECHAZO: "07",
  /** Factura electrónica de compras */
  FACTURA_ELECTRONICA_COMPRA: "08",
  /** Factura electrónica de exportación */
  FACTURA_ELECTRONICA_EXPORTACION: "09",
  /** Recibo Electrónico de Pago */
  RECIBO_ELECTRONICO_PAGO: "10",
} as const;

export type DocumentTypeCode = (typeof DocumentTypeCode)[keyof typeof DocumentTypeCode];
