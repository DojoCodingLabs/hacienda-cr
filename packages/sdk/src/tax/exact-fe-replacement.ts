import {
  ExactFeReplacementInputSchema,
  type ExactFeReplacementInput,
  type ExactFeReplacementCalculated,
} from "@dojocoding/hacienda-shared";
import { calculateExactFe } from "./exact-fe.js";
import { assertDocumentIdentity } from "../xml/document-identity.js";
/** Recalculate NEW corrected source only. Caller separately proves institutional
 * rejection, retained bytes/current scope and fresh sequence authority. */
export function calculateExactFeReplacement(
  source: ExactFeReplacementInput,
): ExactFeReplacementCalculated {
  const input = ExactFeReplacementInputSchema.parse(source);
  assertDocumentIdentity(input.replacement, "01");
  return calculateExactFe(input.replacement);
}
