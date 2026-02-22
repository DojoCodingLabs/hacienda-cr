/**
 * Recibo Electronico de Pago XML builder.
 *
 * Transforms a typed ReciboElectronicoPago input into a Hacienda v4.4
 * compliant XML string. Payment receipt — new in v4.4.
 *
 * Document type code: 07 (clave code: 10)
 * Root element: ReciboElectronicoPago
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/ReciboElectronicoPago
 */

import type { ReciboElectronicoPago } from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Recibo Electronico de Pago XML string from a typed input object.
 *
 * A payment receipt documents a payment received. This document type
 * was introduced in Hacienda v4.4. All computed fields (totals, taxes)
 * must already be present.
 *
 * @param input - A fully populated ReciboElectronicoPago object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildReciboPagoXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildReciboPagoXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   // ... all required fields
 * });
 * ```
 */
export function buildReciboPagoXml(input: ReciboElectronicoPago): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("ReciboElectronicoPago", data);
}
