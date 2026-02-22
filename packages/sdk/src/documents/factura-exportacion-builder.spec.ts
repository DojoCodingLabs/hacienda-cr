/**
 * Tests for the Factura Electronica de Exportacion XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildFacturaExportacionXml } from "./factura-exportacion-builder.js";
import { SIMPLE_FACTURA_EXPORTACION } from "../__fixtures__/document-fixtures.js";

describe("buildFacturaExportacionXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have FacturaElectronicaExportacion as root element", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<FacturaElectronicaExportacion");
      expect(xml).toContain("</FacturaElectronicaExportacion>");
    });

    it("should include correct namespace", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaExportacion"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("FacturaElectronicaExportacion_V.4.4.xsd");
    });
  });

  describe("foreign receiver", () => {
    it("should include Receptor with IdentificacionExtranjero", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Acme Corp USA</Nombre>");
      expect(xml).toContain(
        "<IdentificacionExtranjero>US-EIN-12-3456789</IdentificacionExtranjero>",
      );
    });

    it("should not include domestic Identificacion in Receptor for foreign receiver", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      // Extract just the Receptor section to verify no Identificacion inside it
      const receptorMatch = xml.match(/<Receptor>([\s\S]*?)<\/Receptor>/);
      expect(receptorMatch).toBeTruthy();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by expect above
      const receptorXml = receptorMatch![1];
      expect(receptorXml).not.toContain("<Identificacion>");
      expect(receptorXml).toContain("<IdentificacionExtranjero>");
    });
  });

  describe("currency and totals", () => {
    it("should include CodigoTipoMoneda for foreign currency", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<CodigoTipoMoneda>");
      expect(xml).toContain("<CodigoMoneda>USD</CodigoMoneda>");
      expect(xml).toContain("<TipoCambio>530.5</TipoCambio>");
    });

    it("should handle 0% IVA totals", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<TotalServExentos>3000</TotalServExentos>");
      expect(xml).toContain("<TotalImpuesto>0</TotalImpuesto>");
      expect(xml).toContain("<TotalComprobante>3000</TotalComprobante>");
    });
  });
});
