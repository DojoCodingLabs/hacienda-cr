/**
 * Nota de Credito Electronica XML builder.
 *
 * Transforms a typed NotaCreditoElectronica input into a Hacienda v4.4
 * compliant XML string. Credit note — references original document
 * via InformacionReferencia.
 *
 * Document type code: 03
 * Root element: NotaCreditoElectronica
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaCreditoElectronica
 */

import type { NotaCreditoElectronica } from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Nota de Credito Electronica XML string from a typed input object.
 *
 * A credit note adjusts a previous document downward. It requires
 * an InformacionReferencia array referencing the original document.
 * All computed fields (totals, taxes) must already be present.
 *
 * @param input - A fully populated NotaCreditoElectronica object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildNotaCreditoXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildNotaCreditoXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   informacionReferencia: [{ tipoDoc: "01", ... }],
 *   // ... all required fields
 * });
 * ```
 */
export function buildNotaCreditoXml(input: NotaCreditoElectronica): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("NotaCreditoElectronica", data);
}
