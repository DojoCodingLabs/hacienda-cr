// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const SituationCode = {
  /** Normal */
  NORMAL: "1",
  /** Contingencia */
  CONTINGENCIA: "2",
  /** Sin internet */
  SIN_INTERNET: "3",
} as const;

export type SituationCode = (typeof SituationCode)[keyof typeof SituationCode];
