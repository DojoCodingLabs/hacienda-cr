/**
 * Tests for the Factura Electronica de Compra XML builder (v4.4 structure).
 */

import { describe, it, expect } from "vitest";
import { buildFacturaCompraXml } from "./factura-compra-builder.js";
import { SIMPLE_FACTURA_COMPRA } from "../__fixtures__/document-fixtures.js";

const NAMESPACE =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronicaCompra";

describe("buildFacturaCompraXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have FacturaElectronicaCompra as root element (PascalCase)", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<FacturaElectronicaCompra");
      expect(xml).toContain("</FacturaElectronicaCompra>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain(`xmlns="${NAMESPACE}"`);
      expect(xml).not.toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronicaCompra"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain(`xsi:schemaLocation="${NAMESPACE} FacturaElectronicaCompra_V4.4.xsd"`);
      expect(xml).not.toContain("FacturaElectronicaCompra_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain(`<Clave>${SIMPLE_FACTURA_COMPRA.clave}</Clave>`);
    });

    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should include CodigoActividadEmisor and CodigoActividadReceptor", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
      expect(xml).toContain("<CodigoActividadReceptor>620100</CodigoActividadReceptor>");
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

  describe("InformacionReferencia", () => {
    it("should include the supplier voucher reference with v4.4 element names", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<InformacionReferencia>");
      expect(xml).toContain("<TipoDocIR>99</TipoDocIR>");
      expect(xml).not.toContain("<TipoDoc>");
      expect(xml).toContain(
        "<TipoDocRefOTRO>Comprobante de proveedor no registrado</TipoDocRefOTRO>",
      );
      expect(xml).toContain("<FechaEmisionIR>2025-08-03T09:00:00-06:00</FechaEmisionIR>");
      expect(xml).toContain("<Codigo>04</Codigo>");
      expect(xml).toContain("<Razon>Respaldo de compra a proveedor no inscrito</Razon>");
    });
  });

  describe("DetalleServicio and ResumenFactura", () => {
    it("should include merchandise line items with CodigoCABYS", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<DetalleServicio>");
      expect(xml).toContain("<CodigoCABYS>1234500000000</CodigoCABYS>");
      expect(xml).not.toContain("<Codigo>1234500000000</Codigo>");
      expect(xml).toContain("<Detalle>Materia prima agricola</Detalle>");
      expect(xml).toContain("<Cantidad>100</Cantidad>");
      expect(xml).toContain("<UnidadMedida>Unid</UnidadMedida>");
    });

    it("should include tax with CodigoTarifaIVA (not CodigoTarifa)", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
      expect(xml).not.toContain("<CodigoTarifa>");
      expect(xml).toContain("<Monto>6500</Monto>");
    });

    it("should NOT include ImpuestoAsumidoEmisorFabrica (not part of the FEC schema)", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).not.toContain("<ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include ResumenFactura with merchandise totals and default currency", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<CodigoMoneda>CRC</CodigoMoneda>");
      expect(xml).toContain("<TipoCambio>1</TipoCambio>");
      expect(xml).toContain("<TotalMercanciasGravadas>50000</TotalMercanciasGravadas>");
      expect(xml).toContain("<TotalComprobante>56500</TotalComprobante>");
    });

    it("should include MedioPago inside ResumenFactura", () => {
      const xml = buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA);
      expect(xml).toContain("<TipoMedioPago>01</TipoMedioPago>");
      expect(xml).toContain("<TotalMedioPago>56500</TotalMedioPago>");
      expect(xml).not.toContain("<MedioPago>01</MedioPago>");
    });
  });
});
