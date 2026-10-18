import { ExactNcTotalInputSchema, type ExactNcTotalInput } from "@dojocoding/hacienda-shared";
import { calculateExactNcTotal } from "../tax/exact-nc.js";
import { buildXml } from "../xml/builder.js";
import { buildExactOrdinaryFields } from "./exact-fe-builder.js";

/** Source-only ordinary full NC. Caller proves accepted immutable FE authority;
 * SDK checks exact structure, calculation, identity and reference binding only. */
export function buildExactNotaCreditoTotalXml(source: ExactNcTotalInput): string {
  const input = ExactNcTotalInputSchema.parse(source);
  const calculated = calculateExactNcTotal(input);
  const reference = input.informacionReferencia[0];
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
