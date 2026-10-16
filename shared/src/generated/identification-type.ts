// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const IdentificationType = {
  /** Cedula Fisica */
  CEDULA_FISICA: "01",
  /** Cedula Juridica */
  CEDULA_JURIDICA: "02",
  /** DIMEX */
  DIMEX: "03",
  /** NITE */
  NITE: "04",
  /** Extranjero No Domiciliado */
  EXTRANJERO_NO_DOMICILIADO: "05",
  /** No Contribuyente */
  NO_CONTRIBUYENTE: "06",
} as const;

export type IdentificationType = (typeof IdentificationType)[keyof typeof IdentificationType];
