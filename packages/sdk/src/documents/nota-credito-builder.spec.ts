/**
 * Tests for the Nota de Credito Electronica XML builder (v4.4 structure).
 */

import { describe, it, expect } from "vitest";
import { buildNotaCreditoXml } from "./nota-credito-builder.js";
import { SIMPLE_NOTA_CREDITO } from "../__fixtures__/document-fixtures.js";

const NAMESPACE =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica";

describe("buildNotaCreditoXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have NotaCreditoElectronica as root element (PascalCase)", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<NotaCreditoElectronica");
      expect(xml).toContain("</NotaCreditoElectronica>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain(`xmlns="${NAMESPACE}"`);
      expect(xml).not.toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/NotaCreditoElectronica"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain(`xsi:schemaLocation="${NAMESPACE} NotaCreditoElectronica_V4.4.xsd"`);
      expect(xml).not.toContain("NotaCreditoElectronica_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain(`<Clave>${SIMPLE_NOTA_CREDITO.clave}</Clave>`);
    });

    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should include CodigoActividadEmisor", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
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
    it("should include InformacionReferencia with v4.4 element names", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<InformacionReferencia>");
      expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
      expect(xml).not.toContain("<TipoDoc>");
      expect(xml).toContain("<FechaEmisionIR>2025-07-27T10:30:00-06:00</FechaEmisionIR>");
      expect(xml).toContain("<Codigo>01</Codigo>");
      expect(xml).toContain("<Razon>Devolucion parcial por servicio no completado</Razon>");
    });

    it("should include the referenced document number", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<Numero>50601072500031012345670010000101000000000119999999</Numero>");
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include line items with CodigoCABYS and adjusted amounts", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<CodigoCABYS>4321000000000</CodigoCABYS>");
      expect(xml).toContain("<PrecioUnitario>50000</PrecioUnitario>");
      expect(xml).toContain("<MontoTotalLinea>56500</MontoTotalLinea>");
    });

    it("should include tax with CodigoTarifaIVA (not CodigoTarifa)", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
      expect(xml).not.toContain("<CodigoTarifa>");
      expect(xml).toContain("<Monto>6500</Monto>");
    });

    it("should NOT include ImpuestoAsumidoEmisorFabrica (not part of the NC schema)", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).not.toContain("<ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include ResumenFactura with default CodigoTipoMoneda and payment methods", () => {
      const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<CodigoMoneda>CRC</CodigoMoneda>");
      expect(xml).toContain("<TipoCambio>1</TipoCambio>");
      expect(xml).toContain("<TipoMedioPago>01</TipoMedioPago>");
      expect(xml).toContain("<TotalMedioPago>56500</TotalMedioPago>");
      expect(xml).toContain("<TotalComprobante>56500</TotalComprobante>");
      expect(xml).not.toContain("<MedioPago>01</MedioPago>");
    });
  });
});
