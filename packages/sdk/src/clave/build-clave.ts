/**
 * Clave numerica builder.
 *
 * Generates a valid 50-digit clave numerica for electronic document submission
 * to Costa Rica's Ministerio de Hacienda.
 *
 * Format: [country:3][date:6][taxpayer:12][branch:3][pos:5][docType:2][sequence:10][situation:1][security:8]
 */

import { z } from "zod";
import { COUNTRY_CODE, DocumentType, Situation, type ClaveInput } from "./types.js";

/** Total length of a valid clave numerica */
const CLAVE_LENGTH = 50;

/** All valid document type codes */
const VALID_DOCUMENT_TYPES = new Set<string>(Object.values(DocumentType));

/** All valid situation codes */
const VALID_SITUATIONS = new Set<string>(Object.values(Situation));

/**
 * Zod schema for validating clave input parameters.
 */
export const ClaveInputSchema = z.object({
  date: z.date({ message: "date must be a valid Date object" }),

  taxpayerId: z.string({ message: "taxpayerId must be a string" }).regex(/^\d{1,12}$/, {
    message: "taxpayerId must be a numeric string between 1 and 12 digits long",
  }),

  branch: z
    .string()
    .regex(/^\d{1,3}$/, {
      message: "branch must be a numeric string between 1 and 3 digits long",
    })
    .optional(),

  pos: z
    .string()
    .regex(/^\d{1,5}$/, {
      message: "pos must be a numeric string between 1 and 5 digits long",
    })
    .optional(),

  documentType: z.nativeEnum(DocumentType, {
    message: `documentType must be a valid DocumentType (${Object.values(DocumentType).join(", ")})`,
  }),

  sequence: z
    .number({ message: "sequence must be a number" })
    .int({ message: "sequence must be an integer" })
    .min(1, { message: "sequence must be at least 1" })
    .max(9_999_999_999, {
      message: "sequence must not exceed 9999999999",
    }),

  situation: z.nativeEnum(Situation, {
    message: `situation must be a valid Situation (${Object.values(Situation).join(", ")})`,
  }),

  securityCode: z
    .string()
    .regex(/^\d{1,8}$/, {
      message: "securityCode must be a numeric string between 1 and 8 digits long",
    })
    .optional(),
});

/**
 * Formats a date as DDMMYY.
 */
function formatDateDDMMYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  return `${day}${month}${year}`;
}

/**
 * Generates a cryptographically random 8-digit numeric security code.
 *
 * Uses `crypto.getRandomValues()` instead of `Math.random()` to ensure
 * the security code is not predictable. This is important because the
 * security code is part of the clave numerica, which must be unique
 * and non-guessable per Hacienda requirements.
 */
function generateSecurityCode(): string {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- array has exactly 1 element
  const code = array[0]! % 100_000_000;
  return String(code).padStart(8, "0");
}

/**
 * Builds a 50-digit clave numerica from the given parameters.
 *
 * @param input - The components used to build the clave
 * @returns A 50-digit string representing the clave numerica
 * @throws {z.ZodError} If any input parameter is invalid
 *
 * @example
 * ```ts
 * import { buildClave, DocumentType, Situation } from "@dojocoding/hacienda-sdk";
 *
 * const clave = buildClave({
 *   date: new Date(2025, 6, 27), // July 27, 2025
 *   taxpayerId: "3101234567",
 *   documentType: DocumentType.FACTURA_ELECTRONICA,
 *   sequence: 1,
 *   situation: Situation.NORMAL,
 * });
 *
 * console.log(clave); // "50627072531012345670010000101000000000119999999" (50 digits)
 * ```
 */
export function buildClave(input: ClaveInput): string {
  // Validate input with Zod
  const validated = ClaveInputSchema.parse(input);

  // Validate the date is not invalid (NaN)
  if (isNaN(validated.date.getTime())) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "date must be a valid Date (not Invalid Date)",
        path: ["date"],
      },
    ]);
  }

  // Build each component
  const country = COUNTRY_CODE;
  const date = formatDateDDMMYY(validated.date);
  const taxpayer = validated.taxpayerId.padStart(12, "0");
  const branch = (validated.branch ?? "1").padStart(3, "0");
  const pos = (validated.pos ?? "1").padStart(5, "0");
  const docType = validated.documentType;
  const sequence = String(validated.sequence).padStart(10, "0");
  const situation = validated.situation;
  const security = (validated.securityCode ?? generateSecurityCode()).padStart(8, "0");

  const clave = `${country}${date}${taxpayer}${branch}${pos}${docType}${sequence}${situation}${security}`;

  // Sanity check — should always be 50 digits
  if (clave.length !== CLAVE_LENGTH) {
    throw new Error(
      `Internal error: generated clave is ${clave.length} digits, expected ${CLAVE_LENGTH}`,
    );
  }

  return clave;
}

// Re-export for convenience
export { VALID_DOCUMENT_TYPES, VALID_SITUATIONS };
