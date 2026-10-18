import { ExactNcPartialInputSchema, type ExactNcPartialInput } from "@dojocoding/hacienda-shared";
import { calculateExactNcPartial } from "../tax/exact-nc-partial.js";
import { buildXml } from "../xml/builder.js";
import { buildExactOrdinaryFields } from "./exact-fe-builder.js";
/** Source-only partial NC03; immutable original headers, independently calculated credit. */
export function buildExactNotaCreditoPartialXml(source: ExactNcPartialInput): string {
  const input = ExactNcPartialInputSchema.parse(source),
    calculated = calculateExactNcPartial(input),
    reference = input.informacionReferencia[0];
  return buildXml("NotaCreditoElectronica", {
    ...buildExactOrdinaryFields(
      {
        ...input.original,
        clave: input.clave,
        numeroConsecutivo: input.numeroConsecutivo,
        fechaEmision: input.fechaEmision,
      },
      calculated,
    ),
    InformacionReferencia: {
      TipoDocIR: reference.tipoDoc,
      Numero: reference.numero,
      FechaEmisionIR: reference.fechaEmision,
      Codigo: reference.codigo,
      Razon: reference.razon,
    },
  });
}
