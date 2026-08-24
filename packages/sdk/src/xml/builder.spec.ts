/**
 * Tests for the XML builder core module.
 */

import { describe, it, expect } from "vitest";
import { buildXml, getNamespaceUri, getSchemaFragment } from "./builder.js";

// ---------------------------------------------------------------------------
// getNamespaceUri
// ---------------------------------------------------------------------------

describe("getNamespaceUri", () => {
  it("should build namespace URI for the facturaElectronica fragment", () => {
    expect(getNamespaceUri("facturaElectronica")).toBe(
      "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica",
    );
  });

  it("should build namespace URI for the notaCreditoElectronica fragment", () => {
    expect(getNamespaceUri("notaCreditoElectronica")).toBe(
      "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica",
    );
  });

  it("should build namespace URI for the mensajeReceptor fragment", () => {
    expect(getNamespaceUri("mensajeReceptor")).toBe(
      "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeReceptor",
    );
  });
});

// ---------------------------------------------------------------------------
// getSchemaFragment
// ---------------------------------------------------------------------------

describe("getSchemaFragment", () => {
  it("should return the lowerCamelCase fragment for FacturaElectronica (v4.4)", () => {
    expect(getSchemaFragment("FacturaElectronica")).toBe("facturaElectronica");
  });

  it("should return the root name itself for unknown types", () => {
    expect(getSchemaFragment("CustomDocument")).toBe("CustomDocument");
  });

  it("should map all 7 document types + MensajeReceptor to lowerCamelCase fragments", () => {
    const expectedFragments: Record<string, string> = {
      FacturaElectronica: "facturaElectronica",
      NotaCreditoElectronica: "notaCreditoElectronica",
      NotaDebitoElectronica: "notaDebitoElectronica",
      TiqueteElectronico: "tiqueteElectronico",
      FacturaElectronicaCompra: "facturaElectronicaCompra",
      FacturaElectronicaExportacion: "facturaElectronicaExportacion",
      ReciboElectronicoPago: "reciboElectronicoPago",
      MensajeReceptor: "mensajeReceptor",
    };

    for (const [rootName, fragment] of Object.entries(expectedFragments)) {
      expect(getSchemaFragment(rootName)).toBe(fragment);
    }
  });
});

// ---------------------------------------------------------------------------
// buildXml
// ---------------------------------------------------------------------------

describe("buildXml", () => {
  it("should produce a valid XML string with declaration", () => {
    const xml = buildXml("FacturaElectronica", { Clave: "50601..." });
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
  });

  it("should include the correct lowerCamelCase namespace for FacturaElectronica", () => {
    const xml = buildXml("FacturaElectronica", { Clave: "test" });
    expect(xml).toContain(
      'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"',
    );
  });

  it("should include xsi namespace", () => {
    const xml = buildXml("FacturaElectronica", { Clave: "test" });
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  });

  it("should include xsi:schemaLocation by default", () => {
    const xml = buildXml("FacturaElectronica", { Clave: "test" });
    expect(xml).toContain("xsi:schemaLocation");
    // v4.4: schemaLocation pairs the namespace with "<RootName>_V4.4.xsd"
    expect(xml).toContain(
      'xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica FacturaElectronica_V4.4.xsd"',
    );
  });

  it("should omit xsi:schemaLocation when configured", () => {
    const xml = buildXml(
      "FacturaElectronica",
      { Clave: "test" },
      {
        includeSchemaLocation: false,
      },
    );
    expect(xml).not.toContain("xsi:schemaLocation");
  });

  it("should wrap data inside the root element", () => {
    const xml = buildXml("FacturaElectronica", {
      Clave: "50601...",
      CodigoActividad: "620100",
    });
    expect(xml).toContain("<FacturaElectronica");
    expect(xml).toContain("</FacturaElectronica>");
    expect(xml).toContain("<Clave>50601...</Clave>");
    expect(xml).toContain("<CodigoActividad>620100</CodigoActividad>");
  });

  it("should handle nested objects", () => {
    const xml = buildXml("FacturaElectronica", {
      Emisor: {
        Nombre: "Test",
        Identificacion: {
          Tipo: "02",
          Numero: "3101234567",
        },
      },
    });
    expect(xml).toContain("<Emisor>");
    expect(xml).toContain("<Nombre>Test</Nombre>");
    expect(xml).toContain("<Identificacion>");
    expect(xml).toContain("<Tipo>02</Tipo>");
    expect(xml).toContain("<Numero>3101234567</Numero>");
  });

  it("should handle arrays as repeated elements", () => {
    const xml = buildXml("FacturaElectronica", {
      MedioPago: ["01", "02"],
    });
    // fast-xml-parser renders arrays as repeated elements
    expect(xml).toContain("<MedioPago>01</MedioPago>");
    expect(xml).toContain("<MedioPago>02</MedioPago>");
  });

  it("should allow custom namespace override", () => {
    const xml = buildXml(
      "FacturaElectronica",
      { Clave: "test" },
      { namespace: "https://custom.namespace.com/v1" },
    );
    expect(xml).toContain('xmlns="https://custom.namespace.com/v1"');
  });

  it("should use correct namespace for different document types", () => {
    const xml = buildXml("NotaCreditoElectronica", { Clave: "test" });
    expect(xml).toContain(
      'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica"',
    );
    expect(xml).toContain("<NotaCreditoElectronica");
    expect(xml).toContain("</NotaCreditoElectronica>");
  });

  it("should handle numeric values", () => {
    const xml = buildXml("FacturaElectronica", {
      ResumenFactura: {
        TotalComprobante: 113000,
        TotalImpuesto: 13000.5,
      },
    });
    expect(xml).toContain("<TotalComprobante>113000</TotalComprobante>");
    expect(xml).toContain("<TotalImpuesto>13000.5</TotalImpuesto>");
  });

  it("should suppress empty/undefined nodes", () => {
    const xml = buildXml("FacturaElectronica", {
      Clave: "test",
      EmptyField: undefined,
    });
    expect(xml).not.toContain("EmptyField");
  });
});
