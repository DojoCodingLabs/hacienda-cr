// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const ExonerationType = {
  /** Compras autorizadas por la Dirección General de Tributación */
  COMPRAS_AUTORIZADAS: "01",
  /** Ventas exentas a diplomáticos */
  VENTAS_EXENTAS_DIPLOMATICOS: "02",
  /** Autorizado por Ley Especial */
  AUTORIZADO_LEY_ESPECIAL: "03",
  /** Exenciones Dirección General de Hacienda Autorización Local Genérica */
  EXENCIONES_DGH: "04",
  /** Exenciones Dirección General de Hacienda Transitorio V (servicios de ingeniería, arquitectura, topografía obra civil) */
  TRANSITORIO_V: "05",
  /** Servicios turísticos inscritos ante el Instituto Costarricense de Turismo (ICT) */
  SERVICIOS_TURISTICOS_ICT: "06",
  /** Transitorio XVII (Recolección, Clasificación, almacenamiento de Reciclaje y reutilizable) */
  TRANSITORIO_XVII: "07",
  /** Exoneración a Zona Franca */
  ZONA_FRANCA: "08",
  /** Exoneración de servicios complementarios para la exportación articulo 11 RLIVA */
  SERVICIOS_COMPLEMENTARIOS_EXPORTACION: "09",
  /** Órgano de las corporaciones municipales */
  CORPORACIONES_MUNICIPALES: "10",
  /** Exenciones Dirección General de Hacienda Autorización de Impuesto Local Concreta */
  DGH_IMPUESTO_LOCAL_CONCRETA: "11",
  /** Otros */
  OTROS: "99",
} as const;

export type ExonerationType = (typeof ExonerationType)[keyof typeof ExonerationType];
