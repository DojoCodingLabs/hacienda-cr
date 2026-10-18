import {
  ExactNdInputSchema,
  type ExactNdInput,
  type ExactNdCalculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactFe } from "./exact-fe.js";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
/** Positive incremental magnitudes only. Caller independently proves original
 * acceptance/authority and trusted actual issuance-time reference-age eligibility.
 * No hidden clock, reference-age calendar, cumulative balance or legal verdict. */
export function calculateExactNd(source: ExactNdInput): ExactNdCalculated {
  const input = ExactNdInputSchema.parse(source);
  assertDocumentIdentity(input.original, "01");
  assertDocumentIdentity(
    {
      ...input.original,
      clave: input.clave,
      numeroConsecutivo: input.numeroConsecutivo,
      fechaEmision: input.fechaEmision,
    },
    "02",
  );
  calculateExactFe(input.original); // Validate original ordinary math; do not debit it again.
  return calculateExactOrdinaryMoney(
    {
      detalleServicio: input.adjustments.map((a) => a.line),
      codigoTipoMoneda: input.original.codigoTipoMoneda,
      medioPago: input.medioPago,
    },
    "ND",
  );
}
