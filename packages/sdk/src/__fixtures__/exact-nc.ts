import type { ExactNcTotalInput } from "@dojocoding/hacienda-shared";
import { SIMPLE_INVOICE } from "./invoices.js";
import { fixtureClave } from "./identity.js";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing NC fixture fact");
  return value;
}

/** Synthetic full NC input, never a claim of accepted source authority. */
export function exactNcFixture(): ExactNcTotalInput {
  const fechaEmision = "2026-10-18T12:00:00-06:00";
  const clave = fixtureClave(fechaEmision, "03", 2);
  return {
    caseCode: "NC-domestic-ordinary-fe-total-iva13-v1",
    clave,
    numeroConsecutivo: clave.slice(21, 41),
    fechaEmision,
    original: {
      caseCode: "FE-domestic-ordinary-iva13-v1",
      clave: SIMPLE_INVOICE.clave,
      numeroConsecutivo: SIMPLE_INVOICE.numeroConsecutivo,
      fechaEmision: SIMPLE_INVOICE.fechaEmision,
      proveedorSistemas: SIMPLE_INVOICE.proveedorSistemas,
      codigoActividadEmisor: required(SIMPLE_INVOICE.codigoActividadEmisor),
      emisor: structuredClone(SIMPLE_INVOICE.emisor),
      receptor: {
        ...structuredClone(SIMPLE_INVOICE.receptor),
        identificacion: structuredClone(required(SIMPLE_INVOICE.receptor.identificacion)),
      },
      condicionVenta: "01",
      detalleServicio: [
        {
          numeroLinea: 1,
          codigoCabys: "8310100000000",
          cantidad: "1",
          unidadMedida: "Sp",
          detalle: "Servicio sintético & anulación",
          precioUnitario: "100",
          esServicio: true,
          impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
        },
      ],
      codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
    },
    informacionReferencia: [
      {
        tipoDoc: "01",
        numero: SIMPLE_INVOICE.clave,
        fechaEmision: SIMPLE_INVOICE.fechaEmision,
        codigo: "01",
        razon: "Anulación total solicitada",
      },
    ],
  };
}
