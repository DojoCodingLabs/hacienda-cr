/**
 * InformacionReferencia codes for electronic documents (v4.4).
 *
 * Values vendored verbatim from the authoritative 2024/v4.4 XSD
 * enumerations (TipoDocReferenciaType and CodigoReferenciaType). See the
 * ANEXOS Y ESTRUCTURAS v4.4 document (Notas 9 and 10) for the authoritative
 * meaning of each code.
 *
 * The April 2026 revision (19-20 for TipoDoc, 13-17 for Codigo) is not
 * adopted; those values are rejected because the authoritative 2024 XSD
 * does not admit them. `DISCOUNT_CODES`, `OTHER_CHARGE_TYPES` and
 * `EXONERATION_INSTITUTIONS` migrated to `shared/src/generated/`.
 */

/** Referenced document type codes (TipoDocIR / TipoDocReferenciaType). */
export const REFERENCE_DOC_TYPES = [
  "01", // Factura electronica
  "02", // Nota de debito electronica
  "03", // Nota de credito electronica
  "04", // Tiquete electronico
  "05", // Nota de despacho
  "06", // Contrato
  "07", // Procedimiento
  "08", // Comprobante emitido en contingencia
  "09", // Devolucion de mercaderia
  "10", // Comprobante electronico rechazado por el Ministerio de Hacienda
  "11", // Sustituye factura rechazada por el receptor
  "12", // Sustituye factura de exportacion
  "13", // Facturacion mes vencido
  "14", // Comprobante aportado por contribuyente de regimen especial
  "15", // Sustituye una factura electronica de compra
  "16", // Comprobante de proveedor no domiciliado
  "17", // Nota de credito a factura electronica de compra
  "18", // Nota de debito a factura electronica de compra
  "99", // Otros (requiere TipoDocRefOTRO)
] as const;

export type ReferenceDocType = (typeof REFERENCE_DOC_TYPES)[number];

/** Reference reason codes (Codigo / CodigoReferenciaType). */
export const REFERENCE_CODES = [
  "01", // Anula documento de referencia
  "02", // Corrige texto de documento de referencia
  "04", // Referencia a otro documento
  "05", // Sustituye comprobante provisional por contingencia
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12", // Nota de credito financiera por exoneracion posterior
  "99", // Otros (requiere CodigoReferenciaOTRO)
] as const;

export type ReferenceCode = (typeof REFERENCE_CODES)[number];

/**
 * Reference reason codes accepted by the Recibo Electronico de Pago XSD.
 * The authoritative 2024 REP schema uses the same enumeration; code 17 is
 * exclusive to the non-adopted 2026 revision and is not accepted.
 */
export const REP_REFERENCE_CODES = REFERENCE_CODES;

export type RepReferenceCode = (typeof REP_REFERENCE_CODES)[number];
