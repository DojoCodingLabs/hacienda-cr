// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const PaymentMethod = {
  /** Efectivo */
  EFECTIVO: "01",
  /** Tarjeta */
  TARJETA: "02",
  /** Cheque */
  CHEQUE: "03",
  /** Transferencia - depósito bancario */
  TRANSFERENCIA: "04",
  /** Recaudado por terceros */
  RECAUDADO_TERCEROS: "05",
  /** SINPE MOVIL */
  SINPE_MOVIL: "06",
  /** Plataforma Digital */
  PLATAFORMA_DIGITAL: "07",
  /** Otros */
  OTROS: "99",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
