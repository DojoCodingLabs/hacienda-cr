import type { ExactNcPartialInput } from "@dojocoding/hacienda-shared";
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
