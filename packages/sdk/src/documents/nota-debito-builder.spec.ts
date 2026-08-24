/**
 * Tests for the Nota de Debito Electronica XML builder (v4.4 structure).
 */

import { describe, it, expect } from "vitest";
import { buildNotaDebitoXml } from "./nota-debito-builder.js";
import { SIMPLE_NOTA_DEBITO } from "../__fixtures__/document-fixtures.js";

const NAMESPACE =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaDebitoElectronica";

describe("buildNotaDebitoXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have NotaDebitoElectronica as root element (PascalCase)", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<NotaDebitoElectronica");
      expect(xml).toContain("</NotaDebitoElectronica>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain(`xmlns="${NAMESPACE}"`);
      expect(xml).not.toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaDebitoElectronica"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain(`xsi:schemaLocation="${NAMESPACE} NotaDebitoElectronica_V4.4.xsd"`);
      expect(xml).not.toContain("NotaDebitoElectronica_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain(`<Clave>${SIMPLE_NOTA_DEBITO.clave}</Clave>`);
    });

    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should include CodigoActividadEmisor", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
    });

    it("should include Emisor and Receptor", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<Emisor>");
      expect(xml).toContain("<Receptor>");
    });
  });

  describe("InformacionReferencia", () => {
    it("should include InformacionReferencia with v4.4 element names", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<InformacionReferencia>");
      expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
      expect(xml).not.toContain("<TipoDoc>");
      expect(xml).toContain("<FechaEmisionIR>2025-07-27T10:30:00-06:00</FechaEmisionIR>");
      expect(xml).toContain("<Codigo>01</Codigo>");
      expect(xml).toContain(
        "<Razon>Ajuste por horas adicionales no contempladas en factura original</Razon>",
      );
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include line items with CodigoCABYS and debit amounts", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<CodigoCABYS>4321000000000</CodigoCABYS>");
      expect(xml).toContain("<PrecioUnitario>25000</PrecioUnitario>");
      expect(xml).toContain("<MontoTotalLinea>28250</MontoTotalLinea>");
    });

    it("should include tax with CodigoTarifaIVA (not CodigoTarifa)", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
      expect(xml).not.toContain("<CodigoTarifa>");
      expect(xml).toContain("<Monto>3250</Monto>");
    });

    it("should NOT include ImpuestoAsumidoEmisorFabrica (not part of the ND schema)", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).not.toContain("<ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include ResumenFactura with default CodigoTipoMoneda and payment methods", () => {
      const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<CodigoMoneda>CRC</CodigoMoneda>");
      expect(xml).toContain("<TipoCambio>1</TipoCambio>");
      expect(xml).toContain("<TipoMedioPago>04</TipoMedioPago>");
      expect(xml).toContain("<TotalMedioPago>28250</TotalMedioPago>");
      expect(xml).toContain("<TotalComprobante>28250</TotalComprobante>");
      expect(xml).not.toContain("<MedioPago>04</MedioPago>");
    });
  });
});
