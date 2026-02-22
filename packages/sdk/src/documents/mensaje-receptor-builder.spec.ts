/**
 * Tests for the Mensaje Receptor XML builder.
 */

import { describe, it, expect } from "vitest";
import { buildMensajeReceptorXml } from "./mensaje-receptor-builder.js";
import {
  MENSAJE_ACEPTACION_TOTAL,
  MENSAJE_ACEPTACION_PARCIAL,
  MENSAJE_RECHAZO,
  MENSAJE_MINIMAL,
} from "../__fixtures__/document-fixtures.js";

describe("buildMensajeReceptorXml", () => {
  describe("XML declaration and root element", () => {
    it("should produce valid XML with declaration", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    });

    it("should have MensajeReceptor as root element", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<MensajeReceptor");
      expect(xml).toContain("</MensajeReceptor>");
    });

    it("should include correct namespace", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain(
        'xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/MensajeReceptor"',
      );
    });

    it("should include xsi namespace and schemaLocation", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain("MensajeReceptor_V.4.4.xsd");
    });
  });

  describe("required elements", () => {
    it("should include Clave", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain(`<Clave>${MENSAJE_ACEPTACION_TOTAL.clave}</Clave>`);
    });

    it("should include NumeroCedulaEmisor", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor>");
    });

    it("should include FechaEmisionDoc", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain(
        "<FechaEmisionDoc>2025-07-27T10:30:00-06:00</FechaEmisionDoc>",
      );
    });

    it("should include Mensaje code", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<Mensaje>1</Mensaje>");
    });

    it("should include TotalFactura", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<TotalFactura>113000</TotalFactura>");
    });

    it("should include NumeroCedulaReceptor", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<NumeroCedulaReceptor>3109876543</NumeroCedulaReceptor>");
    });

    it("should include NumeroConsecutivoReceptor", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain(
        "<NumeroConsecutivoReceptor>00100001050000000001</NumeroConsecutivoReceptor>",
      );
    });
  });

  describe("optional elements", () => {
    it("should include DetalleMensaje when present", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain(
        "<DetalleMensaje>Documento aceptado totalmente</DetalleMensaje>",
      );
    });

    it("should include MontoTotalImpuesto when present", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<MontoTotalImpuesto>13000</MontoTotalImpuesto>");
    });

    it("should include CodigoActividad when present", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<CodigoActividad>620100</CodigoActividad>");
    });

    it("should include CondicionImpuesto when present", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<CondicionImpuesto>01</CondicionImpuesto>");
    });

    it("should not include optional elements when absent", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_MINIMAL);
      expect(xml).not.toContain("<DetalleMensaje>");
      expect(xml).not.toContain("<MontoTotalImpuesto>");
      expect(xml).not.toContain("<CodigoActividad>");
      expect(xml).not.toContain("<CondicionImpuesto>");
    });
  });

  describe("message types", () => {
    it("should handle Aceptacion Total (code 1)", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
      expect(xml).toContain("<Mensaje>1</Mensaje>");
    });

    it("should handle Aceptacion Parcial (code 2)", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_PARCIAL);
      expect(xml).toContain("<Mensaje>2</Mensaje>");
      expect(xml).toContain(
        "<DetalleMensaje>Aceptado parcialmente",
      );
    });

    it("should handle Rechazo (code 3)", () => {
      const xml = buildMensajeReceptorXml(MENSAJE_RECHAZO);
      expect(xml).toContain("<Mensaje>3</Mensaje>");
      expect(xml).toContain(
        "<DetalleMensaje>Documento rechazado",
      );
    });
  });

  describe("all fixtures produce valid XML", () => {
    it.each([
      ["ACEPTACION_TOTAL", MENSAJE_ACEPTACION_TOTAL],
      ["ACEPTACION_PARCIAL", MENSAJE_ACEPTACION_PARCIAL],
      ["RECHAZO", MENSAJE_RECHAZO],
      ["MINIMAL", MENSAJE_MINIMAL],
    ] as const)("%s should produce XML with declaration and root element", (_name, fixture) => {
      const xml = buildMensajeReceptorXml(fixture);
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain("<MensajeReceptor");
      expect(xml).toContain("</MensajeReceptor>");
      expect(xml).toContain(`<Clave>${fixture.clave}</Clave>`);
    });
  });
});
