/**
 * Nota de Debito Electronica XML builder.
 *
 * Transforms a typed NotaDebitoElectronica input into a Hacienda v4.4
 * compliant XML string. Debit note — adjusts upward, includes
 * InformacionReferencia.
 *
 * Document type code: 02
 * Root element: NotaDebitoElectronica
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaDebitoElectronica
 */

import type { NotaDebitoElectronica } from "@dojocoding/hacienda-shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Nota de Debito Electronica XML string from a typed input object.
 *
 * A debit note adjusts a previous document upward. It requires
 * an InformacionReferencia array referencing the original document.
 * All computed fields (totals, taxes) must already be present.
 *
 * @param input - A fully populated NotaDebitoElectronica object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildNotaDebitoXml } from "@dojocoding/hacienda-sdk";
 *
 * const xml = buildNotaDebitoXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   informacionReferencia: [{ tipoDoc: "01", ... }],
 *   // ... all required fields
 * });
 * ```
 */
export function buildNotaDebitoXml(input: NotaDebitoElectronica): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("NotaDebitoElectronica", data);
}
