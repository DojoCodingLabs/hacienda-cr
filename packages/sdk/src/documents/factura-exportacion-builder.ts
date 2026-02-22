/**
 * Factura Electronica de Exportacion XML builder.
 *
 * Transforms a typed FacturaElectronicaExportacion input into a Hacienda v4.4
 * compliant XML string. Export invoice — typically 0% IVA with a foreign buyer.
 *
 * Document type code: 06
 * Root element: FacturaElectronicaExportacion
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaExportacion
 */

import type { FacturaElectronicaExportacion } from "@dojocoding/hacienda-shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Factura Electronica de Exportacion XML string from a typed input object.
 *
 * An export invoice is used for goods or services sold to foreign buyers.
 * Typically uses 0% IVA and may include foreign identification for the receiver.
 * All computed fields (totals, taxes) must already be present.
 *
 * @param input - A fully populated FacturaElectronicaExportacion object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildFacturaExportacionXml } from "@dojocoding/hacienda-sdk";
 *
 * const xml = buildFacturaExportacionXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   receptor: { nombre: "Foreign Corp", identificacionExtranjero: "US-123" },
 *   // ... all required fields
 * });
 * ```
 */
export function buildFacturaExportacionXml(input: FacturaElectronicaExportacion): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("FacturaElectronicaExportacion", data);
}
