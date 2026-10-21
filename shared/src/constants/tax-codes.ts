/**
 * Tax-related constants for Costa Rica electronic invoicing.
 *
 * Covers IVA rate lookups and the exoneration/unit catalogs sin pareja
 * exacta con `codes.json` (ver table-map.mjs). Los catálogos `TaxCode` e
 * `IvaRateCode` migraron a `shared/src/generated/`; `UNITS_OF_MEASURE`
 * queda a mano como catálogo curado; conserva U+2126 (signo ohm).
 */
import { IvaRateCode } from "../generated/iva-rate-code.js";

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

/** Exoneration type codes (sin pareja con el XSD: el vendorizado no trae el 12). */
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
  /** Servicios turísticos ICT. */
  SERVICIOS_TURISTICOS_ICT: "06",
  /** @deprecated Misnamed historical alias; use SERVICIOS_TURISTICOS_ICT. */
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
  /** Otros */
  OTROS: "99",
} as const;

export type ExonerationType = (typeof ExonerationType)[keyof typeof ExonerationType];

/**
 * Unit of measure codes (Unidad de Medida), vendored verbatim from the
 * v4.4 XSD enumeration (UnidadMedidaType, 101 values). Casing follows the
 * official schema exactly (e.g. "Kg", "L", "mL", "Min").
 *
 * Catálogo curado: conserva el U+2126 OHM SIGN oficial, ya corregido en main.
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
  "Ω",
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
