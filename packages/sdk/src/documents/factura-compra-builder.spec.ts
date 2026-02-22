/**
 * Tests for the Factura Electronica de Compra XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildFacturaCompraXml } from "./factura-compra-builder.js";
import { SIMPLE_FACTURA_COMPRA } from "../__fixtures__/document-fixtures.js";

describe("buildFacturaCompraXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have FacturaElectronicaCompra as root element", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<FacturaElectronicaCompra");
      expect(xml).toContain("</FacturaElectronicaCompra>");
    });

    it("should include correct namespace", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaCompra"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("FacturaElectronicaCompra_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain(`<Clave>${SIMPLE_FACTURA_COMPRA.clave}</Clave>`);
    });

    it("should include Emisor (the buyer issuing the purchase invoice)", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<Emisor>");
      expect(xml).toContain("<Nombre>Empresa Test S.A.</Nombre>");
    });

    it("should include Receptor (the unregistered supplier)", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Proveedor No Registrado</Nombre>");
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include merchandise line items", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<DetalleServicio>");
      expect(xml).toContain("<Detalle>Materia prima agricola</Detalle>");
      expect(xml).toContain("<Cantidad>100</Cantidad>");
      expect(xml).toContain("<UnidadMedida>Unid</UnidadMedida>");
    });

    it("should include ResumenFactura with merchandise totals", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<TotalMercanciasGravadas>50000</TotalMercanciasGravadas>");
      expect(xml).toContain("<TotalComprobante>56500</TotalComprobante>");
    });
  });
});
