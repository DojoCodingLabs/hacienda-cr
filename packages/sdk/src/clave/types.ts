/**
 * Types for the 50-digit clave numerica used in Costa Rica electronic invoicing.
 *
 * Every electronic document submitted to Hacienda requires a unique 50-digit key
 * with the following structure:
 *
 * [country:3][date:6][taxpayer:12][branch:3][pos:5][docType:2][sequence:10][situation:1][security:8]
 */

/** Country code — always 506 for Costa Rica */
export const COUNTRY_CODE = "506" as const;

/**
 * Document type codes as defined by Hacienda.
 *
 * Each electronic document type has a 2-digit code used in the clave numerica.
 */
export enum DocumentType {
  /** Factura Electronica */
  FACTURA_ELECTRONICA = "01",
  /** Nota de Debito Electronica */
  NOTA_DEBITO = "02",
  /** Nota de Credito Electronica */
  NOTA_CREDITO = "03",
  /** Tiquete Electronico */
  TIQUETE_ELECTRONICO = "04",
  /** Confirmacion de Aceptacion del Comprobante Electronico */
  CONFIRMACION_ACEPTACION = "05",
  /** Confirmacion de Aceptacion Parcial del Comprobante Electronico */
  CONFIRMACION_ACEPTACION_PARCIAL = "06",
  /** Confirmacion de Rechazo del Comprobante Electronico */
  CONFIRMACION_RECHAZO = "07",
  /** Factura Electronica de Compra */
  FACTURA_COMPRA = "08",
  /** Factura Electronica de Exportacion */
  FACTURA_EXPORTACION = "09",
}

/**
 * Situation codes indicating the circumstances of document emission.
 */
export enum Situation {
  /** Normal — standard online submission */
  NORMAL = "1",
  /** Contingencia — system contingency mode */
  CONTINGENCIA = "2",
  /** Sin Internet — offline, no internet connection */
  SIN_INTERNET = "3",
}

/**
 * Input parameters for building a clave numerica.
 */
export interface ClaveInput {
  /** Emission date of the document */
  date: Date;

  /**
   * Taxpayer identification number (cedula).
   * Will be left-padded with zeros to 12 digits.
   * Must be between 1 and 12 digits.
   */
  taxpayerId: string;

  /**
   * Branch/sucursal code. 3 digits, zero-padded.
   * Defaults to "001".
   */
  branch?: string;

  /**
   * Point of sale (terminal) code. 5 digits, zero-padded.
   * Defaults to "00001".
   */
  pos?: string;

  /** Document type code (01-09) */
  documentType: DocumentType;

  /**
   * Sequential document number. 10 digits, zero-padded.
   * Must be between 1 and 9999999999.
   */
  sequence: number;

  /** Situation code (1=Normal, 2=Contingencia, 3=Sin Internet) */
  situation: Situation;

  /**
   * Security code. 8 digits.
   * If not provided, a random 8-digit code will be generated.
   */
  securityCode?: string;
}

/**
 * Parsed components of a 50-digit clave numerica.
 */
export interface ClaveParsed {
  /** The original 50-digit clave string */
  raw: string;

  /** Country code (always "506") */
  countryCode: string;

  /** Emission date parsed from DDMMYY format */
  date: Date;

  /** Raw date string in DDMMYY format */
  dateRaw: string;

  /** Taxpayer ID (12 digits, may have leading zeros) */
  taxpayerId: string;

  /** Branch/sucursal code (3 digits) */
  branch: string;

  /** Point of sale code (5 digits) */
  pos: string;

  /** Document type code (2 digits) */
  documentType: string;

  /** Sequence number (10 digits) */
  sequence: number;

  /** Raw sequence string (10 digits, zero-padded) */
  sequenceRaw: string;

  /** Situation code (1 digit) */
  situation: string;

  /** Security code (8 digits) */
  securityCode: string;
}
