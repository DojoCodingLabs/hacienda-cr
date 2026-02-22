/**
 * Mensaje Receptor XML builder.
 *
 * Transforms a typed MensajeReceptor input into a Hacienda v4.4
 * compliant XML string. Receiver acknowledgment message.
 *
 * Message types:
 * - 05: Aceptacion Total (Confirmacion de Aceptacion del Comprobante)
 * - 06: Aceptacion Parcial
 * - 07: Rechazo del Comprobante
 *
 * Root element: MensajeReceptor
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/MensajeReceptor
 */

import type { MensajeReceptor } from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Mensaje Receptor XML string from a typed input object.
 *
 * A receiver acknowledgment message is sent by the receiver of an
 * electronic document to indicate acceptance (total or partial) or
 * rejection of the document.
 *
 * Unlike other document types, MensajeReceptor has a unique structure
 * that does not follow the standard document body pattern.
 *
 * @param input - A fully populated MensajeReceptor object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildMensajeReceptorXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildMensajeReceptorXml({
 *   clave: "50601...",
 *   numeroCedulaEmisor: "3101234567",
 *   fechaEmisionDoc: "2025-07-27T10:30:00-06:00",
 *   mensaje: "1",  // 1=accepted, 2=partial, 3=rejected
 *   totalFactura: 113000,
 *   numeroCedulaReceptor: "3109876543",
 *   numeroConsecutivoReceptor: "00100001050000000001",
 * });
 * ```
 */
export function buildMensajeReceptorXml(input: MensajeReceptor): string {
  const data: Record<string, unknown> = {
    Clave: input.clave,
    NumeroCedulaEmisor: input.numeroCedulaEmisor,
    FechaEmisionDoc: input.fechaEmisionDoc,
    Mensaje: input.mensaje,
  };

  if (input.detalleMensaje) {
    data.DetalleMensaje = input.detalleMensaje;
  }

  if (input.montoTotalImpuesto !== undefined) {
    data.MontoTotalImpuesto = input.montoTotalImpuesto;
  }

  if (input.codigoActividad) {
    data.CodigoActividad = input.codigoActividad;
  }

  if (input.condicionImpuesto) {
    data.CondicionImpuesto = input.condicionImpuesto;
  }

  data.TotalFactura = input.totalFactura;
  data.NumeroCedulaReceptor = input.numeroCedulaReceptor;
  data.NumeroConsecutivoReceptor = input.numeroConsecutivoReceptor;

  return buildXml("MensajeReceptor", data);
}
