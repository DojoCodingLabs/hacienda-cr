/**
 * Currency codes commonly used in Costa Rica electronic invoicing.
 */

/** ISO 4217 currency codes used in Hacienda documents. */
export const CurrencyCode = {
  /** Colon costarricense */
  CRC: "CRC",
  /** Dolar estadounidense */
  USD: "USD",
  /** Euro */
  EUR: "EUR",
} as const;

export type CurrencyCode = (typeof CurrencyCode)[keyof typeof CurrencyCode];
