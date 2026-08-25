/**
 * Integration tests for all document type builders (v4.4 structure).
 *
 * Verifies XML structure, namespaces, and key elements for each
 * of the 7 document types + Mensaje Receptor.
 */

import { describe, it, expect } from "vitest";
import { buildFacturaXml } from "./factura-builder.js";
import { buildTiqueteXml } from "./tiquete-builder.js";
import { buildNotaCreditoXml } from "./nota-credito-builder.js";
import { buildNotaDebitoXml } from "./nota-debito-builder.js";
import { buildFacturaCompraXml } from "./factura-compra-builder.js";
import { buildFacturaExportacionXml } from "./factura-exportacion-builder.js";
import { buildReciboPagoXml } from "./recibo-pago-builder.js";
import { buildMensajeReceptorXml } from "./mensaje-receptor-builder.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import {
  SIMPLE_TIQUETE,
  TIQUETE_WITH_RECEPTOR,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
  MENSAJE_ACEPTACION_TOTAL,
  MENSAJE_ACEPTACION_PARCIAL,
  MENSAJE_RECHAZO,
  MENSAJE_MINIMAL,
} from "../__fixtures__/document-fixtures.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAMESPACE_BASE = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4";

interface DocumentBuilderTestCase {
  name: string;
  rootElement: string;
  namespace: string;
  schemaFile: string;
  buildXml: () => string;
  hasClave: string;
  /** REP is the only document without an emitter activity code. */
  hasCodigoActividadEmisor: boolean;
}

const STANDARD_DOCUMENT_CASES: DocumentBuilderTestCase[] = [
  {
    name: "Factura Electronica",
    rootElement: "FacturaElectronica",
    namespace: `${NAMESPACE_BASE}/facturaElectronica`,
    schemaFile: "FacturaElectronica_V4.4.xsd",
    buildXml: () => buildFacturaXml(SIMPLE_INVOICE),
    hasClave: SIMPLE_INVOICE.clave,
    hasCodigoActividadEmisor: true,
  },
  {
    name: "Tiquete Electronico",
    rootElement: "TiqueteElectronico",
    namespace: `${NAMESPACE_BASE}/tiqueteElectronico`,
    schemaFile: "TiqueteElectronico_V4.4.xsd",
    buildXml: () => buildTiqueteXml(SIMPLE_TIQUETE),
    hasClave: SIMPLE_TIQUETE.clave,
    hasCodigoActividadEmisor: true,
  },
  {
    name: "Nota de Credito Electronica",
    rootElement: "NotaCreditoElectronica",
    namespace: `${NAMESPACE_BASE}/notaCreditoElectronica`,
    schemaFile: "NotaCreditoElectronica_V4.4.xsd",
    buildXml: () => buildNotaCreditoXml(SIMPLE_NOTA_CREDITO),
    hasClave: SIMPLE_NOTA_CREDITO.clave,
    hasCodigoActividadEmisor: true,
  },
  {
    name: "Nota de Debito Electronica",
    rootElement: "NotaDebitoElectronica",
    namespace: `${NAMESPACE_BASE}/notaDebitoElectronica`,
    schemaFile: "NotaDebitoElectronica_V4.4.xsd",
    buildXml: () => buildNotaDebitoXml(SIMPLE_NOTA_DEBITO),
    hasClave: SIMPLE_NOTA_DEBITO.clave,
    hasCodigoActividadEmisor: true,
  },
  {
    name: "Factura Electronica de Compra",
    rootElement: "FacturaElectronicaCompra",
    namespace: `${NAMESPACE_BASE}/facturaElectronicaCompra`,
    schemaFile: "FacturaElectronicaCompra_V4.4.xsd",
    buildXml: () => buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA),
    hasClave: SIMPLE_FACTURA_COMPRA.clave,
    hasCodigoActividadEmisor: true,
  },
  {
    name: "Factura Electronica de Exportacion",
    rootElement: "FacturaElectronicaExportacion",
    namespace: `${NAMESPACE_BASE}/facturaElectronicaExportacion`,
    schemaFile: "FacturaElectronicaExportacion_V4.4.xsd",
    buildXml: () => buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION),
    hasClave: SIMPLE_FACTURA_EXPORTACION.clave,
    hasCodigoActividadEmisor: true,
  },
  {
    name: "Recibo Electronico de Pago",
    rootElement: "ReciboElectronicoPago",
    namespace: `${NAMESPACE_BASE}/reciboElectronicoPago`,
    schemaFile: "ReciboElectronicoPago_V4.4.xsd",
    buildXml: () => buildReciboPagoXml(SIMPLE_RECIBO_PAGO),
    hasClave: SIMPLE_RECIBO_PAGO.clave,
    hasCodigoActividadEmisor: false,
  },
];

// ---------------------------------------------------------------------------
// Standard document type tests
// ---------------------------------------------------------------------------

