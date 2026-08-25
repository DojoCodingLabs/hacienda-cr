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
  /** Tarifa reducida 0.5% (new in v4.4) */
  REDUCIDA_0_5: "09",
  /** Tarifa exenta (new in v4.4) */
  TARIFA_EXENTA: "10",
  /** Tarifa 0% sin derecho a credito (new in v4.4) */
  CERO_SIN_CREDITO: "11",
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
  [IvaRateCode.REDUCIDA_0_5]: 0.5,
  [IvaRateCode.TARIFA_EXENTA]: 0,
  [IvaRateCode.CERO_SIN_CREDITO]: 0,
} as const;

/** Human-readable names for IVA rate codes. */
export const IVA_RATE_NAMES: Record<IvaRateCode, string> = {
  [IvaRateCode.EXENTO]: "Exento (0%)",
  [IvaRateCode.REDUCIDA_1]: "Tarifa reducida 1%",
  [IvaRateCode.REDUCIDA_2]: "Tarifa reducida 2%",
  [IvaRateCode.REDUCIDA_4]: "Tarifa reducida 4%",
  [IvaRateCode.TRANSITORIO_0]: "Transitorio 0%",
  [IvaRateCode.TRANSITORIO_4]: "Transitorio 4%",
  [IvaRateCode.TRANSITORIO_8]: "Transitorio 8%",
  [IvaRateCode.GENERAL_13]: "Tarifa general 13%",
  [IvaRateCode.REDUCIDA_0_5]: "Tarifa reducida 0.5%",
  [IvaRateCode.TARIFA_EXENTA]: "Tarifa exenta",
  [IvaRateCode.CERO_SIN_CREDITO]: "Tarifa 0% sin derecho a crédito",
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
  /** Exoneracion Zona Franca (new in v4.4) */
  ZONA_FRANCA: "08",
  /** Exoneracion de servicios complementarios para la exportacion (new in v4.4) */
  SERVICIOS_COMPLEMENTARIOS_EXPORTACION: "09",
  /** Organo de las corporaciones municipales (new in v4.4) */
  CORPORACIONES_MUNICIPALES: "10",
  /** Exenciones DGH — autorizacion de impuesto local concreta (new in v4.4) */
  DGH_IMPUESTO_LOCAL_CONCRETA: "11",
  /** Codigo 12 — ver ANEXOS Y ESTRUCTURAS v4.4 para la descripcion oficial */
  EXONERACION_12: "12",
  /** Otros */
  OTROS: "99",
} as const;

export type ExonerationType = (typeof ExonerationType)[keyof typeof ExonerationType];

/**
 * Unit of measure codes (Unidad de Medida), vendored verbatim from the
 * v4.4 XSD enumeration (UnidadMedidaType, 101 values). Casing follows the
 * official schema exactly (e.g. "Kg", "L", "mL", "Min").
 */
export const UNITS_OF_MEASURE = [
  "1",
  "´",
  "´´",
  "°C",
  "1/m",
  "A",
  "A/m",
  "A/m²",
  "Acv",
  "Al",
  "Alc",
  "B",
  "Bq",
  "C",
  "C/kg",
  "C/m²",
  "C/m³",
  "Cc",
  "Cd",
  "cd/m²",
  "Cm",
  "cm",
  "Cu",
  "D",
  "eV",
  "F",
  "F/m",
  "Fa",
  "G",
  "Gal",
  "Gy",
  "Gy/s",
  "h",
  "H",
  "H/m",
  "Hz",
  "I",
  "J",
  "J/(kg·K)",
  "J/(mol·K)",
  "J/K",
  "J/kg",
  "J/m³",
  "J/mol",
  "K",
  "Kat",
  "kat/m³",
  "Kg",
  "kg/m³",
  "Km",
  "Kw",
  "kWh",
  "L",
  "Lm",
  "Ln",
  "Lx",
  "M",
  "m/s",
  "m/s²",
  "m²",
  "m³",
  "Min",
  "mL",
  "Mm",
  "Mol",
  "mol/m³",
  "N",
  "N/m",
  "N·m",
  "Np",
  "º",
  "Os",
  "Otros",
  "Oz",
  "Pa",
  "Pa·s",
  "Qq",
  "Rad",
  "rad/s",
  "rad/s²",
  "S",
  "s",
  "Sp",
  "Spe",
  "Sr",
  "St",
  "Sv",
  "t",
  "T",
  "U",
  "Ua",
  "Unid",
  "V",
  "V/m",
  "W",
  "W/(m·K)",
  "W/(m²·sr)",
  "W/m²",
  "W/sr",
  "Wb",
  "Ω",
] as const;

export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];

/** Named accessors for commonly used units (all values exist in UNITS_OF_MEASURE). */
export const UnitOfMeasure = {
  /** Servicios profesionales */
  SERVICIOS_PROFESIONALES: "Sp",
  /** Otros servicios */
  OTROS_SERVICIOS: "Os",
  /** Servicios personales */
  SERVICIOS_PERSONALES: "Spe",
  /** Unidad */
  UNIDAD: "Unid",
  /** Metros */
  METROS: "M",
  /** Centimetros */
  CENTIMETROS: "cm",
  /** Kilometros */
  KILOMETROS: "Km",
  /** Kilogramos */
  KILOGRAMOS: "Kg",
  /** Gramos */
  GRAMOS: "G",
  /** Toneladas */
  TONELADAS: "t",
  /** Litros */
  LITROS: "L",
  /** Mililitros */
  MILILITROS: "mL",
  /** Metros cuadrados */
  METROS_CUADRADOS: "m²",
  /** Metros cubicos */
  METROS_CUBICOS: "m³",
  /** Galones */
  GALONES: "Gal",
  /** Onzas */
  ONZAS: "Oz",
  /** Horas */
  HORAS: "h",
  /** Minutos */
  MINUTOS: "Min",
  /** Segundos */
  SEGUNDOS: "s",
  /** Dias */
  DIAS: "D",
  /** Otros (especificar) */
  OTROS: "Otros",
} as const satisfies Record<string, UnitOfMeasure>;
