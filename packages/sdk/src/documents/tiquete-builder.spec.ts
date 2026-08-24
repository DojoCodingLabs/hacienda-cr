/**
 * Tests for the Tiquete Electronico XML builder (v4.4 structure).
 */

import { describe, it, expect } from "vitest";
import { buildTiqueteXml } from "./tiquete-builder.js";
import { SIMPLE_TIQUETE, TIQUETE_WITH_RECEPTOR } from "../__fixtures__/document-fixtures.js";

const NAMESPACE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico";

describe("buildTiqueteXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have TiqueteElectronico as root element (PascalCase)", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<TiqueteElectronico");
      expect(xml).toContain("</TiqueteElectronico>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain(`xmlns="${NAMESPACE}"`);
      expect(xml).not.toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/TiqueteElectronico"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain(`xsi:schemaLocation="${NAMESPACE} TiqueteElectronico_V4.4.xsd"`);
      expect(xml).not.toContain("TiqueteElectronico_V.4.4.xsd");
    });
  });

  describe("required header elements", () => {
    it("should include Clave", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain(`<Clave>${SIMPLE_TIQUETE.clave}</Clave>`);
    });

    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should include CodigoActividadEmisor (not CodigoActividad)", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
      expect(xml).not.toContain("<CodigoActividad>");
    });

    it("should include NumeroConsecutivo", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain(
        `<NumeroConsecutivo>${SIMPLE_TIQUETE.numeroConsecutivo}</NumeroConsecutivo>`,
      );
    });

    it("should include FechaEmision", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<FechaEmision>2025-07-27T10:30:00-06:00</FechaEmision>");
    });

    it("should NOT include a root-level MedioPago", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).not.toContain("<MedioPago>01</MedioPago>");
      expect(xml.indexOf("<MedioPago>")).toBeGreaterThan(xml.indexOf("<ResumenFactura>"));
    });
  });

  describe("Receptor handling", () => {
    it("should not include Receptor when omitted", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).not.toContain("<Receptor>");
    });

    it("should include Receptor when provided", () => {
      const xml = buildTiqueteXml(TIQUETE_WITH_RECEPTOR);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Juan Perez</Nombre>");
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include line items with CodigoCABYS", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<DetalleServicio>");
      expect(xml).toContain("<LineaDetalle>");
      expect(xml).toContain("<NumeroLinea>1</NumeroLinea>");
      expect(xml).toContain("<CodigoCABYS>4321000000000</CodigoCABYS>");
      expect(xml).not.toContain("<Codigo>4321000000000</Codigo>");
    });

    it("should include tax with CodigoTarifaIVA (not CodigoTarifa)", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
      expect(xml).not.toContain("<CodigoTarifa>");
      expect(xml).toContain("<Monto>13000</Monto>");
    });

    it("should include ImpuestoAsumidoEmisorFabrica (defaults to 0)", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include ResumenFactura with default CodigoTipoMoneda (CRC / 1)", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<CodigoTipoMoneda>");
      expect(xml).toContain("<CodigoMoneda>CRC</CodigoMoneda>");
      expect(xml).toContain("<TipoCambio>1</TipoCambio>");
      expect(xml).toContain("<TotalComprobante>113000</TotalComprobante>");
    });

    it("should include MedioPago inside ResumenFactura with TipoMedioPago and TotalMedioPago", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<TipoMedioPago>01</TipoMedioPago>");
      expect(xml).toContain("<TotalMedioPago>113000</TotalMedioPago>");
      const medioPagoIndex = xml.indexOf("<MedioPago>");
      expect(medioPagoIndex).toBeGreaterThan(xml.indexOf("<ResumenFactura>"));
      expect(medioPagoIndex).toBeLessThan(xml.indexOf("</ResumenFactura>"));
    });

    it("should include TotalDesgloseImpuesto breakdown", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<TotalDesgloseImpuesto>");
      expect(xml).toContain("<TotalMontoImpuesto>13000</TotalMontoImpuesto>");
    });
  });
});