describe("All document type builders — XML structure verification", () => {
  describe.each(STANDARD_DOCUMENT_CASES)(
    "$name",
    ({
      rootElement,
      namespace,
      schemaFile,
      buildXml: build,
      hasClave,
      hasCodigoActividadEmisor,
    }) => {
      it("should produce XML with declaration", () => {
        const xml = build();
        expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      });

      it(`should have ${rootElement} as root element`, () => {
        const xml = build();
        expect(xml).toContain(`<${rootElement}`);
        expect(xml).toContain(`</${rootElement}>`);
      });

      it("should include the lowerCamelCase namespace", () => {
        const xml = build();
        expect(xml).toContain(`xmlns="${namespace}"`);
      });

      it("should include xsi namespace", () => {
        const xml = build();
        expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      });

      it("should include schemaLocation with namespace and V4.4 XSD file", () => {
        const xml = build();
        expect(xml).toContain(`xsi:schemaLocation="${namespace} ${schemaFile}"`);
      });

      it("should include Clave element", () => {
        const xml = build();
        expect(xml).toContain(`<Clave>${hasClave}</Clave>`);
      });

      it("should include ProveedorSistemas immediately after Clave", () => {
        const xml = build();
        expect(xml).toMatch(
          /<Clave>[^<]+<\/Clave>\s*<ProveedorSistemas>3101234567<\/ProveedorSistemas>/,
        );
      });

      it(
        hasCodigoActividadEmisor
          ? "should include CodigoActividadEmisor"
          : "should NOT include CodigoActividadEmisor (REP has no activity code)",
        () => {
          const xml = build();
          if (hasCodigoActividadEmisor) {
            expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
          } else {
            expect(xml).not.toContain("<CodigoActividadEmisor>");
          }
        },
      );

      it("should include Emisor element", () => {
        const xml = build();
        expect(xml).toContain("<Emisor>");
      });

      it("should include DetalleServicio element", () => {
        const xml = build();
        expect(xml).toContain("<DetalleServicio>");
      });

      it("should include ResumenFactura with CodigoTipoMoneda", () => {
        const xml = build();
        expect(xml).toContain("<ResumenFactura>");
        expect(xml).toContain("<CodigoTipoMoneda>");
      });

      it("should emit payment methods inside ResumenFactura (no root-level MedioPago)", () => {
        const xml = build();
        expect(xml).toContain("<TipoMedioPago>");
        expect(xml).toContain("<TotalMedioPago>");
        expect(xml).not.toMatch(/<MedioPago>\d{2}<\/MedioPago>/);
        const medioPagoIndex = xml.indexOf("<MedioPago>");
        expect(medioPagoIndex).toBeGreaterThan(xml.indexOf("<ResumenFactura>"));
        expect(medioPagoIndex).toBeLessThan(xml.indexOf("</ResumenFactura>"));
      });

      it("should not emit v4.3-only element names", () => {
        const xml = build();
        expect(xml).not.toContain("<CodigoTarifa>");
        expect(xml).not.toContain("<IdentificacionExtranjero>");
        expect(xml).not.toContain("<TipoDoc>");
        expect(xml).not.toContain("<CodigoActividad>");
      });
    },
  );
});

// ---------------------------------------------------------------------------
// Mensaje Receptor tests
// ---------------------------------------------------------------------------

describe("Mensaje Receptor builder — XML structure verification", () => {
  it("should produce XML with declaration", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
  });

  it("should have MensajeReceptor as root element", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain("<MensajeReceptor");
    expect(xml).toContain("</MensajeReceptor>");
  });

  it("should include the lowerCamelCase namespace and schemaLocation", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain(`xmlns="${NAMESPACE_BASE}/mensajeReceptor"`);
    expect(xml).toContain(
      `xsi:schemaLocation="${NAMESPACE_BASE}/mensajeReceptor MensajeReceptor_V4.4.xsd"`,
    );
  });

  it("should NOT include DetalleServicio (not a transactional document)", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).not.toContain("<DetalleServicio>");
  });

  it("should NOT include Emisor (uses NumeroCedulaEmisor instead)", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).not.toContain("<Emisor>");
    expect(xml).toContain("<NumeroCedulaEmisor>");
  });

  it("should include all required Mensaje Receptor fields", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain("<Clave>");
    expect(xml).toContain("<NumeroCedulaEmisor>");
    expect(xml).toContain("<FechaEmisionDoc>");
    expect(xml).toContain("<Mensaje>");
    expect(xml).toContain("<TotalFactura>");
    expect(xml).toContain("<NumeroCedulaReceptor>");
    expect(xml).toContain("<NumeroConsecutivoReceptor>");
  });

  it("should include MontoTotalImpuestoAcreditar when present", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_ACEPTACION_TOTAL);
    expect(xml).toContain("<MontoTotalImpuestoAcreditar>13000</MontoTotalImpuestoAcreditar>");
  });
});

