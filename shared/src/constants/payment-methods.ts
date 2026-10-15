/**
 * Payment method codes (Medio de Pago) for electronic documents.
 *
 * v4.4: MedioPago lives inside ResumenFactura (up to 4 entries, each with
 * an amount); codes 06 and 07 are new in v4.4.
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
  /** SINPE Movil */
  SINPE_MOVIL: "06",
  /** Plataforma Digital */
  PLATAFORMA_DIGITAL: "07",
  /** Otros (especificar en MedioPagoOtros) */
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
  [PaymentMethod.SINPE_MOVIL]: "SINPE Móvil",
  [PaymentMethod.PLATAFORMA_DIGITAL]: "Plataforma Digital",
  [PaymentMethod.OTROS]: "Otros",
} as const;
