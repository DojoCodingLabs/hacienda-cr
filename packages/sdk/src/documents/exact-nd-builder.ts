import { ExactNdInputSchema, type ExactNdInput } from "@dojocoding/hacienda-shared";
import { calculateExactNd } from "../tax/exact-nd.js";
import { buildXml } from "../xml/builder.js";
import { buildExactOrdinaryFields } from "./exact-fe-builder.js";
/** Source-only ND02; immutable original headers, independently calculated delta. */
export function buildExactNotaDebitoXml(source: ExactNdInput): string {
  const input = ExactNdInputSchema.parse(source),
    calculated = calculateExactNd(input),
    reference = input.informacionReferencia[0];
  return buildXml("NotaDebitoElectronica", {
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
