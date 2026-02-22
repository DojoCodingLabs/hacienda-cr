/**
 * Tiquete Electronico XML builder.
 *
 * Transforms a typed TiqueteElectronico input into a Hacienda v4.4
 * compliant XML string. Simplified receipt — receiver is optional.
 *
 * Document type code: 04
 * Root element: TiqueteElectronico
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico
 */

import type { TiqueteElectronico } from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Tiquete Electronico XML string from a typed input object.
 *
 * The Tiquete Electronico is a simplified receipt that does not require
 * receiver identification. All computed fields (totals, taxes) must
 * already be present in the input.
 *
 * @param input - A fully populated TiqueteElectronico object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildTiqueteXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildTiqueteXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   // ... receptor is optional
 * });
 * ```
 */
export function buildTiqueteXml(input: TiqueteElectronico): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("TiqueteElectronico", data);
}
