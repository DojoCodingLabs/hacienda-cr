import {
  ExactTeInputSchema,
  type ExactTeInput,
  type ExactTeCalculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
/** Exact source calculation, not proof of fiscal eligibility or cash collection. */
export function calculateExactTe(source: ExactTeInput): ExactTeCalculated {
  const input = ExactTeInputSchema.parse(source);
  assertDocumentIdentity(input, "04");
  return calculateExactOrdinaryMoney(input, "TE");
}
