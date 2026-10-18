import {
  ExactFecUsedPersonalGoodsNonSubjectInputSchema,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
} from "@dojocoding/hacienda-shared";
import { exactFecFixture } from "./exact-fec.js";
/** Actual synthetic roles, not evidence that a real seller/transaction qualifies. */
export function exactFecUsedPersonalGoodsNonSubjectFixture(): ExactFecUsedPersonalGoodsNonSubjectInput {
  const base = exactFecFixture();
  const source = base.detalleServicio[0];
  if (!source) throw Error("Missing fixture line");
  return ExactFecUsedPersonalGoodsNonSubjectInputSchema.parse({
    ...base,
    caseCode: "FEC-used-personal-goods-non-subject-v1",
    emisor: {
      nombre: "Persona vendedora sintética",
      identificacion: { tipo: "06", numero: "PERSONA00001" },
    },
    condicionVenta: "13",
    detalleServicio: [
      {
        ...source,
        codigoCabys: "4321000000000",
        esServicio: false,
        unidadMedida: "Unid",
        detalle: "Televisor personal usado sintético",
        impuesto: [{ codigo: "01", codigoTarifaIVA: "11", tarifa: "0" }],
      },
    ],
    medioPago: [{ tipoMedioPago: "04", totalMedioPago: "100" }],
  });
}
