/**
 * XML builder core — wraps fast-xml-parser's XMLBuilder
 * with Hacienda v4.4 configuration.
 *
 * Handles namespace injection, XML declaration, attribute prefixing,
 * and CDATA support as required by the Hacienda specification.
 */

import { XMLBuilder } from "fast-xml-parser";

/**
 * Hacienda v4.4 XML namespace base URL.
 * Each document type appends its schema name (e.g., "FacturaElectronica").
 */
const HACIENDA_NAMESPACE_BASE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4";

/**
 * XML Schema Instance namespace.
 */
const XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";

/**
 * Map from document root element name to the Hacienda schema fragment.
 * Used to build the full namespace URI.
 */
const SCHEMA_FRAGMENTS: Record<string, string> = {
  FacturaElectronica: "FacturaElectronica",
  NotaCreditoElectronica: "NotaCreditoElectronica",
  NotaDebitoElectronica: "NotaDebitoElectronica",
  TiqueteElectronico: "TiqueteElectronico",
  FacturaElectronicaCompra: "FacturaElectronicaCompra",
  FacturaElectronicaExportacion: "FacturaElectronicaExportacion",
  ReciboElectronicoPago: "ReciboElectronicoPago",
  MensajeReceptor: "MensajeReceptor",
};

/**
 * Build the full Hacienda namespace URI for a given document type.
 *
 * @param schemaName - The schema name fragment (e.g., "FacturaElectronica").
 * @returns The full namespace URI.
 */
export function getNamespaceUri(schemaName: string): string {
  return `${HACIENDA_NAMESPACE_BASE}/${schemaName}`;
}

/**
 * Get the Hacienda schema fragment for a root element name.
 * Falls back to the root element name if not found in the map.
 *
 * @param rootName - The XML root element name.
 * @returns The schema fragment string.
 */
export function getSchemaFragment(rootName: string): string {
  return SCHEMA_FRAGMENTS[rootName] ?? rootName;
}

/**
 * Configuration options for the XML builder.
 */
export interface BuildXmlOptions {
  /**
   * Override the namespace URI. If not provided, it is derived
   * from the root element name using the Hacienda namespace pattern.
   */
  namespace?: string;

  /**
   * Include xsi:schemaLocation attribute. Defaults to true.
   */
  includeSchemaLocation?: boolean;
}

/**
 * Create an XMLBuilder instance configured for Hacienda v4.4 compliance.
 *
 * Configuration:
 * - Attribute prefix: `@_` (fast-xml-parser convention)
 * - CDATA tag: `#cdata` for fields requiring CDATA wrapping
 * - Suppresses empty tags (no `<Foo></Foo>` for undefined values)
 * - Formats output with indentation for readability
 */
function createBuilder(): XMLBuilder {
  return new XMLBuilder({
    attributeNamePrefix: "@_",
    cdataPropName: "#cdata",
    ignoreAttributes: false,
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    format: true,
    indentBy: "  ",
  });
}

/**
 * Build a Hacienda-compliant XML string from a data object.
 *
 * Wraps the data in the given root element with proper xmlns and
 * xsi namespace declarations, prepended by an XML declaration.
 *
 * @param rootName - The XML root element name (e.g., "FacturaElectronica").
 * @param data - The data object representing the XML body. Keys map to
 *   XML element names; use `@_attrName` for attributes.
 * @param options - Optional configuration overrides.
 * @returns A well-formed XML string with declaration and namespace.
 *
 * @example
 * ```ts
 * const xml = buildXml("FacturaElectronica", {
 *   Clave: "50601...",
 *   CodigoActividad: "620100",
 *   // ...
 * });
 * ```
 */
export function buildXml(
  rootName: string,
  data: Record<string, unknown>,
  options?: BuildXmlOptions,
): string {
  const schemaFragment = getSchemaFragment(rootName);
  const namespace = options?.namespace ?? getNamespaceUri(schemaFragment);
  const includeSchemaLocation = options?.includeSchemaLocation ?? true;

  // Construct the root element with namespace attributes
  const rootAttributes: Record<string, string> = {
    "@_xmlns": namespace,
    "@_xmlns:xsi": XSI_NAMESPACE,
  };

  if (includeSchemaLocation) {
    rootAttributes["@_xsi:schemaLocation"] = `${namespace} ${schemaFragment}_V.4.4.xsd`;
  }

  // Wrap data inside root element with attributes
  const xmlObject = {
    "?xml": {
      "@_version": "1.0",
      "@_encoding": "utf-8",
    },
    [rootName]: {
      ...rootAttributes,
      ...data,
    },
  };

  const builder = createBuilder();
  const rawXml = builder.build(xmlObject) as string;

  return rawXml;
}
