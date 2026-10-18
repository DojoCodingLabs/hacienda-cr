import {
  ExactFecInputSchema,
  type ExactFecInput,
  type ExactFecCalculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
/** Declared ordinary IVA13 only: no supplier qualification, VAT timing or credit-right verdict. */
export function calculateExactFec(source: ExactFecInput): ExactFecCalculated {
  const input = ExactFecInputSchema.parse(source);
  assertDocumentIdentity(input, "08"); // Actual buyer/Receptor owns identity.
  return calculateExactOrdinaryMoney(input, "FEC");
}
