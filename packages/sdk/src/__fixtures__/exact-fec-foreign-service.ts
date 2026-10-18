import {
  ExactFecForeignServiceIva13InputSchema,
  type ExactFecForeignServiceIva13Input,
} from "@dojocoding/hacienda-shared";
import { exactFecFixture } from "./exact-fec.js";
/** Synthetic actual distinct party roles; no legal supplier/tax eligibility claim. */
export function exactFecForeignServiceIva13Fixture(): ExactFecForeignServiceIva13Input {
  const original = exactFecFixture();
  return ExactFecForeignServiceIva13InputSchema.parse({
    ...original,
    caseCode: "FEC-foreign-service-ordinary-iva13-v1",
    emisor: {
      nombre: "Synthetic Foreign Service Supplier",
      identificacion: { tipo: "05", numero: "FOREIGN12345" },
      otrasSenasExtranjero: "Actual synthetic foreign supplier address",
      correoElectronico: "supplier@example.test",
    },
    informacionReferencia: [
      {
        tipoDoc: "16",
        numero: "FOREIGN-SERVICE-001",
        fechaEmision: "2026-10-18T11:00:00-06:00",
        codigo: "11",
        razon: "Actual synthetic foreign service source",
      },
    ],
  });
}
