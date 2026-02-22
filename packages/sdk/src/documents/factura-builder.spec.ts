/**
 * Tests for the Factura Electronica XML builder.
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

    it("should have FacturaElectronica as root element", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<FacturaElectronica");
      expectContains(xml, "</FacturaElectronica>");
    });

    it("should include correct namespace", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(
        xml,
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/FacturaElectronica"',
      );
    });

    it("should include xsi namespace", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    });

    it("should include schemaLocation", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "FacturaElectronica_V.4.4.xsd");
    });
  });

  describe("required header elements", () => {
    it("should include Clave", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, `<Clave>${SIMPLE_INVOICE.clave}</Clave>`);
    });

    it("should include CodigoActividad", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<CodigoActividad>620100</CodigoActividad>");
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

    it("should include MedioPago", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<MedioPago>01</MedioPago>");
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

    it("should include foreign identification for export invoice", () => {
      const xml = buildFacturaXml(EXPORT_INVOICE);
      expectContains(xml, "<IdentificacionExtranjero>US-EIN-12-3456789</IdentificacionExtranjero>");
    });
  });

  describe("DetalleServicio element", () => {
    it("should include line items", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<DetalleServicio>");
      expectContains(xml, "<LineaDetalle>");
      expectContains(xml, "<NumeroLinea>1</NumeroLinea>");
      expectContains(xml, "<Codigo>4321000000000</Codigo>");
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

    it("should include Impuesto details", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<Impuesto>");
      expectContains(xml, "<Codigo>01</Codigo>");
      expectContains(xml, "<CodigoTarifa>08</CodigoTarifa>");
      expectContains(xml, "<Tarifa>13</Tarifa>");
      expectContains(xml, "<Monto>13000</Monto>");
    });

    it("should include ImpuestoNeto", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<ImpuestoNeto>13000</ImpuestoNeto>");
    });

    it("should include BaseImponible when present", () => {
      const xml = buildFacturaXml(SIMPLE_INVOICE);
      expectContains(xml, "<BaseImponible>100000</BaseImponible>");
    });
  });

  describe("discounts", () => {
    it("should include Descuento elements", () => {
      const xml = buildFacturaXml(DISCOUNT_INVOICE);
      expectContains(xml, "<Descuento>");
      expectContains(xml, "<MontoDescuento>5000</MontoDescuento>");
      expectContains(xml, "<NaturalezaDescuento>Descuento por volumen (10%)</NaturalezaDescuento>");
    });
  });

  describe("exonerations", () => {
    it("should include Exoneracion details", () => {
      const xml = buildFacturaXml(EXONERATED_INVOICE);
      expectContains(xml, "<Exoneracion>");
      expectContains(xml, "<TipoDocumento>03</TipoDocumento>");
      expectContains(xml, "<NumeroDocumento>AL-001-2025</NumeroDocumento>");
      expectContains(xml, "<NombreInstitucion>Ministerio de Educacion</NombreInstitucion>");
      expectContains(xml, "<PorcentajeExoneracion>100</PorcentajeExoneracion>");
      expectContains(xml, "<MontoExoneracion>26000</MontoExoneracion>");
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

    it("should include CodigoTipoMoneda for foreign currency", () => {
      const xml = buildFacturaXml(EXPORT_INVOICE);
      expectContains(xml, "<CodigoTipoMoneda>");
      expectContains(xml, "<CodigoMoneda>USD</CodigoMoneda>");
      expectContains(xml, "<TipoCambio>530.5</TipoCambio>");
    });

    it("should include TotalExonerado when present", () => {
      const xml = buildFacturaXml(EXONERATED_INVOICE);
      expectContains(xml, "<TotalServExonerado>200000</TotalServExonerado>");
      expectContains(xml, "<TotalExonerado>200000</TotalExonerado>");
    });

    it("should not include TotalExonerado when zero", () => {
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

    it("should include InformacionReferencia when present", () => {
      const xml = buildFacturaXml(REFERENCE_INVOICE);
      expectContains(xml, "<InformacionReferencia>");
      expectContains(xml, "<TipoDoc>01</TipoDoc>");
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
    ] as const)("%s should produce XML with declaration and root element", (_name, fixture) => {
      const xml = buildFacturaXml(fixture);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain("<FacturaElectronica");
      expect(xml).toContain("</FacturaElectronica>");
      expect(xml).toContain(`<Clave>${fixture.clave}</Clave>`);
    });
  });
});
