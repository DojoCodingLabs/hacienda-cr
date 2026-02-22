/**
 * TypeScript types for all Hacienda v4.4 electronic document structures.
 *
 * Covers: Emisor, Receptor, LineaDetalle, Impuesto, ResumenFactura,
 * and the 7 document types + MensajeReceptor.
 */

import type {
  IdentificationType,
  DocumentTypeCode,
  SaleCondition,
  PaymentMethod,
  TaxCode,
  IvaRateCode,
  ExonerationType,
  UnitOfMeasure,
  MensajeReceptorCode,
  CurrencyCode,
} from "../constants/index.js";

// ---------------------------------------------------------------------------
// Common Sub-structures
// ---------------------------------------------------------------------------

/** Taxpayer identification (used in Emisor and Receptor). */
export interface Identificacion {
  /** Identification type code. */
  tipo: IdentificationType;

  /** Identification number (digits only). */
  numero: string;
}

/** Phone number. */
export interface Telefono {
  /** Country code (e.g., "506"). */
  codigoPais: string;

  /** Phone number. */
  numTelefono: string;
}

/** Location / address (Ubicacion). */
export interface Ubicacion {
  /** Province code (1-7). */
  provincia: string;

  /** Canton code (2 digits). */
  canton: string;

  /** Distrito code (2 digits). */
  distrito: string;

  /** Barrio code (2 digits). Optional. */
  barrio?: string;

  /** Additional address details (free text). */
  otrasSenas?: string;
}

/** Emisor (issuer) — the entity issuing the document. */
export interface Emisor {
  /** Issuer name (Nombre o Razon Social). */
  nombre: string;

  /** Taxpayer identification. */
  identificacion: Identificacion;

  /** Commercial name (Nombre Comercial). Optional. */
  nombreComercial?: string;

  /** Location. Optional. */
  ubicacion?: Ubicacion;

  /** Phone number. Optional. */
  telefono?: Telefono;

  /** Fax number. Optional. */
  fax?: Telefono;

  /** Email address. */
  correoElectronico: string;
}

/** Receptor (receiver) — the entity receiving the document. */
export interface Receptor {
  /** Receiver name. */
  nombre: string;

  /** Taxpayer identification. Optional for some doc types (e.g., Tiquete). */
  identificacion?: Identificacion;

  /** Foreign identification number (for exports). */
  identificacionExtranjero?: string;

  /** Commercial name. Optional. */
  nombreComercial?: string;

  /** Location. Optional. */
  ubicacion?: Ubicacion;

  /** Phone number. Optional. */
  telefono?: Telefono;

  /** Fax number. Optional. */
  fax?: Telefono;

  /** Email address. Optional. */
  correoElectronico?: string;
}

/** Exoneration information for a line item. */
export interface Exoneracion {
  /** Exoneration document type. */
  tipoDocumento: ExonerationType;

  /** Exoneration document number. */
  numeroDocumento: string;

  /** Issuing institution name. */
  nombreInstitucion: string;

  /** Issue date (ISO 8601). */
  fechaEmision: string;

  /** Exoneration percentage (0-100). */
  porcentajeExoneracion: number;

  /** Exonerated tax amount. */
  montoExoneracion: number;
}

/** Tax applied to a line item (Impuesto). */
export interface Impuesto {
  /** Tax type code. */
  codigo: TaxCode;

  /** IVA rate code (only for IVA taxes). */
  codigoTarifa?: IvaRateCode;

  /** Tax rate percentage. */
  tarifa: number;

  /** Taxable base amount (MontoImpuesto = monto * tarifa / 100). */
  monto: number;

  /** Exoneration information. Optional. */
  exoneracion?: Exoneracion;
}

/** Discount applied to a line item. */
export interface Descuento {
  /** Discount amount. */
  montoDescuento: number;

  /** Reason for discount. */
  naturalezaDescuento: string;
}

/** Commercial code for a product/service. */
export interface CodigoComercial {
  /** Code type: 01=Seller, 02=Buyer, 03=Industry, 04=Internal, 99=Other. */
  tipo: "01" | "02" | "03" | "04" | "99";

  /** Product/service code value. */
  codigo: string;
}

