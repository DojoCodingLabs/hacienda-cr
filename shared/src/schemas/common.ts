/**
 * Zod schemas for common sub-structures shared across document types.
 */

import { z } from "zod";
import {
  MONETARY_TEXT_PATTERN,
  isPositiveMonetaryText,
  normalizeMonetaryInput,
} from "../monetary/index.js";
import { ExonerationType } from "../constants/index.js";
import { IvaRateCode, PaymentMethod, SaleCondition, TaxCode } from "../generated/index.js";

/** Schema for tax type codes (Codigo de Impuesto), full v4.4 catalog. */
export const TaxCodeSchema = z.enum(TaxCode);

/** Schema for IVA rate codes (CodigoTarifaIVA), full v4.4 catalog. */
export const IvaRateCodeSchema = z.enum(IvaRateCode);

/** Schema for exoneration document types (TipoDocumentoEX1), full v4.4 catalog. */
export const ExonerationTypeSchema = z.enum(ExonerationType);

/** Schema for payment method codes (TipoMedioPago), full v4.4 catalog. */
export const PaymentMethodSchema = z.enum(PaymentMethod);

/**
 * Schema for sale condition codes (CondicionVenta) on regular documents —
 * excludes the two payment codes (09, 11) only the Recibo Electronico de
 * Pago XSD admits (REP_SALE_CONDITIONS).
 */
export const SaleConditionSchema = z
  .enum(SaleCondition)
  .exclude(["PAGO_SERVICIO_ESTADO", "PAGO_VENTA_CREDITO_IVA_90_DIAS"]);

// Monetary values
// ---------------------------------------------------------------------------

/**
 * Bounded monetary text: non-negative, at most 13 integer digits and at most
 * 5 decimal places, in plain notation.
 */
export const MonetaryTextSchema = z
  .string()
  .regex(MONETARY_TEXT_PATTERN, "Monto must be a bounded decimal text (0..5 decimals)");

/**
 * Monetary input at the public boundary.
 *
 * Accepts the legacy JSON `number` (the shape CLI and MCP still send) or a
 * bounded decimal text, and normalizes both to **bounded decimal text**.
 * The normalization never produces a binary float: a number is read through
 * its shortest round-trip representation and rounded HALF_UP at five
 * decimals, and a text is validated strictly (no exponent, no sign, no more
 * than five decimals, no value above the bound).
 */
export const MoneyInputSchema = z
  .custom<number | string>((value) => typeof value === "number" || typeof value === "string", {
    message: "Monto must be a number or a bounded decimal text",
  })
  .transform((value, ctx) => {
    try {
      return normalizeMonetaryInput(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid monetary amount",
      });
      return z.NEVER;
    }
  });

/** Monetary amount, zero allowed. Normalizes to bounded decimal text. */
export const MontoSchema = MoneyInputSchema;

/** Monetary amount, strictly positive. Normalizes to bounded decimal text. */
export const MontoPositiveSchema = MoneyInputSchema.refine(isPositiveMonetaryText, {
  message: "Monto must be greater than zero",
});

/** Schema for phone number (Telefono). */
export const TelefonoSchema = z.object({
  /** Country code (e.g., "506"). Max 3 digits. */
  codigoPais: z.string().regex(/^\d{1,3}$/),

  /** Ordinary phones: 8–20 digits; special service numbers: 3 digits. */
  numTelefono: z.string().regex(/^(?:[1-9]\d{2}|\d{8,20})$/),
});

export type TelefonoInput = z.infer<typeof TelefonoSchema>;

/** Schema for location (Ubicacion). */
export const UbicacionSchema = z.object({
  /** Province code (1-7). */
  provincia: z.string().regex(/^[1-7]$/),

  /** Canton code (2 digits, 01-99). */
  canton: z.string().regex(/^\d{2}$/),

  /** Distrito code (2 digits, 01-99). */
  distrito: z.string().regex(/^\d{2}$/),

  /** Barrio name (free text, 5-50 chars in v4.4 — no longer a code). Optional. */
  barrio: z.string().min(5).max(50).optional(),

  /** Additional address details. Required by the v4.4 XSD, 5-250 chars. */
  otrasSenas: z.string().min(5).max(250),
});

export type UbicacionInput = z.infer<typeof UbicacionSchema>;
