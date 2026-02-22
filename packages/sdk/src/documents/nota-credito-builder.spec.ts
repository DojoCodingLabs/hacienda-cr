/**
 * Tests for the Nota de Credito Electronica XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildNotaCreditoXml } from "./nota-credito-builder.js";
import { SIMPLE_NOTA_CREDITO } from "../__fixtures__/document-fixtures.js";

describe("buildNotaCreditoXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have NotaCreditoElectronica as root element", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<NotaCreditoElectronica");
      expect(xml).toContain("</NotaCreditoElectronica>");
    });

    it("should include correct namespace", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaCreditoElectronica"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("NotaCreditoElectronica_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain(`<Clave>${SIMPLE_NOTA_CREDITO.clave}</Clave>`);
    });

    it("should include Emisor", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<Emisor>");
      expect(xml).toContain("<Nombre>Empresa Test S.A.</Nombre>");
    });

    it("should include Receptor", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Cliente Ejemplo S.R.L.</Nombre>");
    });
  });

  describe("InformacionReferencia", () => {
    it("should include InformacionReferencia (required for credit notes)", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<InformacionReferencia>");
      expect(xml).toContain("<TipoDoc>01</TipoDoc>");
      expect(xml).toContain("<Codigo>01</Codigo>");
      expect(xml).toContain(
        "<Razon>Devolucion parcial por servicio no completado</Razon>",
      );
    });

    it("should include the referenced document number", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain(
        "<Numero>50601072500031012345670010000101000000000119999999</Numero>",
      );
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include line items with adjusted amounts", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<PrecioUnitario>50000</PrecioUnitario>");
      expect(xml).toContain("<MontoTotalLinea>56500</MontoTotalLinea>");
    });

    it("should include ResumenFactura", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<TotalComprobante>56500</TotalComprobante>");
    });
  });
});
