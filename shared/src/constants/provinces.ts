/**
 * Costa Rica province codes.
 *
 * Used in the Ubicacion (location) section of electronic documents.
 */

/** Province codes (1-7). */
export const ProvinceCode = {
  /** San Jose */
  SAN_JOSE: "1",
  /** Alajuela */
  ALAJUELA: "2",
  /** Cartago */
  CARTAGO: "3",
  /** Heredia */
  HEREDIA: "4",
  /** Guanacaste */
  GUANACASTE: "5",
  /** Puntarenas */
  PUNTARENAS: "6",
  /** Limon */
  LIMON: "7",
} as const;

export type ProvinceCode = (typeof ProvinceCode)[keyof typeof ProvinceCode];

/** Province names mapped by code. */
export const PROVINCE_NAMES: Record<ProvinceCode, string> = {
  [ProvinceCode.SAN_JOSE]: "San José",
  [ProvinceCode.ALAJUELA]: "Alajuela",
  [ProvinceCode.CARTAGO]: "Cartago",
  [ProvinceCode.HEREDIA]: "Heredia",
  [ProvinceCode.GUANACASTE]: "Guanacaste",
  [ProvinceCode.PUNTARENAS]: "Puntarenas",
  [ProvinceCode.LIMON]: "Limón",
} as const;
