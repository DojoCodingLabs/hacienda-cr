import {
  ExactRecipientMessageInputSchema,
  type ExactRecipientMessageInput,
} from "@dojocoding/hacienda-shared";
import { ValidationError } from "../errors.js";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { buildXml } from "../xml/builder.js";
import { calculateExactFe } from "../tax/exact-fe.js";
import { buildMensajeReceptorFields } from "./mensaje-receptor-builder.js";
function money(text: string): bigint {
  const [whole = "", fraction = ""] = text.split(".");
  return BigInt(whole) * 100000n + BigInt(fraction.padEnd(5, "0"));
}
/** Binds original FE facts and explicit reviewed tax decisions. Never derives
 * entitlement, allocates a receiver sequence, signs, submits or proves acceptance. */
export function buildExactMensajeReceptorXml(source: ExactRecipientMessageInput): string {
  const input = ExactRecipientMessageInputSchema.parse(source);
  assertDocumentIdentity(input.original, "01");
  const original = calculateExactFe(input.original).resumenFactura;
  const details: { path: string; message: string }[] = [];
  if (
    input.iva?.montoTotalImpuestoAcreditar !== undefined &&
    money(input.iva.montoTotalImpuestoAcreditar) > money(original.totalImpuesto)
  )
    details.push({
      path: "iva.montoTotalImpuestoAcreditar",
      message: "Declared credit exceeds original source tax",
    });
  if (
    input.iva?.montoTotalDeGastoAplicable !== undefined &&
    money(input.iva.montoTotalDeGastoAplicable) > money(original.totalComprobante)
  )
    details.push({
      path: "iva.montoTotalDeGastoAplicable",
      message: "Declared expense exceeds original source total",
    });
  if (
    input.iva?.condicionImpuesto === "04" &&
    input.iva.montoTotalImpuestoAcreditar !== undefined &&
    money(input.iva.montoTotalImpuestoAcreditar) !== 0n
  )
    details.push({
      path: "iva.montoTotalImpuestoAcreditar",
      message: "No-credit condition cannot declare a positive credit",
    });
  // Annex note18/footnote47 defines01 as the complete paid IVA used as credit.
  // This only checks a supplied declaration; it does not confer entitlement.
  if (
    input.iva?.condicionImpuesto === "01" &&
    input.iva.montoTotalImpuestoAcreditar !== undefined &&
    money(input.iva.montoTotalImpuestoAcreditar) !== money(original.totalImpuesto)
  )
    details.push({
      path: "iva.montoTotalImpuestoAcreditar",
      message: "Full-credit condition must preserve the complete source tax when supplied",
    });
  if (details.length)
    throw new ValidationError("Recipient source allocation validation failed", details);
  return buildXml(
    "MensajeReceptor",
    buildMensajeReceptorFields({
      clave: input.original.clave,
      numeroCedulaEmisor: input.original.emisor.identificacion.numero,
      fechaEmisionDoc: input.fechaEmisionDoc,
      mensaje: input.mensaje,
      ...(input.detalleMensaje !== undefined ? { detalleMensaje: input.detalleMensaje } : {}),
      montoTotalImpuesto: original.totalImpuesto,
      ...(input.iva ?? {}),
      totalFactura: original.totalComprobante,
      numeroCedulaReceptor: input.original.receptor.identificacion.numero,
      numeroConsecutivoReceptor: input.numeroConsecutivoReceptor,
    }),
  );
}