// ---------------------------------------------------------------------------
// Cross-document type uniqueness tests
// ---------------------------------------------------------------------------

describe("Cross-document type verification", () => {
  it("each document type should use a different root element", () => {
    const rootElements = new Set(STANDARD_DOCUMENT_CASES.map((c) => c.rootElement));
    expect(rootElements.size).toBe(STANDARD_DOCUMENT_CASES.length);
  });

  it("each document type should use a different namespace", () => {
    const namespaces = new Set(STANDARD_DOCUMENT_CASES.map((c) => c.namespace));
    expect(namespaces.size).toBe(STANDARD_DOCUMENT_CASES.length);
  });

  it("Nota de Credito should include InformacionReferencia with TipoDocIR", () => {
    const xml = buildNotaCreditoXml(SIMPLE_NOTA_CREDITO);
    expect(xml).toContain("<InformacionReferencia>");
    expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
    expect(xml).toContain("<FechaEmisionIR>");
  });

  it("Nota de Debito should include InformacionReferencia with TipoDocIR", () => {
    const xml = buildNotaDebitoXml(SIMPLE_NOTA_DEBITO);
    expect(xml).toContain("<InformacionReferencia>");
    expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
    expect(xml).toContain("<FechaEmisionIR>");
  });

  it("Recibo Electronico de Pago should include InformacionReferencia (required)", () => {
    const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
    expect(xml).toContain("<InformacionReferencia>");
    expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
  });

  it("Recibo Electronico de Pago should use reduced line items", () => {
    const xml = buildReciboPagoXml(SIMPLE_RECIBO_PAGO);
    expect(xml).not.toContain("<CodigoCABYS>");
    expect(xml).not.toContain("<Cantidad>");
    expect(xml).not.toContain("<UnidadMedida>");
    expect(xml).not.toContain("<PrecioUnitario>");
  });

  it("all other standard documents should include CodigoCABYS in line items", () => {
    for (const build of [
      () => buildFacturaXml(SIMPLE_INVOICE),
      () => buildTiqueteXml(SIMPLE_TIQUETE),
      () => buildNotaCreditoXml(SIMPLE_NOTA_CREDITO),
      () => buildNotaDebitoXml(SIMPLE_NOTA_DEBITO),
      () => buildFacturaCompraXml(SIMPLE_FACTURA_COMPRA),
      () => buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION),
    ]) {
      expect(build()).toContain("<CodigoCABYS>");
    }
  });

  it("Tiquete without receiver should not include Receptor", () => {
    const xml = buildTiqueteXml(SIMPLE_TIQUETE);
    expect(xml).not.toContain("<Receptor>");
  });

  it("Tiquete with receiver should include Receptor", () => {
    const xml = buildTiqueteXml(TIQUETE_WITH_RECEPTOR);
    expect(xml).toContain("<Receptor>");
  });

  it("Export invoice should identify the foreign buyer with Identificacion Tipo 05", () => {
    const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
    expect(xml).toContain("<Tipo>05</Tipo>");
    expect(xml).toContain("<Numero>US-EIN-12-3456789</Numero>");
    expect(xml).not.toContain("<IdentificacionExtranjero>");
  });

  it("Export invoice lines should not carry BaseImponible or ImpuestoNeto", () => {
    const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
    expect(xml).not.toContain("<BaseImponible>");
    expect(xml).not.toContain("<ImpuestoNeto>");
  });

  it("Export invoice should include CodigoTipoMoneda", () => {
    const xml = buildFacturaExportacionXml(SIMPLE_FACTURA_EXPORTACION);
    expect(xml).toContain("<CodigoTipoMoneda>");
    expect(xml).toContain("<CodigoMoneda>USD</CodigoMoneda>");
  });

  it("all three Mensaje types should produce valid XML", () => {
    for (const fixture of [MENSAJE_ACEPTACION_TOTAL, MENSAJE_ACEPTACION_PARCIAL, MENSAJE_RECHAZO]) {
      const xml = buildMensajeReceptorXml(fixture);
      expect(xml).toContain("<MensajeReceptor");
      expect(xml).toContain("</MensajeReceptor>");
    }
  });

  it("minimal Mensaje Receptor should omit optional fields", () => {
    const xml = buildMensajeReceptorXml(MENSAJE_MINIMAL);
    expect(xml).not.toContain("<DetalleMensaje>");
    expect(xml).not.toContain("<MontoTotalImpuesto>");
    expect(xml).not.toContain("<CodigoActividad>");
    expect(xml).not.toContain("<CondicionImpuesto>");
    expect(xml).not.toContain("<MontoTotalImpuestoAcreditar>");
    expect(xml).not.toContain("<MontoTotalDeGastoAplicable>");
    // But should still have required fields
    expect(xml).toContain("<Clave>");
    expect(xml).toContain("<Mensaje>1</Mensaje>");
    expect(xml).toContain("<TotalFactura>200000</TotalFactura>");
  });
});
