/**
 * Currency accessors for Costa Rica electronic invoicing.
 *
 * El catálogo completo `CURRENCY_CODES` (ISO 4217, 168 valores) es generado
 * desde `codes.json` (XSD v4.4 vendorizado); el tipo y los accessors con
 * nombre son curaduría manual (el tipo se re-deriva aquí porque la const
 * de accessors comparte el nombre — ver table-map.mjs, emitType: false).
 */
import type { CURRENCY_CODES } from "../generated/currency-codes.js";

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Named accessors for currencies commonly used in Costa Rica. */
export const CurrencyCode = {
  /** Colon costarricense */
  CRC: "CRC",
  /** Dolar estadounidense */
  USD: "USD",
  /** Euro */
  EUR: "EUR",
} as const satisfies Record<string, CurrencyCode>;
