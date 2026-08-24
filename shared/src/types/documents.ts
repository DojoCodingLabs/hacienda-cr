/**
 * TypeScript types for all Hacienda v4.4 electronic document structures.
 *
 * Field names mirror the v4.4 XSDs (camelCased). Structures follow the
 * official schemas vendored in packages/sdk/schemas/2024/v4.4.
 *
 * Covers: Emisor, Receptor, LineaDetalle, Impuesto, ResumenFactura,
 * and the 7 document types + MensajeReceptor.
 */

import type {
  IdentificationType,
  SaleCondition,
  PaymentMethod,
  TaxCode,
  IvaRateCode,
  ExonerationType,
  ExonerationInstitution,
  DiscountCode,
  OtherChargeType,
  ReferenceDocType,
  ReferenceCode,
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

  /**
   * Identification number. Digits for types 01-04; free-form (max 20 chars)
   * for types 05 (Extranjero No Domiciliado) and 06 (No Contribuyente).
   */
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

  /** Barrio name (free text, 5-50 chars in v4.4 — no longer a code). Optional. */
  barrio?: string;

  /** Additional address details (free text, 5-250 chars). Required by the v4.4 XSD. */
  otrasSenas: string;
}

/** Emisor (issuer) — the entity issuing the document. */
export interface Emisor {
  /** Issuer name (Nombre o Razon Social). */
  nombre: string;

  /** Taxpayer identification. */
  identificacion: Identificacion;

  /** Ley 8707 fiscal registry number. Optional, max 12 chars. */
  registrofiscal8707?: string;

  /** Commercial name (Nombre Comercial). Optional. */
  nombreComercial?: string;

  /** Location. Required by the v4.4 XSD for FE/TE/FEE (not emitted for REP). */
  ubicacion: Ubicacion;

  /** Phone number. Optional. */
  telefono?: Telefono;

  /** Email address(es). The XSD allows up to 4. */
  correoElectronico: string | string[];
}

/** Receptor (receiver) — the entity receiving the document. */
export interface Receptor {
  /** Receiver name. */
  nombre: string;

  /**
   * Taxpayer identification. Optional only for Tiquete / NC / ND / FEE;
   * required whenever the receiver is a domestic taxpayer. Foreign
   * receivers use tipo "05" (Extranjero No Domiciliado).
   */
  identificacion?: Identificacion;

  /** Commercial name. Optional. */
  nombreComercial?: string;

  /** Location. Optional. */
  ubicacion?: Ubicacion;

  /** Foreign receiver address (5-300 chars). Optional, v4.4. */
  otrasSenasExtranjero?: string;

  /** Phone number. Optional. */
  telefono?: Telefono;

  /** Email address. Optional. */
  correoElectronico?: string;
}

/** Exoneration information for a line item tax (v4.4 structure). */
export interface Exoneracion {
  /** Exoneration document type (TipoDocumentoEX1). */
  tipoDocumento: ExonerationType;

  /** Free-text document type. Required when tipoDocumento is "99". */
  tipoDocumentoOtros?: string;

  /** Exoneration document number (3-40 chars). */
  numeroDocumento: string;

  /** Law article number. Optional. */
  articulo?: number;

  /** Law clause (inciso) number. Optional. */
  inciso?: number;

  /** Issuing institution code (NombreInstitucion, coded in v4.4). */
  nombreInstitucion: ExonerationInstitution;

  /** Free-text institution name. Required when nombreInstitucion is "99". */
  nombreInstitucionOtros?: string;

  /** Issue date (ISO 8601) — emitted as FechaEmisionEX. */
  fechaEmision: string;

  /** Exonerated rate percentage (0-100) — emitted as TarifaExonerada. */
  tarifaExonerada: number;

  /** Exonerated tax amount. */
  montoExoneracion: number;
}

/** Tax applied to a line item (Impuesto). */
export interface Impuesto {
  /** Tax type code. */
  codigo: TaxCode;

  /** Free-text tax type. Required when codigo is "99". */
  codigoImpuestoOtros?: string;

  /** IVA rate code — emitted as CodigoTarifaIVA (only for IVA taxes). */
  codigoTarifaIVA?: IvaRateCode;

  /** Tax rate percentage. Optional for non-rate taxes. */
  tarifa?: number;

  /** Calculation factor for the used-goods IVA regime (code 08). */
  factorCalculoIVA?: number;

  /** Tax amount for this line (Monto). */
  monto: number;

  /** Exoneration information. Optional. */
  exoneracion?: Exoneracion;
}

/** Discount applied to a line item (v4.4 structure). */
export interface Descuento {
  /** Discount amount. */
  montoDescuento: number;

  /** Discount code (CodigoDescuento). Required in v4.4. */
  codigoDescuento: DiscountCode;

  /** Free-text discount type. Required when codigoDescuento is "99". */
  codigoDescuentoOtros?: string;

  /** Reason for discount (3-80 chars). Optional in v4.4. */
  naturalezaDescuento?: string;
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

