/**
 * Integration tests for all document type builders.
 *
 * Verifies XML structure, namespaces, and key elements for each
 * of the 7 document types + Mensaje Receptor.
 */

import { describe, it, expect } from "vitest";
import { buildFacturaXml } from "./factura-builder.js";
import { buildTiqueteXml } from "./tiquete-builder.js";
import { buildNotaCreditoXml } from "./nota-credito-builder.js";
import { buildNotaDebitoXml } from "./nota-debito-builder.js";
import { buildFacturaCompraXml } from "./factura-compra-builder.js";
import { buildFacturaExportacionXml } from "./factura-exportacion-builder.js";
import { buildReciboPagoXml } from "./recibo-pago-builder.js";
import { buildMensajeReceptorXml } from "./mensaje-receptor-builder.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import {
  SIMPLE_TIQUETE,
  TIQUETE_WITH_RECEPTOR,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
  MENSAJE_ACEPTACION_TOTAL,
  MENSAJE_ACEPTACION_PARCIAL,
  MENSAJE_RECHAZO,
  MENSAJE_MINIMAL,
} from "../__fixtures__/document-fixtures.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DocumentBuilderTestCase {
  name: string;
  rootElement: string;
  namespace: string;
  schemaFile: string;
  buildXml: () => string;
  hasClave: string;
}

const STANDARD_DOCUMENT_CASES: DocumentBuilderTestCase[] = [
  {
    name: "Factura Electronica",
    rootElement: "FacturaElectronica",
    namespace: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronica",
    schemaFile: "FacturaElectronica_V.4.4.xsd",
    buildXml: () => buildFacturaXml(SIMPLE_INVOICE),
    hasClave: SIMPLE_INVOICE.clave,
  },
  {
    name: "Tiquete Electronico",
    rootElement: "TiqueteElectronico",
    namespace: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/TiqueteElectronico",
    schemaFile: "TiqueteElectronico_V.4.4.xsd",
    buildXml: () => buildTiqueteXml(SIMPLE_TIQUETE),
    hasClave: SIMPLE_TIQUETE.clave,
  },
  {
    name: "Nota de Credito Electronica",
    rootElement: "NotaCreditoElectronica",
    namespace: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaCreditoElectronica",
    schemaFile: "NotaCreditoElectronica_V.4.4.xsd",
    buildXml: () => buildNotaCreditoXml(SIMPLE_NOTA_CREDITO),
    hasClave: SIMPLE_NOTA_CREDITO.clave,
  },
  {
    name: "Nota de Debito Electronica",
    rootElement: "NotaDebitoElectronica",
    namespace: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaDebitoElectronica",
    schemaFile: "NotaDebitoElectronica_V.4.4.xsd",
    buildXml: () => buildNotaDebitoXml(SIMPLE_NOTA_DEBITO),
    hasClave: SIMPLE_NOTA_DEBITO.clave,
  },
  {
    name: "Factura Electronica de Compra",
    rootElement: "FacturaElectronicaCompra",
    namespace:
      "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaCompra",
    schemaFile: "FacturaElectronicaCompra_V.4.4.xsd",
    buildXml: () => buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA),
    hasClave: SIMPLE_FACTURA_COMPRA.clave,
  },
  {
    name: "Factura Electronica de Exportacion",
    rootElement: "FacturaElectronicaExportacion",
    namespace:
      "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaExportacion",
    schemaFile: "FacturaElectronicaExportacion_V.4.4.xsd",
    buildXml: () => buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION),
    hasClave: SIMPLE_FACTURA_EXPORTACION.clave,
  },
  {
    name: "Recibo Electronico de Pago",
    rootElement: "ReciboElectronicoPago",
    namespace: "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/ReciboElectronicoPago",
    schemaFile: "ReciboElectronicoPago_V.4.4.xsd",
    buildXml: () => buildReciboPagoXml(SIMPLE_RECIBO_PAGO),
    hasClave: SIMPLE_RECIBO_PAGO.clave,
  },
];

// ---------------------------------------------------------------------------
// Standard document type tests
// ---------------------------------------------------------------------------

