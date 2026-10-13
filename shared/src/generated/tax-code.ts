// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const TaxCode = {
  /** Impuesto al Valor Agregado */
  IVA: "01",
  /** Impuesto Selectivo de Consumo */
  IMPUESTO_SELECTIVO_CONSUMO: "02",
  /** Impuesto unico a los combustivos */
  IMPUESTO_UNICO_COMBUSTIBLES: "03",
  /** Impuesto especifico de bebidas alcohólicas */
  IMPUESTO_BEBIDAS_ALCOHOLICAS: "04",
  /** impuesto especifico sobre las bebidas envasadas sin contenido alcoholico y jabones de tocador */
  IMPUESTO_BEBIDAS_SIN_ALCOHOL: "05",
  /** impuesto a los productos de tabaco */
  IMPUESTO_TABACO: "06",
  /** IVA (cálculo especial) */
  IVA_CALCULO_ESPECIAL: "07",
  /** IVA Régimen de Bienes Usados (Factor) */
  IVA_BIENES_USADOS: "08",
  /** Impuesto Especifico al Cemento */
  IMPUESTO_CEMENTO: "12",
  /** Otros */
  OTROS: "99",
} as const;

export type TaxCode = (typeof TaxCode)[keyof typeof TaxCode];
