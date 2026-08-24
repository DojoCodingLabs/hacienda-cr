/**
 * Tests for the Factura Electronica XML builder (v4.4 structure).
 */

import { describe, it, expect } from "vitest";
import { buildFacturaXml } from "./factura-builder.js";
import {
  SIMPLE_INVOICE,
  MULTI_ITEM_INVOICE,
  DISCOUNT_INVOICE,
  EXONERATED_INVOICE,
  EXPORT_INVOICE,
  CREDIT_INVOICE,
  REFERENCE_INVOICE,
} from "../__fixtures__/invoices.js";

const NAMESPACE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert that the XML contains a specific string.
 */
function expectContains(xml: string, substring: string): void {
  expect(xml).toContain(substring);
}

/**
 * Assert that the XML does NOT contain a specific string.
 */
function expectNotContains(xml: string, substring: string): void {
  expect(xml).not.toContain(substring);
}

// ---------------------------------------------------------------------------
// XML Structure
// ---------------------------------------------------------------------------

describe("buildFacturaXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, '<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have FacturaElectronica as root element (PascalCase)", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<FacturaElectronica");
      expectContains(xml, "</FacturaElectronica>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, `xmlns="${NAMESPACE}"`);
      // The old PascalCase namespace fragment must be gone
      expectNotContains(
        xml,
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronica"',
      );
    });

    it("should include xsi namespace", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    });

    it("should include schemaLocation with namespace and V4.4 XSD file name", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, `xsi:schemaLocation="${NAMESPACE} FacturaElectronica_V4.4.xsd"`);
      // No dot between V and 4 (v4.3 style)
      expectNotContains(xml, "FacturaElectronica_V.4.4.xsd");
    });
  });

  describe("required header elements", () => {
    it("should include Clave", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, `<Clave>${SIMPLE_INVOICE.clave}</Clave>`);
    });

    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should include CodigoActividadEmisor (not CodigoActividad)", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
      expectNotContains(xml, "<CodigoActividad>");
    });

    it("should include NumeroConsecutivo", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(
        xml,
        `<NumeroConsecutivo>${SIMPLE_INVOICE.numeroConsecutivo}</NumeroConsecutivo>`,
      );
    });

    it("should include FechaEmision", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<FechaEmision>2025-07-27T10:30:00-06:00</FechaEmision>");
    });

    it("should include CondicionVenta", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<CondicionVenta>01</CondicionVenta>");
    });

    it("should NOT include a root-level MedioPago (moved into ResumenFactura in v4.4)", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectNotContains(xml, "<MedioPago>01</MedioPago>");
      const medioPagoIndex = xml.indexOf("<MedioPago>");
      const resumenIndex = xml.indexOf("<ResumenFactura>");
      expect(medioPagoIndex).toBeGreaterThan(resumenIndex);
    });
  });

  describe("Emisor element", () => {
    it("should include Emisor with all required fields", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<Emisor>");
      expectContains(xml, "<Nombre>Empresa Test S.A.</Nombre>");
      expectContains(xml, "<Tipo>02</Tipo>");
      expectContains(xml, "<Numero>3101234567</Numero>");
      expectContains(xml, "<CorreoElectronico>facturacion@testcorp.cr</CorreoElectronico>");
    });

    it("should include NombreComercial when present", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<NombreComercial>TestCorp</NombreComercial>");
    });

    it("should include Ubicacion when present", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<Ubicacion>");
      expectContains(xml, "<Provincia>1</Provincia>");
      expectContains(xml, "<Canton>01</Canton>");
      expectContains(xml, "<Distrito>01</Distrito>");
    });

    it("should include Telefono when present", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<Telefono>");
      expectContains(xml, "<CodigoPais>506</CodigoPais>");
      expectContains(xml, "<NumTelefono>22223333</NumTelefono>");
    });
  });

  describe("Receptor element", () => {
    it("should include Receptor with identification", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<Receptor>");
      expectContains(xml, "<Nombre>Cliente Ejemplo S.R.L.</Nombre>");
    });

    it("should use Identificacion Tipo 05 for foreign receivers (no IdentificacionExtranjero)", () => {
      const xml = buildFacturaXml(EXPORT_INVOICE);
      expectContains(xml, "<Tipo>05</Tipo>");
      expectContains(xml, "<Numero>US-EIN-12-3456789</Numero>");
      expectNotContains(xml, "<IdentificacionExtranjero>");
    });
  });

  describe("DetalleServicio element", () => {
    it("should include line items with CodigoCABYS (not Codigo)", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<DetalleServicio>");
      expectContains(xml, "<LineaDetalle>");
      expectContains(xml, "<NumeroLinea>1</NumeroLinea>");
      expectContains(xml, "<CodigoCABYS>4321000000000</CodigoCABYS>");
      expectNotContains(xml, "<Codigo>4321000000000</Codigo>");
      expectContains(xml, "<Cantidad>1</Cantidad>");
      expectContains(xml, "<UnidadMedida>Sp</UnidadMedida>");
      expectContains(xml, "<Detalle>Servicio de consultoria en TI</Detalle>");
      expectContains(xml, "<PrecioUnitario>100000</PrecioUnitario>");
      expectContains(xml, "<MontoTotal>100000</MontoTotal>");
      expectContains(xml, "<SubTotal>100000</SubTotal>");
      expectContains(xml, "<MontoTotalLinea>113000</MontoTotalLinea>");
    });

    it("should include multiple line items", () => {
      const xml = buildFacturaXml(MULTI_ITEM_INVOICE);
      expectContains(xml, "<NumeroLinea>1</NumeroLinea>");
      expectContains(xml, "<NumeroLinea>2</NumeroLinea>");
      expectContains(xml, "<NumeroLinea>3</NumeroLinea>");
    });

    it("should include CodigoComercial when present", () => {
      const xml = buildFacturaXml(MULTI_ITEM_INVOICE);
      expectContains(xml, "<CodigoComercial>");
      expectContains(xml, "<Tipo>01</Tipo>");
      expectContains(xml, "<Codigo>PROD-001</Codigo>");
    });

    it("should include Impuesto details with CodigoTarifaIVA (not CodigoTarifa)", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<Impuesto>");
      expectContains(xml, "<Codigo>01</Codigo>");
      expectContains(xml, "<CodigoTarifaIVA>08</CodigoTarifaIVA>");
      expectNotContains(xml, "<CodigoTarifa>");
      expectContains(xml, "<Tarifa>13</Tarifa>");
      expectContains(xml, "<Monto>13000</Monto>");
    });

    it("should include ImpuestoNeto", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<ImpuestoNeto>13000</ImpuestoNeto>");
    });

    it("should include ImpuestoAsumidoEmisorFabrica (defaults to 0)", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include BaseImponible when present", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<BaseImponible>100000</BaseImponible>");
    });
  });

  describe("discounts", () => {
    it("should include Descuento elements with CodigoDescuento", () => {
      const xml = buildFacturaXml(DISCOUNT_INVOICE);
      expectContains(xml, "<Descuento>");
      expectContains(xml, "<MontoDescuento>5000</MontoDescuento>");
      expectContains(xml, "<CodigoDescuento>01</CodigoDescuento>");
      expectContains(xml, "<NaturalezaDescuento>Descuento por volumen (10%)</NaturalezaDescuento>");
    });
  });

  describe("exonerations", () => {
    it("should include Exoneracion details in v4.4 shape", () => {
      const xml = buildFacturaXml(EXONERATED_INVOICE);
      expectContains(xml, "<Exoneracion>");
      expectContains(xml, "<TipoDocumentoEX1>03</TipoDocumentoEX1>");
      expectNotContains(xml, "<TipoDocumento>");
      expectContains(xml, "<NumeroDocumento>AL-001-2025</NumeroDocumento>");
      expectContains(xml, "<NombreInstitucion>99</NombreInstitucion>");
      expectContains(
        xml,
        "<NombreInstitucionOtros>Ministerio de Educacion Publica</NombreInstitucionOtros>",
      );
      expectContains(xml, "<FechaEmisionEX>2025-01-15T00:00:00-06:00</FechaEmisionEX>");
      expectContains(xml, "<TarifaExonerada>13</TarifaExonerada>");
      expectContains(xml, "<MontoExoneracion>26000</MontoExoneracion>");
      expectNotContains(xml, "<PorcentajeExoneracion>");
    });
  });

  describe("ResumenFactura element", () => {
    it("should include all summary fields", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<ResumenFactura>");
      expectContains(xml, "<TotalServGravados>100000</TotalServGravados>");
      expectContains(xml, "<TotalServExentos>0</TotalServExentos>");
      expectContains(xml, "<TotalMercanciasGravadas>0</TotalMercanciasGravadas>");
      expectContains(xml, "<TotalMercanciasExentas>0</TotalMercanciasExentas>");
      expectContains(xml, "<TotalGravado>100000</TotalGravado>");
      expectContains(xml, "<TotalExento>0</TotalExento>");
      expectContains(xml, "<TotalVenta>100000</TotalVenta>");
      expectContains(xml, "<TotalDescuentos>0</TotalDescuentos>");
      expectContains(xml, "<TotalVentaNeta>100000</TotalVentaNeta>");
      expectContains(xml, "<TotalImpuesto>13000</TotalImpuesto>");
      expectContains(xml, "<TotalComprobante>113000</TotalComprobante>");
    });

    it("should always include CodigoTipoMoneda, defaulting to CRC / 1", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<CodigoTipoMoneda>");
      expectContains(xml, "<CodigoMoneda>CRC</CodigoMoneda>");
      expectContains(xml, "<TipoCambio>1</TipoCambio>");
    });

    it("should include CodigoTipoMoneda for foreign currency", () => {
      const xml = buildFacturaXml(EXPORT_INVOICE);
      expectContains(xml, "<CodigoTipoMoneda>");
      expectContains(xml, "<CodigoMoneda>USD</CodigoMoneda>");
      expectContains(xml, "<TipoCambio>530.5</TipoCambio>");
    });

    it("should include MedioPago inside ResumenFactura with TipoMedioPago and TotalMedioPago", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<MedioPago>");
      expectContains(xml, "<TipoMedioPago>01</TipoMedioPago>");
      expectContains(xml, "<TotalMedioPago>113000</TotalMedioPago>");
      const resumenIndex = xml.indexOf("<ResumenFactura>");
      const medioPagoIndex = xml.indexOf("<MedioPago>");
      const resumenEndIndex = xml.indexOf("</ResumenFactura>");
      expect(medioPagoIndex).toBeGreaterThan(resumenIndex);
      expect(medioPagoIndex).toBeLessThan(resumenEndIndex);
    });

    it("should include TotalExonerado when present", () => {
      const xml = buildFacturaXml(EXONERATED_INVOICE);
      expectContains(xml, "<TotalServExonerado>200000</TotalServExonerado>");
      expectContains(xml, "<TotalExonerado>200000</TotalExonerado>");
    });

    it("should not include TotalExonerado when absent", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectNotContains(xml, "<TotalExonerado>");
      expectNotContains(xml, "<TotalServExonerado>");
    });
  });

  describe("optional elements", () => {
    it("should include PlazoCredito for credit invoices", () => {
      const xml = buildFacturaXml(CREDIT_INVOICE);
      expectContains(xml, "<PlazoCredito>30</PlazoCredito>");
    });

    it("should not include PlazoCredito for cash invoices", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectNotContains(xml, "<PlazoCredito>");
    });

    it("should include InformacionReferencia with TipoDocIR and FechaEmisionIR", () => {
      const xml = buildFacturaXml(REFERENCE_INVOICE);
      expectContains(xml, "<InformacionReferencia>");
      expectContains(xml, "<TipoDocIR>01</TipoDocIR>");
      expectNotContains(xml, "<TipoDoc>");
      expectContains(xml, "<FechaEmisionIR>2025-07-27T10:30:00-06:00</FechaEmisionIR>");
      expectContains(xml, "<Codigo>01</Codigo>");
      expectContains(xml, "<Razon>Correccion del monto por error de digitacion</Razon>");
    });

    it("should not include InformacionReferencia when absent", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectNotContains(xml, "<InformacionReferencia>");
    });
  });

  describe("all fixtures produce valid XML", () => {
    it.each([
      ["SIMPLE_INVOICE", SIMPLE_INVOICE],
      ["MULTI_ITEM_INVOICE", MULTI_ITEM_INVOICE],
      ["DISCOUNT_INVOICE", DISCOUNT_INVOICE],
      ["EXONERATED_INVOICE", EXONERATED_INVOICE],
      ["EXPORT_INVOICE", EXPORT_INVOICE],
      ["CREDIT_INVOICE", CREDIT_INVOICE],
      ["REFERENCE_INVOICE", REFERENCE_INVOICE],
    ] as const)("%s should produce XML with v4.4 root structure", (_name, fixture) => {
      const xml = buildFacturaXml(fixture);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain("<FacturaElectronica");
      expect(xml).toContain("</FacturaElectronica>");
      expect(xml).toContain(`<Clave>${fixture.clave}</Clave>`);
      expect(xml).toContain("<ProveedorSistemas>3101234567</ProveedorSistemas>");
      expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
      expect(xml).toContain("<CodigoTipoMoneda>");
    });
  });
});