describe("All document type builders — XML structure verification", () => {
  describe.each(STANDARD_DOCUMENT_CASES)(
    "$name",
    ({ rootElement, namespace, schemaFile, buildXml: build, hasClave }) => {
      it("should produce XML with declaration", () => {
        const xml = build();
        expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      });

      it(`should have ${rootElement} as root element`, () => {
        const xml = build();
        expect(xml).toContain(`<${rootElement}`);
        expect(xml).toContain(`</${rootElement}>`);
      });

      it("should include correct namespace", () => {
        const xml = build();
        expect(xml).toContain(`xmlns="${namespace}"`);
      });

      it("should include xsi namespace", () => {
        const xml = build();
        expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      });

      it("should include schemaLocation", () => {
        const xml = build();
        expect(xml).toContain(schemaFile);
      });

      it("should include Clave element", () => {
        const xml = build();
        expect(xml).toContain(`<Clave>${hasClave}</Clave>`);
      });

      it("should include Emisor element", () => {
        const xml = build();
        expect(xml).toContain("<Emisor>");
      });

      it("should include DetalleServicio element", () => {
        const xml = build();
        expect(xml).toContain("<DetalleServicio>");
      });

      it("should include ResumenFactura element", () => {
        const xml = build();
        expect(xml).toContain("<ResumenFactura>");
      });
    },
  );
});

// ---------------------------------------------------------------------------
// Mensaje Receptor tests
// ---------------------------------------------------------------------------

describe("Mensaje Receptor builder — XML structure verification", () => {
  it("should produce XML with declaration", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
  });

  it("should have MensajeReceptor as root element", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain("<MensajeReceptor");
    expect(xml).toContain("</MensajeReceptor>");
  });

  it("should include correct namespace", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain(
      'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/MensajeReceptor"',
    );
  });

  it("should NOT include DetalleServicio (not a transactional document)", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).not.toContain("<DetalleServicio>");
  });

  it("should NOT include Emisor (uses NumeroCedulaEmisor instead)", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).not.toContain("<Emisor>");
    expect(xml).toContain("<NumeroCedulaEmisor>");
  });

  it("should include all required Mensaje Receptor fields", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain("<Clave>");
    expect(xml).toContain("<NumeroCedulaEmisor>");
    expect(xml).toContain("<FechaEmisionDoc>");
    expect(xml).toContain("<Mensaje>");
    expect(xml).toContain("<TotalFactura>");
    expect(xml).toContain("<NumeroCedulaReceptor>");
    expect(xml).toContain("<NumeroConsecutivoReceptor>");
  });
});

// ---------------------------------------------------------------------------
// Cross-document type uniqueness tests
// ---------------------------------------------------------------------------

describe("Cross-document type verification", () => {
  it("each document type should use a different root element", () => {
    const rootElements = new Set(STANDARD_DOCUMENT_CASES.map((c) => c.rootElement));
    expect(rootElements.size).toBe(STANDARD_DOCUMENT_CASES.length);
  });

  it("each document type should use a different namespace", () => {
    const namespaces = new Set(STANDARD_DOCUMENT_CASES.map((c) => c.namespace));
    expect(namespaces.size).toBe(STANDARD_DOCUMENT_CASES.length);
  });

  it("Nota de Credito should include InformacionReferencia", () => {
    const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
    expect(xml).toContain("<InformacionReferencia>");
  });

  it("Nota de Debito should include InformacionReferencia", () => {
    const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
    expect(xml).toContain("<InformacionReferencia>");
  });

  it("Tiquete without receiver should not include Receptor", () => {
    const xml = buildTiqueteXml(SIMPLE_TIQUETE);
    expect(xml).not.toContain("<Receptor>");
  });

  it("Tiquete with receiver should include Receptor", () => {
    const xml = buildTiqueteXml(TIQUETE_WITH_RECEPTOR);
    expect(xml).toContain("<Receptor>");
  });

  it("Export invoice should include IdentificacionExtranjero", () => {
    const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
    expect(xml).toContain("<IdentificacionExtranjero>");
  });

  it("Export invoice should include CodigoTipoMoneda", () => {
    const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
    expect(xml).toContain("<CodigoTipoMoneda>");
    expect(xml).toContain("<CodigoMoneda>USD</CodigoMoneda>");
  });

  it("all three Mensaje types should produce valid XML", () => {
    for (const fixture of [MENSAJE_ACEPTACION_TOTAL, MENSAJE_ACEPTACION_PARCIAL, MENSAJE_RECHAZO]) {
      const xml = buildMensajeReceptorXml(fixture);
      expect(xml).toContain("<MensajeReceptor");
      expect(xml).toContain("</MensajeReceptor>");
    }
  });

  it("minimal Mensaje Receptor should omit optional fields", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_MINIMAL);
    expect(xml).not.toContain("<DetalleMensaje>");
    expect(xml).not.toContain("<MontoTotalImpuesto>");
    expect(xml).not.toContain("<CodigoActividad>");
    expect(xml).not.toContain("<CondicionImpuesto>");
    // But should still have required fields
    expect(xml).toContain("<Clave>");
    expect(xml).toContain("<Mensaje>1</Mensaje>");
    expect(xml).toContain("<TotalFactura>200000</TotalFactura>");
  });
});
