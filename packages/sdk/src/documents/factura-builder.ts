/**
 * Factura Electronica XML builder.
 *
 * Transforms a typed FacturaElectronica input into a Hacienda v4.4
 * compliant XML string using the XML builder core.
 */

import type { FacturaElectronica } from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Factura Electronica XML string from a typed input object.
 *
 * The input must already have all computed fields (totals, taxes).
 * Use `calculateLineItemTotals` and `calculateInvoiceSummary` from
 * the tax module to compute those values before calling this function.
 *
 * @param input - A fully populated FacturaElectronica object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildFacturaXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildFacturaXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   // ... all required fields
 * });
 * ```
 */
export function buildFacturaXml(input: FacturaElectronica): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("FacturaElectronica", data);
}
