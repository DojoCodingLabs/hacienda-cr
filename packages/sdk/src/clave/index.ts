/**
 * Clave numerica module.
 *
 * Provides building and parsing of the 50-digit clave numerica required
 * for every electronic document submitted to Costa Rica's Ministerio de Hacienda.
 */

export { buildClave, ClaveInputSchema } from "./build-clave.js";
export { parseClave } from "./parse-clave.js";
export {
  COUNTRY_CODE,
  DocumentType,
  Situation,
  type ClaveInput,
  type ClaveParsed,
} from "./types.js";
