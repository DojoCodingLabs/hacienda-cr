import {
  ExactFecForeignServiceIva13InputSchema,
  type ExactFecForeignServiceIva13Input,
  type ExactFecForeignServiceIva13Calculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
/** Exact arithmetic for explicitly selected ordinary taxable services only.
 * No supplier qualification, tax-liability/credit or acceptance authority. */
export function calculateExactFecForeignServiceIva13(
  source: ExactFecForeignServiceIva13Input,
): ExactFecForeignServiceIva13Calculated {
  const input = ExactFecForeignServiceIva13InputSchema.parse(source);
  assertDocumentIdentity(input, "08");
  return calculateExactOrdinaryMoney(input, "FEC");
}
