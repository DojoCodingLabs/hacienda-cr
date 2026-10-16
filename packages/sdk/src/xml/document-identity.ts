import { ValidationError } from "../errors.js";
import { formatClaveDate } from "../clave/date.js";

export interface IdentityIssue {
  path: string;
  message: string;
}
export const STANDARD_DOCUMENT_CODES: Readonly<Record<string, string>> = {
  FacturaElectronica: "01",
  NotaDebitoElectronica: "02",
  NotaCreditoElectronica: "03",
  TiqueteElectronico: "04",
  FacturaElectronicaCompra: "08",
  FacturaElectronicaExportacion: "09",
  ReciboElectronicoPago: "10",
};
export interface IdentityDocument {
  clave: string;
  numeroConsecutivo: string;
  fechaEmision: string;
  emisor: { identificacion: { numero: string } };
  receptor?: { identificacion?: { numero: string } };
}

/** FEC is generated/signed by its buyer (Receptor), unlike other documents.
 * MensajeReceptor refers to the supplier's original clave and is intentionally
 * outside this standard-document validator.
 */
export function validateDocumentIdentity(
  input: IdentityDocument,
  expectedType: string,
): IdentityIssue[] {
  const errors: IdentityIssue[] = [];
  const add = (path: string, message: string) => errors.push({ path, message });
  if (!/^506\d{6}[A-Za-z0-9]{12}\d{29}$/.test(input.clave))
    add("clave", "clave must follow the 50-character Costa Rica identity layout");
  if (!/^\d{20}$/.test(input.numeroConsecutivo))
    add("numeroConsecutivo", "numeroConsecutivo must contain 20 digits");
  if (errors.length) return errors;
  const owner =
    expectedType === "08"
      ? input.receptor?.identificacion?.numero
      : input.emisor.identificacion.numero;
  if (
    !owner ||
    !/^[A-Za-z0-9]{9,12}$/.test(owner) ||
    input.clave.slice(9, 21) !== owner.padStart(12, "0")
  ) {
    add(
      "clave",
      expectedType === "08"
        ? "clave taxpayer must match the purchase invoice buyer (receptor)"
        : "clave taxpayer must match emisor.identificacion.numero",
    );
  }
  if (input.clave.slice(21, 41) !== input.numeroConsecutivo)
    add("numeroConsecutivo", "numeroConsecutivo must match the consecutive embedded in clave");
  if (input.numeroConsecutivo.slice(8, 10) !== expectedType)
    add("numeroConsecutivo", `document type must be ${expectedType}`);
  if (
    Number(input.numeroConsecutivo.slice(0, 3)) === 0 ||
    Number(input.numeroConsecutivo.slice(3, 8)) === 0 ||
    Number(input.numeroConsecutivo.slice(10)) === 0
  )
    add("numeroConsecutivo", "branch, terminal and sequence must be greater than zero");
  if (!/^[123]$/.test(input.clave.slice(41, 42))) add("clave", "clave situation must be 1, 2 or 3");
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
    input.fechaEmision,
  );
  const date = new Date(input.fechaEmision);
  const calendarValid =
    match &&
    Number(match[2]) >= 1 &&
    Number(match[2]) <= 12 &&
    Number(match[3]) >= 1 &&
    Number(match[3]) <= new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
  if (!calendarValid || Number.isNaN(date.getTime()))
    add("fechaEmision", "fechaEmision must be a valid ISO 8601 date with timezone");
  else if (input.clave.slice(3, 9) !== formatClaveDate(date))
    add("fechaEmision", "clave date must match fechaEmision in America/Costa_Rica");
  return errors;
}

export function assertDocumentIdentity(input: IdentityDocument, expectedType: string): void {
  const issues = validateDocumentIdentity(input, expectedType);
  if (issues.length) throw new ValidationError("Document identity validation failed", issues);
}
