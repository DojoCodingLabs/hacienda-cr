/**
 * Coherencia clave ↔ documento de los fixtures publicados.
 *
 * Cada fixture con clave debe cumplir:
 * 1. La clave parsea con parseClave (50 dígitos, país 506).
 * 2. La fecha de la clave coincide con fechaEmision del documento.
 * 3. El contribuyente de la clave termina con el número de identificación del sujeto
 *    fiscal del documento (emisor, excepto en Factura Electrónica de Compra, donde es el receptor;
 *    la clave lleva 12 dígitos, el identificador puede ir sin ceros a la izquierda).
 * 4. El tipo de documento de la clave coincide con el esperado del fixture.
 *
 * Transport fixtures (mocks con claves opacas, p. ej. client.spec.ts, orchestrator.spec.ts)
 * quedan fuera de alcance: sus claves son strings opacas para transporte, no claves válidas.
 */
import { describe, expect, it } from "vitest";
import { parseClave } from "../clave/parse-clave.js";
import {
  SIMPLE_FACTURA,
  SIMPLE_TIQUETE,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
} from "./document-fixtures.js";
import { SIMPLE_INVOICE } from "./invoices.js";

interface FixtureWithClave {
  clave: string;
  fechaEmision: string;
  numeroConsecutivo?: string;
}

interface FixtureOwner {
  identificacion: { numero: string };
}

const CASES: {
  name: string;
  fixture: FixtureWithClave;
  owner: FixtureOwner;
  expectedDocType: string;
}[] = [
  {
    name: "SIMPLE_FACTURA",
    fixture: SIMPLE_FACTURA,
    owner: SIMPLE_FACTURA.emisor,
    expectedDocType: "01",
  },
  {
    name: "SIMPLE_TIQUETE",
    fixture: SIMPLE_TIQUETE,
    owner: SIMPLE_TIQUETE.emisor,
    expectedDocType: "04",
  },
  {
    name: "SIMPLE_NOTA_CREDITO",
    fixture: SIMPLE_NOTA_CREDITO,
    owner: SIMPLE_NOTA_CREDITO.emisor,
    expectedDocType: "03",
  },
  {
    name: "SIMPLE_NOTA_DEBITO",
    fixture: SIMPLE_NOTA_DEBITO,
    owner: SIMPLE_NOTA_DEBITO.emisor,
    expectedDocType: "02",
  },
  {
    name: "SIMPLE_FACTURA_COMPRA",
    fixture: SIMPLE_FACTURA_COMPRA,
    owner: SIMPLE_FACTURA_COMPRA.receptor,
    expectedDocType: "08",
  },
  {
    name: "SIMPLE_FACTURA_EXPORTACION",
    fixture: SIMPLE_FACTURA_EXPORTACION,
    owner: SIMPLE_FACTURA_EXPORTACION.emisor,
    expectedDocType: "09",
  },
  {
    name: "SIMPLE_RECIBO_PAGO",
    fixture: SIMPLE_RECIBO_PAGO,
    owner: SIMPLE_RECIBO_PAGO.emisor,
    expectedDocType: "10",
  },
  {
    name: "SIMPLE_INVOICE",
    fixture: SIMPLE_INVOICE,
    owner: SIMPLE_INVOICE.emisor,
    expectedDocType: "01",
  },
];

function claveDateIso(parsed: ReturnType<typeof parseClave>): string {
  const d = parsed.date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe("fixture clave coherence", () => {
  for (const { name, fixture, owner, expectedDocType } of CASES) {
    it(`${name}: clave parseable y coherente con el documento`, () => {
      const parsed = parseClave(fixture.clave);
      expect(parsed.countryCode).toBe("506");
      expect(claveDateIso(parsed)).toBe(fixture.fechaEmision.slice(0, 10));
      expect(parsed.taxpayerId.endsWith(owner.identificacion.numero)).toBe(true);
      expect(parsed.documentType).toBe(expectedDocType);
      expect(parsed.situation).toMatch(/^[123]$/);
      if (fixture.numeroConsecutivo) {
        expect(parsed.sequenceRaw).toBe(fixture.numeroConsecutivo.slice(-10));
      }
    });
  }

  it("clave de 50 dígitos para todos los fixtures", () => {
    for (const { fixture } of CASES) {
      expect(fixture.clave).toMatch(/^\d{9}[A-Za-z0-9]{12}\d{29}$/);
      expect(fixture.clave.length).toBe(50);
    }
  });
});
