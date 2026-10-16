/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { buildFacturaXml } from "./factura-builder.js";
import { buildTiqueteXml } from "./tiquete-builder.js";
import { buildNotaCreditoXml } from "./nota-credito-builder.js";
import { buildNotaDebitoXml } from "./nota-debito-builder.js";
import { buildFacturaCompraXml } from "./factura-compra-builder.js";
import { buildFacturaExportacionXml } from "./factura-exportacion-builder.js";
import { buildReciboPagoXml } from "./recibo-pago-builder.js";
import { parseDocumentXml } from "./parser.js";
import { ValidationError } from "../errors.js";
import {
  SIMPLE_FACTURA,
  SIMPLE_TIQUETE,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
} from "../__fixtures__/document-fixtures.js";

describe("parseDocumentXml", () => {
  it("parses each known root and reads clave", () => {
    const cases = [
      { build: buildFacturaXml, input: SIMPLE_FACTURA, root: "FacturaElectronica" },
      { build: buildTiqueteXml, input: SIMPLE_TIQUETE, root: "TiqueteElectronico" },
      { build: buildNotaCreditoXml, input: SIMPLE_NOTA_CREDITO, root: "NotaCreditoElectronica" },
      { build: buildNotaDebitoXml, input: SIMPLE_NOTA_DEBITO, root: "NotaDebitoElectronica" },
      {
        build: buildFacturaCompraXml,
        input: SIMPLE_FACTURA_COMPRA,
        root: "FacturaElectronicaCompra",
      },
      {
        build: buildFacturaExportacionXml,
        input: SIMPLE_FACTURA_EXPORTACION,
        root: "FacturaElectronicaExportacion",
      },
      { build: buildReciboPagoXml, input: SIMPLE_RECIBO_PAGO, root: "ReciboElectronicoPago" },
    ];
    for (const c of cases) {
      const xml = c.build(c.input as any);
      const { rootElement, document } = parseDocumentXml(xml);
      expect(rootElement).toBe(c.root);
      expect((document as any).clave).toBe(c.input.clave);
    }
  });

  it("roundtrips bytes for every document type", () => {
    const builders = [
      buildFacturaXml,
      buildTiqueteXml,
      buildNotaCreditoXml,
      buildNotaDebitoXml,
      buildFacturaCompraXml,
      buildFacturaExportacionXml,
      buildReciboPagoXml,
    ];
    const inputs = [
      SIMPLE_FACTURA,
      SIMPLE_TIQUETE,
      SIMPLE_NOTA_CREDITO,
      SIMPLE_NOTA_DEBITO,
      SIMPLE_FACTURA_COMPRA,
      SIMPLE_FACTURA_EXPORTACION,
      SIMPLE_RECIBO_PAGO,
    ];
    builders.forEach((b, i) => {
      const xml = b(inputs[i] as any);
      const parsed = parseDocumentXml(xml);
      const reXml = (builders[i] as any)(parsed.document);
      expect(reXml).toBe(xml);
    });
  });

  it("throws ValidationError for an unknown root", () => {
    const xml = '<?xml version="1.0"?><Foo xmlns="x"><Clave>x</Clave></Foo>';
    expect(() => parseDocumentXml(xml)).toThrow(ValidationError);
  });

  it("throws ValidationError for malformed XML", () => {
    expect(() => parseDocumentXml("<Foo><bar></Foo>")).toThrow(ValidationError);
  });

  it("throws ValidationError for input over the limits (entity declaration)", () => {
    const xml = '<?xml version="1.0"?><!ENTITY x "y"><Foo/>';
    expect(() => parseDocumentXml(xml)).toThrow(ValidationError);
  });

  it("does not read external entities (XML with external entity is rejected)", () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><FacturaElectronica><Clave>&xxe;</Clave></FacturaElectronica>';
    expect(() => parseDocumentXml(xml)).toThrow(ValidationError);
  });
});
