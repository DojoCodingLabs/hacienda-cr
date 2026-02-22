/**
 * Factura Electronica de Compra XML builder.
 *
 * Transforms a typed FacturaElectronicaCompra input into a Hacienda v4.4
 * compliant XML string. Purchase invoice (reverse charge) — issued by
 * the buyer when the supplier is not registered.
 *
 * Document type code: 05
 * Root element: FacturaElectronicaCompra
 * Namespace: https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaCompra
 */

import type { FacturaElectronicaCompra } from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";
import { buildStandardDocumentBody } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Factura Electronica de Compra XML string from a typed input object.
 *
 * A purchase invoice is issued by the buyer in reverse-charge scenarios.
 * All computed fields (totals, taxes) must already be present.
 *
 * @param input - A fully populated FacturaElectronicaCompra object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildFacturaCompraXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildFacturaCompraXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   // ... all required fields
 * });
 * ```
 */
export function buildFacturaCompraXml(input: FacturaElectronicaCompra): string {
  const data = buildStandardDocumentBody(input);
  return buildXml("FacturaElectronicaCompra", data);
}