/** A single line item in an invoice (LineaDetalle). */
export interface LineaDetalle {
  /** Line number (1-based, sequential). */
  numeroLinea: number;

  /** CABYS code (13 digits) — required in v4.4. */
  codigoCabys: string;

  /** Commercial codes. Optional. */
  codigoComercial?: CodigoComercial[];

  /** Quantity. */
  cantidad: number;

  /** Unit of measure. */
  unidadMedida: UnitOfMeasure;

  /** Item description (max 200 chars). */
  detalle: string;

  /** Unit price (before taxes and discounts). */
  precioUnitario: number;

  /** Total line amount (cantidad * precioUnitario). */
  montoTotal: number;

  /** Discounts applied. Optional. */
  descuento?: Descuento[];

  /** Subtotal after discounts. */
  subTotal: number;

  /** Base taxable amount. Optional. */
  baseImponible?: number;

  /** Taxes applied to this line item. */
  impuesto?: Impuesto[];

  /** IVA tax amount for this line (sum of IVA taxes). */
  impuestoNeto?: number;

  /** Total line amount including taxes. */
  montoTotalLinea: number;
}

/** Reference to another document (for credit/debit notes). */
export interface InformacionReferencia {
  /** Referenced document type code. */
  tipoDoc: DocumentTypeCode;

  /** Referenced document clave or number. */
  numero: string;

  /** Date of the referenced document (ISO 8601). */
  fechaEmision: string;

  /** Reference reason code: 01=Correct, 02=Void, 04=Reference, 05=Replace, 99=Other. */
  codigo: "01" | "02" | "04" | "05" | "99";

  /** Description of the reason. */
  razon: string;
}

/** Other charges not tied to line items (OtrosCargos). */
export interface OtroCargo {
  /** Charge document type: fiscal percentage, customs fee, etc. */
  tipoDocumento: string;

  /** Third-party identification number. Optional. */
  numeroIdentidadTercero?: string;

  /** Third-party name. Optional. */
  nombreTercero?: string;

  /** Detail / description. */
  detalle: string;

  /** Percentage (if applicable). Optional. */
  porcentaje?: number;

  /** Charge amount. */
  montoOtroCargo: number;
}

/** Invoice summary totals (ResumenFactura). */
export interface ResumenFactura {
  /** Currency code (ISO 4217). */
  codigoTipoMoneda?: CodigoTipoMoneda;

  /** Total taxable sales. */
  totalServGravados: number;

  /** Total exempt sales. */
  totalServExentos: number;

  /** Total exonerated services. */
  totalServExonerado?: number;

  /** Total taxable merchandise. */
  totalMercanciasGravadas: number;

  /** Total exempt merchandise. */
  totalMercanciasExentas: number;

  /** Total exonerated merchandise. */
  totalMercExonerada?: number;

  /** Total taxable. */
  totalGravado: number;

  /** Total exempt. */
  totalExento: number;

  /** Total exonerated. */
  totalExonerado?: number;

  /** Total sales (before tax). */
  totalVenta: number;

  /** Total discounts. */
  totalDescuentos: number;

  /** Net sales (totalVenta - totalDescuentos). */
  totalVentaNeta: number;

  /** Total IVA tax. */
  totalImpuesto: number;

  /** Total IVA returned (for special cases). */
  totalIVADevuelto?: number;

  /** Total other charges. */
  totalOtrosCargos?: number;

  /** Grand total (totalVentaNeta + totalImpuesto + totalOtrosCargos - totalIVADevuelto). */
  totalComprobante: number;
}

/** Currency information when not using CRC. */
export interface CodigoTipoMoneda {
  /** Currency code (ISO 4217). */
  codigoMoneda: CurrencyCode;

  /** Exchange rate to CRC. */
  tipoCambio: number;
}

// ---------------------------------------------------------------------------
// Document Types
// ---------------------------------------------------------------------------

/** Common fields shared by all document types. */
export interface DocumentoElectronicoBase {
  /** 50-digit unique key. */
  clave: string;

  /** Activity code (CIIU 4 / CABYS activity code). */
  codigoActividad: string;

  /** Sequential document number (20 digits, with branch and POS prefix). */
  numeroConsecutivo: string;

