/**
 * Payment method codes (Medio de Pago) for electronic documents.
 */

/** Payment method codes. */
export const PaymentMethod = {
  /** Efectivo (cash) */
  EFECTIVO: "01",
  /** Tarjeta (card) */
  TARJETA: "02",
  /** Cheque */
  CHEQUE: "03",
  /** Transferencia - Deposito bancario */
  TRANSFERENCIA: "04",
  /** Recaudado por terceros */
  RECAUDADO_TERCEROS: "05",
  /** Otros (especificar) */
  OTROS: "99",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** Human-readable names for payment methods. */
export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
  [PaymentMethod.EFECTIVO]: "Efectivo",
  [PaymentMethod.TARJETA]: "Tarjeta",
  [PaymentMethod.CHEQUE]: "Cheque",
  [PaymentMethod.TRANSFERENCIA]: "Transferencia - Depósito bancario",
  [PaymentMethod.RECAUDADO_TERCEROS]: "Recaudado por terceros",
  [PaymentMethod.OTROS]: "Otros",
} as const;
