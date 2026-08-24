/**
 * Tests for the Recibo Electronico de Pago XML builder (v4.4 structure).
 *
 * The REP schema is a reduced document: no activity codes, minimal
 * Emisor/Receptor, reduced line items, and a required document reference.
 */

import { describe, it, expect } from "vitest";
import { buildReciboPagoXml } from "./recibo-pago-builder.js";
import { SIMPLE_RECIBO_PAGO } from "../__fixtures__/document-fixtures.js";

const NAMESPACE =
  "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/reciboElectronicoPago";

describe("buildReciboPagoXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have ReciboElectronicoPago as root element (PascalCase)", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<ReciboElectronicoPago");
      expect(xml).toContain("</ReciboElectronicoPago>");
    });

    it("should include the lowerCamelCase v4.4 namespace", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain(`xmlns="${NAMESPACE}"`);
      expect(xml).not.toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/ReciboElectronicoPago"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain(`xsi:schemaLocation="${NAMESPACE} ReciboElectronicoPago_V4.4.xsd"`);
      expect(xml).not.toContain("ReciboElectronicoPago_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain(`<Clave>${SIMPLE_RECIBO_PAGO.clave}</Clave>`);
    });

    it("should include ProveedorSistemas immediately after Clave", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toMatch(
        /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
      );
    });

    it("should NOT include any activity code (REP has none)", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).not.toContain("<CodigoActividadEmisor>");
      expect(xml).not.toContain("<CodigoActividadReceptor>");
      expect(xml).not.toContain("<CodigoActividad>");
    });

    it("should include NumeroConsecutivo, FechaEmision, and CondicionVenta", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain(
        `<NumeroConsecutivo>${SIMPLE_RECIBO_PAGO.numeroConsecutivo}</NumeroConsecutivo>`,
      );
      expect(xml).toContain("<FechaEmision>2025-08-05T11:00:00-06:00</FechaEmision>");
      // REP only admits CondicionVenta 09 or 11 in the v4.4 XSD
      expect(xml).toContain("<CondicionVenta>11</CondicionVenta>");
    });
  });

  describe("minimal Emisor and Receptor", () => {
    it("should include Emisor with only Nombre, Identificacion, and CorreoElectronico", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<Emisor>");
      expect(xml).toContain("<Nombre>Empresa Test S.A.</Nombre>");
      expect(xml).toContain("<Tipo>02</Tipo>");
      expect(xml).toContain("<Numero>3101234567</Numero>");
      expect(xml).toContain("<CorreoElectronico>facturacion@testcorp.cr</CorreoElectronico>");
    });

    it("should NOT include Ubicacion, Telefono, or NombreComercial (reduced Emisor)", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).not.toContain("<Ubicacion>");
      expect(xml).not.toContain("<Telefono>");
      expect(xml).not.toContain("<NombreComercial>");
    });

    it("should include Receptor with minimal fields", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<Receptor>");
      expect(xml).toContain("<Nombre>Cliente Ejemplo S.R.L.</Nombre>");
      expect(xml).toContain("<CorreoElectronico>compras@clienteejemplo.cr</CorreoElectronico>");
    });
  });

  describe("reduced line items", () => {
    it("should include NumeroLinea, Detalle, and totals", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<DetalleServicio>");
      expect(xml).toContain("<LineaDetalle>");
      expect(xml).toContain("<NumeroLinea>1</NumeroLinea>");
      expect(xml).toContain("<Detalle>Pago de factura de consultoria</Detalle>");
      expect(xml).toContain("<MontoTotal>100000</MontoTotal>");
      expect(xml).toContain("<SubTotal>100000</SubTotal>");
      expect(xml).toContain("<MontoTotalLinea>113000</MontoTotalLinea>");
    });

    it("should NOT include CodigoCABYS, Cantidad, UnidadMedida, or PrecioUnitario", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).not.toContain("<CodigoCABYS>");
      expect(xml).not.toContain("<Cantidad>");
      expect(xml).not.toContain("<UnidadMedida>");
      expect(xml).not.toContain("<PrecioUnitario>");
    });

    it("should NOT include BaseImponible or ImpuestoAsumidoEmisorFabrica", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).not.toContain("<BaseImponible>");
      expect(xml).not.toContain("<ImpuestoAsumidoEmisorFabrica>");
    });

    it("should include Impuesto with CodigoTarifaIVA and ImpuestoNeto", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<Impuesto>");
      expect(xml).toContain("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
      expect(xml).not.toContain("<CodigoTarifa>");
      expect(xml).toContain("<Monto>13000</Monto>");
      expect(xml).toContain("<ImpuestoNeto>13000</ImpuestoNeto>");
    });
  });

  describe("InformacionReferencia (required for REP)", () => {
    it("should include the reference to the paid invoice with v4.4 element names", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<InformacionReferencia>");
      expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
      expect(xml).not.toContain("<TipoDoc>");
      expect(xml).toContain("<Numero>50601072500031012345670010000101000000000119999999</Numero>");
      expect(xml).toContain("<FechaEmisionIR>2025-07-27T10:30:00-06:00</FechaEmisionIR>");
      expect(xml).toContain("<Codigo>04</Codigo>");
      expect(xml).toContain("<Razon>Pago de factura emitida a credito</Razon>");
    });
  });

  describe("ResumenFactura", () => {
    it("should include default CodigoTipoMoneda (CRC / 1)", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<ResumenFactura>");
      expect(xml).toContain("<CodigoMoneda>CRC</CodigoMoneda>");
      expect(xml).toContain("<TipoCambio>1</TipoCambio>");
    });

    it("should include totals and tax breakdown", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<TotalVenta>100000</TotalVenta>");
      expect(xml).toContain("<TotalVentaNeta>100000</TotalVentaNeta>");
      expect(xml).toContain("<TotalDesgloseImpuesto>");
      expect(xml).toContain("<TotalMontoImpuesto>13000</TotalMontoImpuesto>");
      expect(xml).toContain("<TotalImpuesto>13000</TotalImpuesto>");
      expect(xml).toContain("<TotalComprobante>113000</TotalComprobante>");
    });

    it("should include MedioPago inside ResumenFactura", () => {
      const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
      expect(xml).toContain("<TipoMedioPago>04</TipoMedioPago>");
      expect(xml).toContain("<TotalMedioPago>113000</TotalMedioPago>");
      expect(xml).not.toContain("<MedioPago>04</MedioPago>");
      const medioPagoIndex = xml.indexOf("<MedioPago>");
      expect(medioPagoIndex).toBeGreaterThan(xml.indexOf("<ResumenFactura>"));
      expect(medioPagoIndex).toBeLessThan(xml.indexOf("</ResumenFactura>"));
    });
  });
});
