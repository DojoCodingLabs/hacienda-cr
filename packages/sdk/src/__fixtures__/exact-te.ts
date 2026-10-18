import { ExactTeInputSchema, type ExactTeInput } from "@dojocoding/hacienda-shared";
import { SIMPLE_TIQUETE } from "./document-fixtures.js";
/** Synthetic actual TE identity; receiver deliberately absent. */
export function exactTeFixture(): ExactTeInput {
  return ExactTeInputSchema.parse({
    caseCode: "TE-domestic-ordinary-iva13-v1",
    clave: SIMPLE_TIQUETE.clave,
    numeroConsecutivo: SIMPLE_TIQUETE.numeroConsecutivo,
    fechaEmision: SIMPLE_TIQUETE.fechaEmision,
    proveedorSistemas: SIMPLE_TIQUETE.proveedorSistemas,
    codigoActividadEmisor: "620100",
    emisor: structuredClone(SIMPLE_TIQUETE.emisor),
    condicionVenta: "01",
    detalleServicio: [
      {
        numeroLinea: 1,
        codigoCabys: "8310100000000",
        cantidad: "1",
        unidadMedida: "Sp",
        detalle: "Servicio exacto TE sintético",
        precioUnitario: "100.00001",
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
      },
    ],
    codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113.00001" }],
  });
}
