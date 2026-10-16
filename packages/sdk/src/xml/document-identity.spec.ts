import { describe, expect, it } from "vitest";
import { buildClave } from "../clave/build-clave.js";
import { DocumentType, Situation } from "../clave/types.js";
import { validateFacturaInput } from "./validator.js";
import { validateDocumentIdentity, type IdentityDocument } from "./document-identity.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import {
  SIMPLE_TIQUETE,
  SIMPLE_NOTA_CREDITO,
  SIMPLE_NOTA_DEBITO,
  SIMPLE_FACTURA_COMPRA,
  SIMPLE_FACTURA_EXPORTACION,
  SIMPLE_RECIBO_PAGO,
} from "../__fixtures__/document-fixtures.js";
import {
  buildFacturaXml,
  buildTiqueteXml,
  buildNotaCreditoXml,
  buildNotaDebitoXml,
  buildFacturaCompraXml,
  buildFacturaExportacionXml,
  buildReciboPagoXml,
} from "../documents/index.js";

function documentCase<T extends IdentityDocument>(
  name: string,
  fixture: T,
  build: (input: T) => string,
) {
  return {
    name,
    run(mutate?: (input: T) => void) {
      const document = structuredClone(fixture);
      mutate?.(document);
      return build(document);
    },
  };
}
const cases = [
  documentCase("FE", SIMPLE_INVOICE, buildFacturaXml),
  documentCase("TE", SIMPLE_TIQUETE, buildTiqueteXml),
  documentCase("NC", SIMPLE_NOTA_CREDITO, buildNotaCreditoXml),
  documentCase("ND", SIMPLE_NOTA_DEBITO, buildNotaDebitoXml),
  documentCase("FEC", SIMPLE_FACTURA_COMPRA, buildFacturaCompraXml),
  documentCase("FEE", SIMPLE_FACTURA_EXPORTACION, buildFacturaExportacionXml),
  documentCase("REP", SIMPLE_RECIBO_PAGO, buildReciboPagoXml),
];

describe("standard builder identity boundary", () => {
  it.each(cases)("$name builds a coherent synthetic identity", ({ run }) =>
    expect(run()).toContain("<Clave>"),
  );
  it.each(cases)("$name rejects a different consecutive before generating XML", ({ run }) => {
    expect(() =>
      run((doc) => {
        doc.numeroConsecutivo = doc.numeroConsecutivo.slice(0, 19) + "9";
      }),
    ).toThrow("identity");
  });
  it.each(cases)("$name rejects a different issuance date", ({ run }) => {
    expect(() =>
      run((doc) => {
        doc.fechaEmision = "2026-02-01T12:00:00-06:00";
      }),
    ).toThrow("identity");
  });
  it.each(cases)("$name rejects a clave taxpayer different from its issuing party", ({ run }) => {
    expect(() =>
      run((doc) => {
        doc.clave = doc.clave.slice(0, 9) + "003101111111" + doc.clave.slice(21);
      }),
    ).toThrow("identity");
  });
  it("FEC uses buyer identity while preserving a different supplier", () => {
    expect(SIMPLE_FACTURA_COMPRA.emisor.identificacion.numero).not.toBe(
      SIMPLE_FACTURA_COMPRA.receptor.identificacion?.numero,
    );
    expect(validateDocumentIdentity(SIMPLE_FACTURA_COMPRA, "08")).toEqual([]);
  });
});

describe("date and type invariants", () => {
  it.each([
    ["2026-10-16T05:59:59Z", "151026"],
    ["2026-10-16T06:00:00Z", "161026"],
  ])("builds Costa Rica date for %s independently of UTC day", (instant, expected) => {
    const clave = buildClave({
      date: new Date(instant),
      taxpayerId: "3101234567",
      documentType: DocumentType.FACTURA_ELECTRONICA,
      sequence: 1,
      situation: Situation.NORMAL,
    });
    expect(clave.slice(3, 9)).toBe(expected);
  });
  it.each(["2025-02-30T12:00:00-06:00", "2025-07-27", "not-a-date"])(
    "rejects invalid or timezone-free date %s",
    (date) => {
      const input = structuredClone(SIMPLE_INVOICE);
      input.fechaEmision = date;
      expect(validateFacturaInput(input).errors.some((e) => e.path === "fechaEmision")).toBe(true);
    },
  );
  it("rejects matching clave/consecutive when their document type is not FE", () => {
    const input = structuredClone(SIMPLE_INVOICE);
    input.numeroConsecutivo =
      input.numeroConsecutivo.slice(0, 8) + "04" + input.numeroConsecutivo.slice(10);
    input.clave = input.clave.slice(0, 21) + input.numeroConsecutivo + input.clave.slice(41);
    expect(validateFacturaInput(input).errors.some((e) => e.path === "numeroConsecutivo")).toBe(
      true,
    );
  });
  it("requires FE receiver identity before the XSD/network boundary", () => {
    const input = structuredClone(SIMPLE_INVOICE);
    input.receptor = { nombre: "Synthetic receiver" };
    expect(
      validateFacturaInput(input).errors.some((e) => e.path === "receptor.identificacion"),
    ).toBe(true);
  });
});
