import {
  ExactNcPartialInputSchema,
  type ExactNcPartialInput,
  type ExactNcPartialCalculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactFe } from "./exact-fe.js";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
/** Positive partial credit magnitudes only. Caller independently proves original
 * acceptance/authority and trusted actual issuance-time reference-age eligibility.
 * No hidden clock, reference-age calendar, cumulative balance or legal verdict. */
export function calculateExactNcPartial(source: ExactNcPartialInput): ExactNcPartialCalculated {
  const input = ExactNcPartialInputSchema.parse(source);
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
  calculateExactFe(input.original); // Validate original ordinary math; do not credit it again.
  return calculateExactOrdinaryMoney(
    {
      detalleServicio: input.adjustments.map((a) => a.line),
      codigoTipoMoneda: input.original.codigoTipoMoneda,
      medioPago: input.medioPago,
    },
    "NC",
  );
}
