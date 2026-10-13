/**
 * InformacionReferencia codes for electronic documents (v4.4).
 *
 * Values vendored verbatim from the official v4.4 XSD enumerations
 * (TipoDocReferenciaType and CodigoReferenciaType), April 2026 revision
 * (mandatory 2026-11-01). See the ANEXOS Y ESTRUCTURAS v4.4 document
 * (Notas 9 and 10) for the authoritative meaning of each code.
 *
 * Sin pareja deliberada con `codes.json`: el XSD vendorizado aún no trae
 * los códigos 19-20 (TipoDoc) ni 13-16 (Codigo) de la revisión abril 2026
 * — ver table-map.mjs; el candado de generación los reporta hasta que se
 * vendorice el XSD nuevo. `DISCOUNT_CODES`, `OTHER_CHARGE_TYPES` y
 * `EXONERATION_INSTITUTIONS` sí migraron a `shared/src/generated/`.
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
  "19", // Factura electronica de exportacion (April 2026 revision)
  "20", // Recibo electronico de pago (April 2026 revision)
  "99", // Otros (requiere TipoDocRefOTRO)
] as const;

export type ReferenceDocType = (typeof REFERENCE_DOC_TYPES)[number];

/**
 * Reference reason codes (Codigo / CodigoReferenciaType).
 *
 * Codes 13-16 are new in the April 2026 revision; code 17 exists only in
 * the Recibo Electronico de Pago schema (see REP_REFERENCE_CODES).
 */
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
  "12", // Nota de credito financiera por exoneracion posterior (redefined April 2026)
  "13", // Anula comprobante por error material (April 2026 revision)
  "14", // Corrige monto por error material (April 2026 revision)
  "15", // Sustituye comprobante por error material (April 2026 revision)
  "16", // Sustituye comprobante rechazado (April 2026 revision)
  "99", // Otros (requiere CodigoReferenciaOTRO)
] as const;

export type ReferenceCode = (typeof REFERENCE_CODES)[number];

/**
 * Reference reason codes accepted by the Recibo Electronico de Pago XSD —
 * the REP enumeration additionally admits code 17 (pago de comprobante).
 */
export const REP_REFERENCE_CODES = [
  ...REFERENCE_CODES,
  "17", // Pago de comprobante (REP only, April 2026 revision)
] as const;

export type RepReferenceCode = (typeof REP_REFERENCE_CODES)[number];
