/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A4 — Propiedades de generación de documentos.
 */
import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

import { parseDocumentXml } from "../documents/parser.js";
import { DocumentType, Situation } from "../clave/types.js";
import { buildClave, parseClave } from "../clave/index.js";
import { validateFacturaInput } from "../xml/validator.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { arbitraryDocumentWithType } from "../__fixtures__/document-generator.js";
import * as D from "../documents/index.js";
import "../documents/parser.js";

const BUILD_BY_INDEX = [
  D.buildFacturaXml,
  D.buildTiqueteXml,
  D.buildNotaCreditoXml,
  D.buildNotaDebitoXml,
  D.buildFacturaCompraXml,
  D.buildFacturaExportacionXml,
  D.buildReciboPagoXml,
];

const BUILD_BY_ROOT: Record<string, (doc: any) => string> = {
  FacturaElectronica: D.buildFacturaXml,
  TiqueteElectronico: D.buildTiqueteXml,
  NotaCreditoElectronica: D.buildNotaCreditoXml,
  NotaDebitoElectronica: D.buildNotaDebitoXml,
  FacturaElectronicaCompra: D.buildFacturaCompraXml,
  FacturaElectronicaExportacion: D.buildFacturaExportacionXml,
  ReciboElectronicoPago: D.buildReciboPagoXml,
};

const PROPERTY_RUNS = Number(process.env.PROPERTY_RUNS ?? 100);
const XSD_RUNS = Number(process.env.XSD_RUNS ?? 25);

vi.setConfig({ testTimeout: 300_000 });

describe("A4 property-based", () => {
  it("toda factura generada pasa la validacion de entrada del SDK", () => {
    fc.assert(
      fc.property(arbitraryDocumentWithType(), ({ typeIdx, document }) => {
        if (typeIdx !== 0) return true;
        const r = validateFacturaInput(document);
        if (!r.valid) throw new Error("input invalid: " + JSON.stringify(r.errors));
        return true;
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("todo documento generado valida contra el XSD", async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryDocumentWithType(), async ({ typeIdx, document }) => {
        const xml = BUILD_BY_INDEX[typeIdx](document as any);
        const res = await validateDocumentXml(xml);
        if (!res.valid) console.error("XSD FAIL", res.issues, xml.slice(0, 300));
        expect(res.valid).toBe(true);
      }),
      { numRuns: XSD_RUNS },
    );
  });

  it("construir → parsear → construir es un punto fijo", () => {
    fc.assert(
      fc.property(arbitraryDocumentWithType(), ({ typeIdx, document }) => {
        const build = BUILD_BY_INDEX[typeIdx];
        const xml = build(document as any);
        const parsed = parseDocumentXml(xml);
        const rexml = BUILD_BY_ROOT[parsed.rootElement](parsed.document as any);
        expect(rexml).toBe(xml);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("la clave (buildClave → parseClave) se descompone en sus insumos normalizados", () => {
    fc.assert(
      fc.property(
        fc.record({
          date: fc
            .date({ min: new Date(2024, 0, 1), max: new Date(2025, 11, 31) })
            .filter((d) => !isNaN(d.getTime())),
          taxpayerId: fc.constantFrom("3101234567", "ABC123", "123456789"),
          branch: fc.constantFrom(undefined, "1", "2", "123"),
          pos: fc.constantFrom(undefined, "1", "2", "12345"),
          documentType: fc.constantFrom(...Object.values(DocumentType)),
          sequence: fc.integer({ min: 1, max: 9_999_999_999 }),
          situation: fc.constantFrom(...Object.values(Situation)),
          securityCode: fc.constantFrom(undefined, "123", "12345678"),
        }),
        (input) => {
          const clave = buildClave(input as any);
          const parsed = parseClave(clave);
          expect(parsed.countryCode).toBe("506");
          expect(parsed.taxpayerId).toBe(input.taxpayerId.padStart(12, "0"));
          expect(parsed.sequence).toBe(input.sequence);
          expect(parsed.documentType).toBe(input.documentType);
          expect(parsed.situation).toBe(input.situation);
          expect(parsed.branch).toBe((input.branch ?? "1").padStart(3, "0"));
          expect(parsed.pos).toBe((input.pos ?? "1").padStart(5, "0"));
          expect(parsed.securityCode).toBe(
            (input.securityCode ?? parsed.securityCode).padStart(8, "0"),
          );
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  // static leap-date check
  it("claves con fecha límite se descomponen", () => {
    const inputs = [
      {
        date: new Date(2024, 1, 29),
        taxpayerId: "3101234567",
        documentType: DocumentType.TIQUETE_ELECTRONICO,
        sequence: 1,
        situation: Situation.NORMAL,
      },
      {
        date: new Date(2025, 11, 31),
        taxpayerId: "3101234567",
        documentType: DocumentType.FACTURA_ELECTRONICA,
        sequence: 9_999_999_999,
        situation: Situation.NORMAL,
      },
    ];
    for (const input of inputs) {
      const clave = buildClave(input as any);
      const parsed = parseClave(clave);
      expect(parsed.sequence).toBe(input.sequence);
    }
  });
});
