/**
 * Clave numerica (50-digit key) types.
 *
 * Every electronic document submitted to Hacienda requires a unique 50-digit key
 * with the following structure:
 *
 * [506][DDMMYY][12-digit taxpayer ID][4-digit branch][4-digit POS][4-digit doc type][10-digit sequence][1-digit situation][8-digit security code]
 */

import type { DocumentTypeCode, SituationCode } from "../constants/index.js";

/** Total length of the clave numerica. */
export const CLAVE_LENGTH = 50;

/** Components of the 50-digit clave numerica. */
export interface ClaveComponents {
  /** Country code — always "506" for Costa Rica. */
  countryCode: string;

  /** Emission date in DDMMYY format. */
  date: string;

  /** Taxpayer identification number, zero-padded to 12 digits. */
  taxpayerId: string;

  /** Branch number (sucursal), zero-padded to 4 digits. Defaults to "001". */
  branch: string;

  /** Point of sale terminal number, zero-padded to 4 digits. Defaults to "00001". */
  terminal: string;

  /** Document type code (01-09). */
  documentType: DocumentTypeCode;

  /** Sequence number, zero-padded to 10 digits. */
  sequence: string;

  /** Situation code (1=normal, 2=contingency, 3=no internet). */
  situation: SituationCode;

  /** 8-digit random security code. */
  securityCode: string;
}

/** Input parameters for building a clave numerica. */
export interface ClaveInput {
  /** Emission date. */
  date: Date;

  /** Taxpayer identification number (without padding). */
  taxpayerId: string;

  /** Document type code. */
  documentType: DocumentTypeCode;

  /** Sequential document number (without padding). */
  sequence: number;

  /** Branch number. Defaults to 1. */
  branch?: number;

  /** Point of sale terminal number. Defaults to 1. */
  terminal?: number;

  /** Situation code. Defaults to "1" (normal). */
  situation?: SituationCode;

  /** Optional 8-digit security code. Generated randomly if not provided. */
  securityCode?: string;
}

/** A validated 50-digit clave numerica string. */
export type ClaveNumerica = string & { readonly __brand: "ClaveNumerica" };
