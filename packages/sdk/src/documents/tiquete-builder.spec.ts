/**
 * Tests for the Tiquete Electronico XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildTiqueteXml } from "./tiquete-builder.js";
import { SIMPLE_TIQUETE, TIQUETE_WITH_RECEPTOR } from "../__fixtures__/document-fixtures.js";

describe("buildTiqueteXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have TiqueteElectronico as root element", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<TiqueteElectronico");
      expect(xml).toContain("</TiqueteElectronico>");
    });

    it("should include correct namespace", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/TiqueteElectronico"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("TiqueteElectronico_V.4.4.xsd");
    });
  });

  describe("required header elements", () => {
    it("should include Clave", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain(`<Clave>${SIMPLE_TIQUETE.clave}</Clave>`);
    });

    it("should include CodigoActividad", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<CodigoActividad>620100</CodigoActividad>");
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
    it("should include line items", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<DetalleServicio>");
      expect(xml).toContain("<LineaDetalle>");
      expect(xml).toContain("<NumeroLinea>1</NumeroLinea>");
    });

    it("should include ResumenFactura", () => {
      const xml = buildTiqueteXml(SIMPLE_TIQUETE);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<TotalComprobante>113000</TotalComprobante>");
    });
  });
});
