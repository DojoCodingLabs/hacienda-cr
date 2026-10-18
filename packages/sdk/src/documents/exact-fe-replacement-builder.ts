import {
  ExactFeReplacementInputSchema,
  type ExactFeReplacementInput,
} from "@dojocoding/hacienda-shared";
import { calculateExactFeReplacement } from "../tax/exact-fe-replacement.js";
import { buildExactOrdinaryFields } from "./exact-fe-builder.js";
import { buildXml } from "../xml/builder.js";
/** New FE01 with rejected-document10/replacement16; no old signing/resubmission. */
export function buildExactFacturaReplacementXml(source: ExactFeReplacementInput): string {
  const input = ExactFeReplacementInputSchema.parse(source),
    reference = input.informacionReferencia[0];
  return buildXml("FacturaElectronica", {
    ...buildExactOrdinaryFields(input.replacement, calculateExactFeReplacement(input)),
    InformacionReferencia: {
      TipoDocIR: reference.tipoDoc,
      Numero: reference.numero,
      FechaEmisionIR: reference.fechaEmision,
      Codigo: reference.codigo,
      Razon: reference.razon,
    },
  });
}
