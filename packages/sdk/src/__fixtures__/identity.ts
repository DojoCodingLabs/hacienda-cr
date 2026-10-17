import { buildClave } from "../clave/build-clave.js";
import { Situation, type DocumentType } from "../clave/types.js";

/** Deterministic synthetic document identity; never production data. */
export function fixtureClave(
  date: string,
  documentType: string,
  sequence = 1,
  taxpayerId = "3101234567",
): string {
  return buildClave({
    date: new Date(date),
    taxpayerId,
    branch: "001",
    pos: "00001",
    documentType: documentType as DocumentType,
    sequence,
    situation: Situation.NORMAL,
    securityCode: "99999999",
  });
}
