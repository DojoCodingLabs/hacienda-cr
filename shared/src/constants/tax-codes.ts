/**
 * Tax-related constants for Costa Rica electronic invoicing.
 *
 * Covers IVA rate lookups and the curated unit accessors. Los catálogos
 * `TaxCode`, `IvaRateCode` y `ExonerationType` migraron a
 * `shared/src/generated/`; `UNITS_OF_MEASURE` también se genera y aquí solo
 * quedan los accessors curados y su tipo.
 */
import { IvaRateCode } from "../generated/iva-rate-code.js";
import type { UNITS_OF_MEASURE } from "../generated/units-of-measure.js";

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

/**
 * Unit of measure codes (Unidad de Medida), generated from the v4.4 XSD
 * enumeration (`UnidadMedidaType`, 101 values) — incluido el homógrafo «Ω»
 * `U+2126` (OHM SIGN) que exigen las fuentes (informe A1 §6.3).
 */
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
