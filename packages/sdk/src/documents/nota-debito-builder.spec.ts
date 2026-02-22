/**
 * Tests for the Nota de Debito Electronica XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildNotaDebitoXml } from "./nota-debito-builder.js";
import { SIMPLE_NOTA_DEBITO } from "../__fixtures__/document-fixtures.js";

describe("buildNotaDebitoXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have NotaDebitoElectronica as root element", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<NotaDebitoElectronica");
      expect(xml).toContain("</NotaDebitoElectronica>");
    });

    it("should include correct namespace", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaDebitoElectronica"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("NotaDebitoElectronica_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain(`<Clave>${SIMPLE_NOTA_DEBITO.clave}</Clave>`);
    });

    it("should include Emisor and Receptor", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<Emisor>");
      expect(xml).toContain("<Receptor>");
    });
  });

  describe("InformacionReferencia", () => {
    it("should include InformacionReferencia (required for debit notes)", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<InformacionReferencia>");
      expect(xml).toContain("<TipoDoc>01</TipoDoc>");
      expect(xml).toContain("<Codigo>01</Codigo>");
      expect(xml).toContain(
        "<Razon>Ajuste por horas adicionales no contempladas en factura original</Razon>",
      );
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include line items with debit amounts", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<PrecioUnitario>25000</PrecioUnitario>");
      expect(xml).toContain("<MontoTotalLinea>28250</MontoTotalLinea>");
    });

    it("should include ResumenFactura", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<TotalComprobante>28250</TotalComprobante>");
    });
  });
});
