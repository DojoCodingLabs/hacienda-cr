// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const MensajeReceptorCode = {
  /** Aceptado */
  ACEPTADO: "1",
  /** Aceptado Parcialmente */
  ACEPTADO_PARCIALMENTE: "2",
  /** Rechazado */
  RECHAZADO: "3",
} as const;

export type MensajeReceptorCode = (typeof MensajeReceptorCode)[keyof typeof MensajeReceptorCode];
