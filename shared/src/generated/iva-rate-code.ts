// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const IvaRateCode = {
  /** Tarifa 0% (Artículo 32, num 1, RLIVA) */
  EXENTO: "01",
  /** Tarifa reducida 1% */
  REDUCIDA_1: "02",
  /** Tarifa reducida 2% */
  REDUCIDA_2: "03",
  /** Tarifa reducida 4% */
  REDUCIDA_4: "04",
  /** Transitorio 0% */
  TRANSITORIO_0: "05",
  /** Transitorio 4% */
  TRANSITORIO_4: "06",
  /** Tarifa transitoria 8% */
  TRANSITORIO_8: "07",
  /** Tarifa general 13% */
  GENERAL_13: "08",
  /** Tarifa reducida 0.5% */
  REDUCIDA_0_5: "09",
  /** Tarifa Exenta */
  TARIFA_EXENTA: "10",
  /** Tarifa 0% sin derecho a crédito */
  CERO_SIN_CREDITO: "11",
} as const;

export type IvaRateCode = (typeof IvaRateCode)[keyof typeof IvaRateCode];
