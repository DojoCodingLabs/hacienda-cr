import {
  ExactNcTotalInputSchema,
  type ExactNcTotalInput,
  type ExactNcTotalCalculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactFe } from "./exact-fe.js";

/** Recalculate the full positive credit magnitude from the one original source.
 * No editable credit amounts, negative totals, number casts or acceptance flag.
 * Caller must enforce the ten-year reference limit against its trusted actual
 * issuance/submission clock; declared-source chronology is not that gate. */
export function calculateExactNcTotal(source: ExactNcTotalInput): ExactNcTotalCalculated {
  const input = ExactNcTotalInputSchema.parse(source);
  assertDocumentIdentity(input.original, "01");
  assertDocumentIdentity(
    {
      ...input.original,
      clave: input.clave,
      numeroConsecutivo: input.numeroConsecutivo,
      fechaEmision: input.fechaEmision,
    },
    "03",
  );
  return calculateExactFe(input.original);
}
