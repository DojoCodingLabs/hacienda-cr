/**
 * Tests for the Factura Electronica de Exportacion XML builder (v4.4 structure).
 */

import { describe, it, expect } from "vitest";
import { buildFacturaExportacionXml } from "./factura-exportacion-builder.js";
import { SIMPLE_FACTURA_EXPORTACION } from "../__fixtures__/document-fixtures.js";

const NAMESPACE =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronicaExportacion";

describe("buildFacturaExportacionXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have FacturaElectronicaExportacion as root element (PascalCase)", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<FacturaElectronicaExportacion");
      expect(xml).toContain("</FacturaElectronicaExportacion>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain(`xmlns="${NAMESPACE}"`);
      expect(xml).not.toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaExportacion"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain(
        `xsi:schemaLocation="${NAMESPACE} FacturaElectronicaExportacion_V4.4.xsd"`,
      );
      expect(xml).not.toContain("FacturaElectronicaExportacion_V.4.4.xsd");
    });
  });

  describe("required header elements", () => {
    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should include CodigoActividadEmisor", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
    });
  });

  describe("foreign receiver", () => {
    it("should include Receptor with Identificacion Tipo 05 (no IdentificacionExtranjero)", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Acme Corp USA</Nombre>");
      expect(xml).toContain("<Identificacion>");
      expect(xml).toContain("<Tipo>05</Tipo>");
      expect(xml).toContain("<Numero>US-EIN-12-3456789</Numero>");
      expect(xml).not.toContain("<IdentificacionExtranjero>");
    });

    it("should include OtrasSenasExtranjero when present", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain(
        "<OtrasSenasExtranjero>350 Fifth Avenue, New York, NY, USA</OtrasSenasExtranjero>",
      );
    });
  });

  describe("line items (FEE-specific structure)", () => {
    it("should include CodigoCABYS", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<CodigoCABYS>4321000000000</CodigoCABYS>");
      expect(xml).not.toContain("<Codigo>4321000000000</Codigo>");
    });

    it("should NOT include BaseImponible or ImpuestoNeto (not part of the FEE line schema)", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).not.toContain("<BaseImponible>");
      expect(xml).not.toContain("<ImpuestoNeto>");
    });

    it("should NOT include ImpuestoAsumidoEmisorFabrica", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).not.toContain("<ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include tax with CodigoTarifaIVA and zero Monto", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<CodigoTarifaIVA>01</CodigoTarifaIVA>");
      expect(xml).not.toContain("<CodigoTarifa>");
      expect(xml).toContain("<Tarifa>0</Tarifa>");
      expect(xml).toContain("<Monto>0</Monto>");
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

    it("should include MedioPago inside ResumenFactura", () => {
      const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
      expect(xml).toContain("<TipoMedioPago>04</TipoMedioPago>");
      expect(xml).toContain("<TotalMedioPago>3000</TotalMedioPago>");
      expect(xml).not.toContain("<MedioPago>04</MedioPago>");
      const medioPagoIndex = xml.indexOf("<MedioPago>");
      expect(medioPagoIndex).toBeGreaterThan(xml.indexOf("<ResumenFactura>"));
      expect(medioPagoIndex).toBeLessThan(xml.indexOf("</ResumenFactura>"));
    });
  });
});