  /** Customs tariff heading. Optional (NC/ND/FEE only). */
  partidaArancelaria?: string;

  /** CABYS code (13 digits) — emitted as CodigoCABYS in v4.4. */
  codigoCabys: string;

  /** Commercial codes. Optional (max 5). */
  codigoComercial?: CodigoComercial[];

  /** Quantity. */
  cantidad: number;

  /** Unit of measure (official v4.4 catalog value). */
  unidadMedida: UnitOfMeasure;

  /** Transaction type code (TipoTransaccion, 01-13). Optional, v4.4. */
  tipoTransaccion?: string;

  /** Commercial unit of measure (free text). Optional. */
  unidadMedidaComercial?: string;

  /** Item description (3-200 chars). */
  detalle: string;

  /** VIN or serial numbers (max 17 chars each). Optional, v4.4. */
  numeroVINoSerie?: string[];

  /** Unit price (before taxes and discounts). */
  precioUnitario: number;

  /** Total line amount (cantidad * precioUnitario). */
  montoTotal: number;

  /** Discounts applied. Optional (max 5). */
  descuento?: Descuento[];

  /** Subtotal after discounts. */
  subTotal: number;

  /**
   * Base taxable amount. Required by the v4.4 XSD for most document types;
   * builders default it to subTotal when omitted.
   */
  baseImponible?: number;

  /** Taxes applied to this line item. v4.4 requires at least one. */
  impuesto: Impuesto[];

  /**
   * Tax amount assumed by the issuer/factory
   * (ImpuestoAsumidoEmisorFabrica). Builders default to 0 where the
   * XSD requires the element.
   */
  impuestoAsumidoEmisorFabrica?: number;

  /** Net tax amount for this line (sum of taxes minus exonerations). */
  impuestoNeto?: number;

  /** Total line amount including taxes. */
  montoTotalLinea: number;
}

/** Reference to another document (for credit/debit notes and more). */
export interface InformacionReferencia {
  /** Referenced document type code — emitted as TipoDocIR. */
  tipoDoc: ReferenceDocType;

  /** Free-text document type. Required when tipoDoc is "99". */
  tipoDocOtros?: string;

  /** Referenced document clave or number. Optional in v4.4. */
  numero?: string;

  /** Date of the referenced document (ISO 8601) — emitted as FechaEmisionIR. */
  fechaEmision: string;

  /** Reference reason code. Optional in v4.4. */
  codigo?: ReferenceCode;

  /** Free-text reason code. Required when codigo is "99". */
  codigoOtros?: string;

  /** Description of the reason (max 180 chars). Optional in v4.4. */
  razon?: string;
}

/** Other charges not tied to line items (OtrosCargos, v4.4 structure). */
export interface OtroCargo {
  /** Charge document type — emitted as TipoDocumentoOC. */
  tipoDocumento: OtherChargeType;

  /** Free-text charge type. Required when tipoDocumento is "99". */
  tipoDocumentoOtros?: string;

  /** Third-party identification. Optional. */
  identificacionTercero?: Identificacion;

  /** Third-party name (5-100 chars). Optional. */
  nombreTercero?: string;

  /** Detail / description. */
  detalle: string;

  /** Percentage (if applicable) — emitted as PorcentajeOC. Optional. */
  porcentaje?: number;

  /** Charge amount — emitted as MontoCargo. */
  montoCargo: number;
}

/** Per-payment-method entry inside ResumenFactura (v4.4). */
export interface MedioPago {
  /** Payment method code (TipoMedioPago). */
  tipoMedioPago: PaymentMethod;

  /** Free-text payment method (3-100 chars). Required when tipo is "99". */
  medioPagoOtros?: string;

  /** Amount paid with this method (TotalMedioPago). */
  totalMedioPago: number;
}

/** Per-tax-code total breakdown inside ResumenFactura (v4.4). */
export interface TotalDesgloseImpuesto {
  /** Tax type code. */
  codigo: TaxCode;

  /** IVA rate code (for IVA taxes). Optional. */
  codigoTarifaIVA?: IvaRateCode;

  /** Total tax amount for this (code, rate) pair. */
  totalMontoImpuesto: number;
}

/** Currency information (CodigoTipoMoneda). Required in v4.4. */
export interface CodigoTipoMoneda {
  /** Currency code (ISO 4217). */
  codigoMoneda: CurrencyCode;

  /** Exchange rate to CRC. */
  tipoCambio: number;
}

/** Invoice summary totals (ResumenFactura, v4.4 structure). */
export interface ResumenFactura {
  /**
   * Currency information. Required by the v4.4 XSD; builders default to
   * CRC with exchange rate 1 when omitted.
   */
  codigoTipoMoneda?: CodigoTipoMoneda;

  /** Total taxable services. */
  totalServGravados?: number;

  /** Total exempt services. */
  totalServExentos?: number;

  /** Total exonerated services. */
  totalServExonerado?: number;

  /** Total non-subject services (v4.4). */
  totalServNoSujeto?: number;

