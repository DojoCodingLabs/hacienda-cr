import type { ExactNdInput } from "@dojocoding/hacienda-shared";
import { exactNcFixture } from "./exact-nc.js";
import { fixtureClave } from "./identity.js";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing synthetic original line");
  return value;
}
/** New synthetic incremental amounts, not a copy of the original's total. */
export function exactNdFixture(): ExactNdInput {
  const original = exactNcFixture().original,
    fechaEmision = "2026-10-18T12:00:00-06:00",
    clave = fixtureClave(fechaEmision, "02", 3);
  return {
    caseCode: "ND-domestic-ordinary-fe-increment-iva13-v1",
    original,
    clave,
    numeroConsecutivo: clave.slice(21, 41),
    fechaEmision,
    adjustments: [
      {
        originalLineNumber: 1,
        line: {
          ...structuredClone(required(original.detalleServicio[0])),
          precioUnitario: "10.00001",
        },
      },
    ],
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "11.30001" }],
    informacionReferencia: [
      {
        tipoDoc: "01",
        numero: original.clave,
        fechaEmision: original.fechaEmision,
        codigo: "02",
        razon: "Incremento de monto solicitado",
      },
    ],
  };
}