  /** Emission date and time (ISO 8601 with timezone). */
  fechaEmision: string;

  /** Issuer information. */
  emisor: Emisor;

  /** Sale condition code. */
  condicionVenta: SaleCondition;

  /** Credit term in days (required when condicionVenta is "02" credito). */
  plazoCredito?: string;

  /** Payment methods used. At least one required. */
  medioPago: PaymentMethod[];

  /** Line items. */
  detalleServicio: LineaDetalle[];

  /** Other charges. Optional. */
  otrosCargos?: OtroCargo[];

  /** Invoice summary / totals. */
  resumenFactura: ResumenFactura;

  /** References to other documents. Optional. */
  informacionReferencia?: InformacionReferencia[];

  /** Additional information (Otros / free text). Optional. */
  otros?: OtroContenido[];
}

/** Free-form additional content (Otros). */
export interface OtroContenido {
  /** Content (arbitrary XML-safe text). */
  contenido: string;
}

/** Factura Electronica — full electronic invoice. */
export interface FacturaElectronica extends DocumentoElectronicoBase {
  /** Receiver information. Required for Factura. */
  receptor: Receptor;
}

/** Tiquete Electronico — simplified receipt (no receptor required). */
export interface TiqueteElectronico extends DocumentoElectronicoBase {
  /** Receiver information. Optional for Tiquete. */
  receptor?: Receptor;
}

/** Nota de Credito Electronica — electronic credit note. */
export interface NotaCreditoElectronica extends DocumentoElectronicoBase {
  /** Receiver information. Required. */
  receptor: Receptor;

  /** Reference to the original document being credited. Required. */
  informacionReferencia: InformacionReferencia[];
}

/** Nota de Debito Electronica — electronic debit note. */
export interface NotaDebitoElectronica extends DocumentoElectronicoBase {
  /** Receiver information. Required. */
  receptor: Receptor;

  /** Reference to the original document being debited. Required. */
  informacionReferencia: InformacionReferencia[];
}

/** Factura Electronica de Compra — purchase invoice (from unregistered supplier). */
export interface FacturaElectronicaCompra extends DocumentoElectronicoBase {
  /** Receiver information. Required. */
  receptor: Receptor;
}

/** Factura Electronica de Exportacion — export invoice. */
export interface FacturaElectronicaExportacion extends DocumentoElectronicoBase {
  /** Receiver information. Required (may use foreign identification). */
  receptor: Receptor;
}

/** Recibo Electronico de Pago — electronic payment receipt (new in v4.4). */
export interface ReciboElectronicoPago extends DocumentoElectronicoBase {
  /** Receiver information. Required. */
  receptor: Receptor;
}

/** Union type of all electronic document types. */
export type DocumentoElectronico =
  | FacturaElectronica
  | TiqueteElectronico
  | NotaCreditoElectronica
  | NotaDebitoElectronica
  | FacturaElectronicaCompra
  | FacturaElectronicaExportacion
  | ReciboElectronicoPago;

// ---------------------------------------------------------------------------
// Mensaje Receptor (Receiver Acknowledgment)
// ---------------------------------------------------------------------------

/** Mensaje Receptor — receiver acknowledgment message. */
export interface MensajeReceptor {
  /** Clave of the original document being acknowledged. */
  clave: string;

  /** Consecutive number for this receiver message. */
  numeroCedulaEmisor: string;

  /** Emission date (ISO 8601). */
  fechaEmisionDoc: string;

  /** Receiver message code (1=accepted, 2=partial, 3=rejected). */
  mensaje: MensajeReceptorCode;

  /** Detail message / reason. Optional. */
  detalleMensaje?: string;

  /** Total tax amount of the referenced document. */
  montoTotalImpuesto?: number;

  /** CABYS activity code. */
  codigoActividad?: string;

  /** Condition of the tax: accepted, not applicable, etc. */
  condicionImpuesto?: string;

  /** Total invoice amount of the referenced document. */
  totalFactura: number;

  /** Receiver identification number. */
  numeroCedulaReceptor: string;

  /** Consecutive number. */
  numeroConsecutivoReceptor: string;
}
