/**
 * Costa Rica province helpers.
 *
 * El catálogo `ProvinceCode` es generado desde `codes.json`
 * (`shared/src/generated/province-code.ts`); el mapa de nombres es
 * curaduría manual.
 */
import { ProvinceCode } from "../generated/province-code.js";

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
