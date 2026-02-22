/**
 * Tests for the Recibo Electronico de Pago XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildReciboPagoXml } from "./recibo-pago-builder.js";
import { SIMPLE_RECIBO_PAGO } from "../__fixtures__/document-fixtures.js";

describe("buildReciboPagoXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have ReciboElectronicoPago as root element", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<ReciboElectronicoPago");
      expect(xml).toContain("</ReciboElectronicoPago>");
    });

    it("should include correct namespace", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/ReciboElectronicoPago"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("ReciboElectronicoPago_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain(`<Clave>${SIMPLE_RECIBO_PAGO.clave}</Clave>`);
    });

    it("should include Emisor", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<Emisor>");
      expect(xml).toContain("<Nombre>Empresa Test S.A.</Nombre>");
    });

    it("should include Receptor", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Cliente Ejemplo S.R.L.</Nombre>");
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include line items", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<DetalleServicio>");
      expect(xml).toContain("<LineaDetalle>");
      expect(xml).toContain("<NumeroLinea>1</NumeroLinea>");
    });

    it("should include ResumenFactura", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<TotalComprobante>113000</TotalComprobante>");
    });
  });
});
