/**
 * Clave numerica parser.
 *
 * Parses a 50-digit clave numerica string into its component parts.
 *
 * Format: [country:3][date:6][taxpayer:12][branch:3][pos:5][docType:2][sequence:10][situation:1][security:8]
 *
 * Offset table:
 *   0..3   country     (3 digits)
 *   3..9   date        (6 digits, DDMMYY)
 *   9..21  taxpayer    (12 digits)
 *  21..24  branch      (3 digits)
 *  24..29  pos         (5 digits)
 *  29..31  docType     (2 digits)
 *  31..41  sequence    (10 digits)
 *  41..42  situation   (1 digit)
 *  42..50  security    (8 digits)
 */

import { COUNTRY_CODE, type ClaveParsed } from "./types.js";

/**
 * Parses a DDMMYY date string into a Date object.
 *
 * @param ddmmyy - 6-digit date string in DDMMYY format
 * @returns A Date object set to the parsed date
 * @throws {Error} If the date string is invalid
 */
function parseDateDDMMYY(ddmmyy: string): Date {
  const day = parseInt(ddmmyy.slice(0, 2), 10);
  const month = parseInt(ddmmyy.slice(2, 4), 10);
  const yearShort = parseInt(ddmmyy.slice(4, 6), 10);

  // Two-digit year: 00-99 maps to 2000-2099
  // (Costa Rica's electronic invoicing started in 2018, so this is safe)
  const year = 2000 + yearShort;

  // Validate date components
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in clave date: ${month} (from date string "${ddmmyy}")`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day in clave date: ${day} (from date string "${ddmmyy}")`);
  }

  // Create date and verify it round-trips correctly
  // (catches invalid dates like Feb 30)
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date in clave: ${ddmmyy} does not represent a valid calendar date`);
  }

  return date;
}

/**
 * Parses a 50-digit clave numerica string into its component parts.
 *
 * @param clave - A 50-digit numeric string
 * @returns The parsed components of the clave
 * @throws {Error} If the clave is not exactly 50 digits, contains non-digit characters,
 *                 or has an invalid country code
 *
 * @example
 * ```ts
 * import { parseClave } from "@hacienda-cr/sdk";
 *
 * const parsed = parseClave("50627072531012345670010000101000000000119999999");
 * console.log(parsed.taxpayerId);   // "310123456700"
 * console.log(parsed.documentType); // "01"
 * console.log(parsed.date);         // Date object for July 27, 2025
 * ```
 */
export function parseClave(clave: string): ClaveParsed {
  // Validate length
  if (clave.length !== 50) {
    throw new Error(`Clave must be exactly 50 characters, got ${clave.length}`);
  }

  // Validate all characters are digits
  if (!/^\d{50}$/.test(clave)) {
    throw new Error("Clave must contain only digits (0-9)");
  }

  // Extract components by position
  const countryCode = clave.slice(0, 3);
  const dateRaw = clave.slice(3, 9);
  const taxpayerId = clave.slice(9, 21);
  const branch = clave.slice(21, 24);
  const pos = clave.slice(24, 29);
  const documentType = clave.slice(29, 31);
  const sequenceRaw = clave.slice(31, 41);
  const situation = clave.slice(41, 42);
  const securityCode = clave.slice(42, 50);

  // Validate country code
  if (countryCode !== COUNTRY_CODE) {
    throw new Error(`Invalid country code: expected "${COUNTRY_CODE}", got "${countryCode}"`);
  }

  // Parse date
  const date = parseDateDDMMYY(dateRaw);

  // Parse sequence number
  const sequence = parseInt(sequenceRaw, 10);

  return {
    raw: clave,
    countryCode,
    date,
    dateRaw,
    taxpayerId,
    branch,
    pos,
    documentType,
    sequence,
    sequenceRaw,
    situation,
    securityCode,
  };
}