  /** Total taxable merchandise. */
  totalMercanciasGravadas?: number;

  /** Total exempt merchandise. */
  totalMercanciasExentas?: number;

  /** Total exonerated merchandise. */
  totalMercExonerada?: number;

  /** Total non-subject merchandise (v4.4). */
  totalMercNoSujeta?: number;

  /** Total taxable. */
  totalGravado?: number;

  /** Total exempt. */
  totalExento?: number;

  /** Total exonerated. */
  totalExonerado?: number;

  /** Total non-subject (v4.4). */
  totalNoSujeto?: number;

  /** Total sales (before tax). Required. */
  totalVenta: number;

  /** Total discounts. */
  totalDescuentos?: number;

  /** Net sales (totalVenta - totalDescuentos). Required. */
  totalVentaNeta: number;

  /** Per-tax-code totals breakdown (v4.4). */
  totalDesgloseImpuesto?: TotalDesgloseImpuesto[];

  /** Total tax. */
  totalImpuesto?: number;

  /** Total tax assumed by issuer/factory (v4.4). */
  totalImpAsumEmisorFabrica?: number;

  /** Total IVA returned (for special cases). */
  totalIVADevuelto?: number;

  /** Total other charges. */
  totalOtrosCargos?: number;

  /**
   * Payment methods with amounts (v4.4 — moved into ResumenFactura).
   * Up to 4 entries; required for Recibo Electronico de Pago.
   */
  medioPago?: MedioPago[];

  /** Grand total. Required. */
  totalComprobante: number;
}

// ---------------------------------------------------------------------------
// Document Types
// ---------------------------------------------------------------------------

/** Common fields shared by all document types (v4.4). */
export interface DocumentoElectronicoBase {
  /** 50-digit unique key. */
  clave: string;

  /**
   * Identification number of the invoicing-system provider
   * (ProveedorSistemas, max 20 chars). Required in v4.4.
   */
  proveedorSistemas: string;

  /** Issuer economic activity code (CodigoActividadEmisor, 6 digits). */
  codigoActividadEmisor: string;

  /** Receiver economic activity code (6 digits). Optional (required for FEC). */
  codigoActividadReceptor?: string;

  /** Sequential document number (20 digits, with branch and POS prefix). */
  numeroConsecutivo: string;

  /** Emission date and time (ISO 8601 with timezone). */
  fechaEmision: string;

  /** Issuer information. */
  emisor: Emisor;

  /** Sale condition code. */
  condicionVenta: SaleCondition;

  /** Free-text sale condition (5-100 chars). Required when condicionVenta is "99". */
  condicionVentaOtros?: string;

  /** Credit term in days (required when condicionVenta is "02" credito). */
  plazoCredito?: string;

  /** Line items. */
  detalleServicio: LineaDetalle[];

  /** Other charges. Optional (max 15). */
  otrosCargos?: OtroCargo[];

  /** Invoice summary / totals (includes payment methods in v4.4). */
  resumenFactura: ResumenFactura;

  /** References to other documents. Optional (max 10). */
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
  /** Receiver information. Required for Factura (identification included). */
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
  /** Receiver economic activity code. Required for FEC. */
  codigoActividadReceptor: string;

  /** Receiver information. Required. */
  receptor: Receptor;

  /** Reference information. Required for FEC in v4.4. */
  informacionReferencia: InformacionReferencia[];
}

/** Factura Electronica de Exportacion — export invoice. */
export interface FacturaElectronicaExportacion extends DocumentoElectronicoBase {
  /** Receiver information. Required (foreign receivers use ID type 05). */
  receptor: Receptor;
}

/** Recibo Electronico de Pago — electronic payment receipt (new in v4.4). */
export interface ReciboElectronicoPago extends DocumentoElectronicoBase {
  /** Receiver information. Required. */
  receptor: Receptor;

  /** Reference to the document being paid. Required for REP. */
  informacionReferencia: InformacionReferencia[];
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

  /** Issuer identification number of the referenced document. */
  numeroCedulaEmisor: string;

  /** Emission date (ISO 8601). */
  fechaEmisionDoc: string;

  /** Receiver message code (1=accepted, 2=partial, 3=rejected). */
  mensaje: MensajeReceptorCode;

  /** Detail message / reason. Optional. */
  detalleMensaje?: string;

  /** Total tax amount of the referenced document. */
  montoTotalImpuesto?: number;

  /** Economic activity code. Optional. */
  codigoActividad?: string;

  /** Condition of the tax: accepted, not applicable, etc. */
  condicionImpuesto?: string;

  /** Creditable tax amount. Optional (v4.4). */
  montoTotalImpuestoAcreditar?: number;

  /** Applicable expense amount. Optional (v4.4). */
  montoTotalDeGastoAplicable?: number;

  /** Total invoice amount of the referenced document. */
  totalFactura: number;

  /** Receiver identification number. */
  numeroCedulaReceptor: string;

  /** Consecutive number. */
  numeroConsecutivoReceptor: string;
}
