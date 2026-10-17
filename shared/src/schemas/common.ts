/**
 * Zod schemas for common sub-structures shared across document types.
 */

import { z } from "zod";
import {
  ExonerationType,
  IvaRateCode,
  PaymentMethod,
  SaleCondition,
  TaxCode,
} from "../generated/index.js";
import type { Money } from "../types/money.js";

/**
 * Zod schema for a monetary input value.
 *
 * Accepts a plain `number` (the usual JSON / MCP / CLI input) or a `Money`
 * instance (e.g. values produced by the SDK calculator) and normalizes both to
 * a number. This keeps the input boundary tolerant while the public document
 * types carry `Money`.
 */
export const MoneyInputSchema = z
  .custom<Money | number>(
    (val): val is Money | number =>
      typeof val === "number" ||
      (typeof val === "object" && val !== null && typeof (val as Money).toNumber === "function"),
    "Invalid monetary value: expected a number or Money",
  )
  .transform((val) => (typeof val === "number" ? val : val.toNumber()));

/** Monetary input that must be non-negative (most amounts). */
export const MontoSchema = MoneyInputSchema.refine(
  (val) => val >= 0,
  "amount must be non-negative",
);

/** Monetary input that must be strictly positive (e.g. discounts). */
export const MontoPositiveSchema = MoneyInputSchema.refine(
  (val) => val > 0,
  "amount must be positive",
);

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

/** Schema for phone number (Telefono). */
export const TelefonoSchema = z.object({
  /** Country code (e.g., "506"). Max 3 digits. */
  codigoPais: z.string().regex(/^\d{1,3}$/),

  /** Phone number. Max 20 digits. */
  numTelefono: z.string().regex(/^\d{1,20}$/),
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
