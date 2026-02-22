/**
 * Zod schema for clave numerica component validation.
 */

import { z } from "zod";
import { DocumentTypeCode, SituationCode } from "../constants/index.js";

/** Schema for individual clave numerica components. */
export const ClaveComponentsSchema = z.object({
  /** Country code — must be "506". */
  countryCode: z.literal("506"),

  /** Date in DDMMYY format. */
  date: z.string().regex(/^\d{6}$/, "Date must be in DDMMYY format (6 digits)"),

  /** Taxpayer ID, zero-padded to 12 digits. */
  taxpayerId: z.string().regex(/^\d{12}$/, "Taxpayer ID must be exactly 12 digits (zero-padded)"),

  /** Branch number, zero-padded to 3 digits. */
  branch: z.string().regex(/^\d{3}$/, "Branch must be exactly 3 digits"),

  /** Terminal / POS number, zero-padded to 5 digits. */
  terminal: z.string().regex(/^\d{5}$/, "Terminal must be exactly 5 digits"),

  /** Document type code (2 digits). */
  documentType: z.enum([
    DocumentTypeCode.FACTURA_ELECTRONICA,
    DocumentTypeCode.NOTA_DEBITO_ELECTRONICA,
    DocumentTypeCode.NOTA_CREDITO_ELECTRONICA,
    DocumentTypeCode.TIQUETE_ELECTRONICO,
    DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA,
    DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION,
    DocumentTypeCode.RECIBO_ELECTRONICO_PAGO,
    DocumentTypeCode.COMPRA_PAGO,
    DocumentTypeCode.GASTO_VIAJE,
  ]),

  /** Sequence number, zero-padded to 10 digits. */
  sequence: z.string().regex(/^\d{10}$/, "Sequence must be exactly 10 digits"),

  /** Situation code (1 digit). */
  situation: z.enum([SituationCode.NORMAL, SituationCode.CONTINGENCIA, SituationCode.SIN_INTERNET]),

  /** 8-digit security code. */
  securityCode: z.string().regex(/^\d{8}$/, "Security code must be exactly 8 digits"),
});

export type ClaveComponentsInput = z.infer<typeof ClaveComponentsSchema>;

/** Schema for clave numerica input (before zero-padding and formatting). */
export const ClaveInputSchema = z.object({
  /** Emission date. */
  date: z.date(),

  /** Taxpayer identification number (raw, without padding). 9-12 digits. */
  taxpayerId: z.string().regex(/^\d{9,12}$/, "Taxpayer ID must be 9-12 digits"),

  /** Document type code. */
  documentType: z.enum([
    DocumentTypeCode.FACTURA_ELECTRONICA,
    DocumentTypeCode.NOTA_DEBITO_ELECTRONICA,
    DocumentTypeCode.NOTA_CREDITO_ELECTRONICA,
    DocumentTypeCode.TIQUETE_ELECTRONICO,
    DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA,
    DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION,
    DocumentTypeCode.RECIBO_ELECTRONICO_PAGO,
    DocumentTypeCode.COMPRA_PAGO,
    DocumentTypeCode.GASTO_VIAJE,
  ]),

  /** Sequential document number (1 to 9999999999). */
  sequence: z.number().int().positive().max(9_999_999_999),

  /** Branch number. Defaults to 1. */
  branch: z.number().int().positive().max(999).default(1),

  /** Terminal / POS number. Defaults to 1. */
  terminal: z.number().int().positive().max(99_999).default(1),

  /** Situation code. Defaults to "1" (normal). */
  situation: z
    .enum([SituationCode.NORMAL, SituationCode.CONTINGENCIA, SituationCode.SIN_INTERNET])
    .default(SituationCode.NORMAL),

  /** 8-digit security code. Generated randomly if not provided. */
  securityCode: z
    .string()
    .regex(/^\d{8}$/, "Security code must be exactly 8 digits")
    .optional(),
});

export type ClaveInputParsed = z.infer<typeof ClaveInputSchema>;

/** Schema validating a complete 50-digit clave string. */
export const ClaveNumericaSchema = z
  .string()
  .length(50, "Clave numerica must be exactly 50 characters")
  .regex(/^\d{50}$/, "Clave numerica must contain only digits");
