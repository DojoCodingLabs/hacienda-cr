import { ExactFecInputSchema, type ExactFecInput } from "@dojocoding/hacienda-shared";
import { exactNcFixture } from "./exact-nc.js";
import { fixtureClave } from "./identity.js";
/** Actual distinct synthetic roles; no assertion of supplier qualification. */
export function exactFecFixture(): ExactFecInput {
  const original = exactNcFixture().original;
  const fechaEmision = "2026-10-18T12:00:00-06:00";
  const clave = fixtureClave(fechaEmision, "08", 4, original.receptor.identificacion.numero);
  return ExactFecInputSchema.parse({
    caseCode: "FEC-domestic-ordinary-iva13-v1",
    clave,
    numeroConsecutivo: clave.slice(21, 41),
    fechaEmision,
    proveedorSistemas: original.proveedorSistemas,
    codigoActividadReceptor: "620100",
    emisor: original.emisor,
    receptor: {
      ...original.receptor,
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        otrasSenas: "Dirección sintética de la compradora",
      },
    },
    condicionVenta: "01",
    detalleServicio: original.detalleServicio,
    codigoTipoMoneda: original.codigoTipoMoneda,
    medioPago: original.medioPago,
    informacionReferencia: [
      {
        tipoDoc: "99",
        tipoDocOtros: "Recibo del proveedor",
        numero: "RECIBO-SINTETICO-0001",
        fechaEmision: "2026-10-18T11:00:00-06:00",
        codigo: "04",
        razon: "Respaldo real de la compra sintética",
      },
    ],
  });
}
