import {
  ExactFeReplacementInputSchema,
  type ExactNcPartialInput,
  type ExactFeReplacementInput,
} from "@dojocoding/hacienda-shared";
import { exactNdFixture } from "./exact-nd.js";
import { fixtureClave } from "./identity.js";
export function exactNcPartialFixture(): ExactNcPartialInput {
  const source = exactNdFixture(),
    clave = fixtureClave(source.fechaEmision, "03", 5);
  return {
    ...source,
    caseCode: "NC-domestic-ordinary-fe-partial-iva13-v1",
    clave,
    numeroConsecutivo: clave.slice(21, 41),
  };
}
export function exactFeReplacementFixture(): ExactFeReplacementInput {
  const original = exactNdFixture().original;
  const rejected = { clave: original.clave, fechaEmision: original.fechaEmision };
  const fechaEmision = "2026-10-18T12:00:00-06:00",
    clave = fixtureClave(fechaEmision, "01", 6);
  return ExactFeReplacementInputSchema.parse({
    caseCode: "FE-domestic-ordinary-rejected-replacement-iva13-v1",
    replacement: { ...original, clave, numeroConsecutivo: clave.slice(21, 41), fechaEmision },
    rejected,
    informacionReferencia: [
      {
        tipoDoc: "10",
        numero: rejected.clave,
        fechaEmision: rejected.fechaEmision,
        codigo: "16",
        razon: "Sustitución del comprobante rechazado",
      },
    ],
  });
}
