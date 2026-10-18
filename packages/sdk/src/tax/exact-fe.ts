/** Additive exact ordinary-FE arithmetic. Monetary values never cross Number.
 * Round nonnegative products HALF_UP to5 decimal places at gross, percentage
 * discount and per-line tax boundaries; aggregate already-quantized integers. */
import {
  ExactFeInputSchema,
  RetainedExactFeInputSchema,
  type RetainedExactFeInput,
  type ExactFeInput,
  type ExactFeCalculated,
} from "@dojocoding/hacienda-shared";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
export function calculateExactFe(source: ExactFeInput): ExactFeCalculated {
  return calculateExactOrdinaryMoney(ExactFeInputSchema.parse(source));
}
/** Read-only historical arithmetic for independently bound retained 0.6–0.8 FE.
 * Not issuance validation, source authenticity or a signing/transport grant.
 * Deliberately has no corresponding retained XML builder. */
export function calculateRetainedExactFe(source: RetainedExactFeInput): ExactFeCalculated {
  return calculateExactOrdinaryMoney(RetainedExactFeInputSchema.parse(source));
}
