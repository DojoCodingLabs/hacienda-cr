/**
 * Tax-related codes and constants for Costa Rica electronic invoicing.
 *
 * Covers IVA tax codes, tax rates, exoneration types, and related enumerations
 * as defined in the Hacienda v4.4 specification.
 */

/** Tax type codes (Codigo de Impuesto). */
export const TaxCode = {
  /** Impuesto al Valor Agregado (IVA) */
  IVA: "01",
  /** Impuesto Selectivo de Consumo */
  IMPUESTO_SELECTIVO_CONSUMO: "02",
  /** Impuesto Unico a los Combustibles */
  IMPUESTO_UNICO_COMBUSTIBLES: "03",
  /** Impuesto Especifico de Bebidas Alcoholicas */
  IMPUESTO_BEBIDAS_ALCOHOLICAS: "04",
  /** Impuesto Especifico sobre Bebidas Envasadas sin Alcohol y Jabones de Tocador */
  IMPUESTO_BEBIDAS_SIN_ALCOHOL: "05",
  /** Impuesto al Tabaco */
  IMPUESTO_TABACO: "06",
  /** IVA (calculo especial) */
  IVA_CALCULO_ESPECIAL: "07",
  /** IVA Regimen de Bienes Usados (Factor) */
  IVA_BIENES_USADOS: "08",
  /** Impuesto Especifico al Cemento */
  IMPUESTO_CEMENTO: "12",
  /** Otros */
  OTROS: "99",
} as const;

export type TaxCode = (typeof TaxCode)[keyof typeof TaxCode];

/** IVA tax rate codes (Codigo de Tarifa del IVA). */
export const IvaRateCode = {
  /** Tarifa 0% (Exento) */
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
  /** Transitorio 8% */
  TRANSITORIO_8: "07",
  /** Tarifa general 13% */
  GENERAL_13: "08",
} as const;

export type IvaRateCode = (typeof IvaRateCode)[keyof typeof IvaRateCode];

/** IVA rate percentages mapped by rate code. */
export const IVA_RATE_PERCENTAGES: Record<IvaRateCode, number> = {
  [IvaRateCode.EXENTO]: 0,
  [IvaRateCode.REDUCIDA_1]: 1,
  [IvaRateCode.REDUCIDA_2]: 2,
  [IvaRateCode.REDUCIDA_4]: 4,
  [IvaRateCode.TRANSITORIO_0]: 0,
  [IvaRateCode.TRANSITORIO_4]: 4,
  [IvaRateCode.TRANSITORIO_8]: 8,
  [IvaRateCode.GENERAL_13]: 13,
} as const;

/** Exoneration type codes. */
export const ExonerationType = {
  /** Compras autorizadas */
  COMPRAS_AUTORIZADAS: "01",
  /** Ventas exentas a diplomáticos */
  VENTAS_EXENTAS_DIPLOMATICOS: "02",
  /** Autorizado por ley especial */
  AUTORIZADO_LEY_ESPECIAL: "03",
  /** Exenciones de la Dirección General de Hacienda */
  EXENCIONES_DGH: "04",
  /** Transitorio V */
  TRANSITORIO_V: "05",
  /** Transitorio IX */
  TRANSITORIO_IX: "06",
  /** Transitorio XVII */
  TRANSITORIO_XVII: "07",
  /** Otros */
  OTROS: "99",
} as const;

export type ExonerationType = (typeof ExonerationType)[keyof typeof ExonerationType];

/** Unit of measure codes (Unidad de Medida). */
export const UnitOfMeasure = {
  /** Servicios profesionales (sp) */
  SERVICIOS_PROFESIONALES: "Sp",
  /** Metros */
  METROS: "m",
  /** Kilogramos */
  KILOGRAMOS: "kg",
  /** Segundos */
  SEGUNDOS: "s",
  /** Amperes */
  AMPERES: "A",
  /** Kelvin */
  KELVIN: "K",
  /** Moles */
  MOLES: "mol",
  /** Candelas */
  CANDELAS: "cd",
  /** Metros cuadrados */
  METROS_CUADRADOS: "m²",
  /** Metros cubicos */
  METROS_CUBICOS: "m³",
  /** Litros */
  LITROS: "l",
  /** Watts */
  WATTS: "W",
  /** Voltios */
  VOLTIOS: "V",
  /** Julios (Joules) */
  JULIOS: "J",
  /** Gramos */
  GRAMOS: "g",
  /** Toneladas */
  TONELADAS: "t",
  /** Galones */
  GALONES: "Gal",
  /** Unidad */
  UNIDAD: "Unid",
  /** Otros (especificar) */
  OTROS: "Os",
  /** Pulgadas */
  PULGADAS: "in",
  /** Centimetros */
  CENTIMETROS: "cm",
  /** Mililitros */
  MILILITROS: "ml",
  /** Onzas */
  ONZAS: "oz",
  /** Libras */
  LIBRAS: "lb",
  /** Pies */
  PIES: "ft",
  /** Yardas */
  YARDAS: "yd",
  /** Horas */
  HORAS: "h",
  /** Minutos */
  MINUTOS: "min",
  /** Dias */
  DIAS: "d",
  /** Cajas */
  CAJAS: "Cj",
  /** Paquetes */
  PAQUETES: "Pq",
} as const;

export type UnitOfMeasure = (typeof UnitOfMeasure)[keyof typeof UnitOfMeasure];
