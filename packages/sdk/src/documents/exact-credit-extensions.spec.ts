import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { ExactNcPartialInputSchema } from "@dojocoding/hacienda-shared";
import { exactNcPartialFixture } from "../__fixtures__/exact-credit-extensions.js";
import { fixtureClave } from "../__fixtures__/identity.js";
import { calculateExactNcPartial } from "../tax/exact-nc-partial.js";
import { buildExactNotaCreditoPartialXml } from "./exact-nc-partial-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
function required<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("Missing synthetic source fact");
  return v;
}
describe("exact partial amount correction", () => {
  it("calculates only explicit credit, preserves original source and emits03/reference01+02 native XML", async () => {
    const input = exactNcPartialFixture(),
      before = JSON.stringify(input),
      calculated = calculateExactNcPartial(input),
      xml = buildExactNotaCreditoPartialXml(input);
    expect(calculated.resumenFactura).toMatchObject({
      totalVentaNeta: "10.00001",
      totalImpuesto: "1.30000",
      totalComprobante: "11.30001",
    });
    expect(xml).toContain("<NotaCreditoElectronica ");
    expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
    expect(xml).toContain("<Codigo>02</Codigo>");
    expect(xml).toContain(`<Numero>${input.original.clave}</Numero>`);
    expect(JSON.stringify(input)).toBe(before);
    for (const generation of ["2024"] as const)
      expect(
        validateAgainstXsd(xml, "NotaCreditoElectronica_V4.4.xsd", {
          allowMissingSignature: true,
          generation,
        }).errors,
      ).toBe("");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    const signed = await signXml(xml, createTestP12("partial-credit"), "partial-credit");
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
  });
  it("does not substitute unrelated original-total ceiling for actual cumulative original+ND−NC authority", () => {
    const input = exactNcPartialFixture();
    required(input.adjustments[0]).line.precioUnitario = "200";
    input.medioPago = [{ tipoMedioPago: "04", totalMedioPago: "226" }];
    expect(calculateExactNcPartial(input).resumenFactura.totalComprobante).toBe("226.00000");
    // Source math is valid, but actual issuance remains blocked absent verified remaining authority.
    for (const patch of [
      { accepted: true },
      { remainingCredit: "226" },
      { ceiling: "226" },
      { refund: true },
    ])
      expect(ExactNcPartialInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("binds sequential correlated lines, references, domestic source metadata and independent allocations", () => {
    const input = exactNcPartialFixture(),
      a = required(input.adjustments[0]);
    for (const patch of [
      { informacionReferencia: [{ ...input.informacionReferencia[0], codigo: "01" }] },
      { informacionReferencia: [{ ...input.informacionReferencia[0], tipoDoc: "10" }] },
      { adjustments: [a, a] },
      { adjustments: [{ ...a, originalLineNumber: 99 }] },
      { adjustments: [{ ...a, line: { ...a.line, numeroLinea: 2 } }] },
      {
        adjustments: [
          { ...a, line: { ...a.line, codigoCabys: "4321000000000", esServicio: false } },
        ],
      },
      { adjustments: [{ ...a, line: { ...a.line, cantidad: 1 } }] },
      { original: { ...input.original, condicionVenta: "12" } },
      {
        medioPago: [
          { tipoMedioPago: "01", totalMedioPago: "0" },
          { tipoMedioPago: "04", totalMedioPago: "11.30001" },
        ],
      },
    ])
      expect(ExactNcPartialInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    expect(() =>
      calculateExactNcPartial({
        ...input,
        medioPago: [{ tipoMedioPago: "04", totalMedioPago: "1" }],
      }),
    ).toThrow("allocation");
    const wrongIdentity = fixtureClave(input.fechaEmision, "02", 5);
    expect(() =>
      calculateExactNcPartial({
        ...input,
        clave: wrongIdentity,
        numeroConsecutivo: wrongIdentity.slice(21, 41),
      }),
    ).toThrow("identity");
    const first = required(input.original.detalleServicio[0]);
    first.precioUnitario = "2";
    expect(() => calculateExactNcPartial(input)).toThrow("allocation");
  });
  it("retains exact fraction/offset chronology and Unicode reference/name bounds without normalizing source", () => {
    const input = exactNcPartialFixture();
    input.original.fechaEmision = "2026-10-18T12:00:00.0000000009-06:00";
    input.original.clave = fixtureClave(input.original.fechaEmision, "01", 1);
    input.original.numeroConsecutivo = input.original.clave.slice(21, 41);
    input.informacionReferencia[0].numero = input.original.clave;
    input.informacionReferencia[0].fechaEmision = input.original.fechaEmision;
    input.fechaEmision = "2026-10-18T18:00:00.0000000001Z";
    input.clave = fixtureClave(input.fechaEmision, "03", 5);
    input.numeroConsecutivo = input.clave.slice(21, 41);
    expect(() => calculateExactNcPartial(input)).toThrow("precede");
    input.fechaEmision = "2026-10-18T18:00:00.0000000009Z";
    input.informacionReferencia[0].razon = "a😀b";
    input.original.emisor.nombre = "😀".repeat(100);
    expect(calculateExactNcPartial(input).resumenFactura.totalComprobante).toBe("11.30001");
    input.original.emisor.nombre = "abcd";
    expect(() => calculateExactNcPartial(input)).toThrow();
    input.original.emisor.nombre = "abcde";
    input.original.receptor.nombre = "ab";
    expect(() => calculateExactNcPartial(input)).toThrow();
    input.original.receptor.nombre = "abc";
    input.informacionReferencia[0].razon = "😀".repeat(181);
    expect(() => calculateExactNcPartial(input)).toThrow();
  });
  it("agrees with independent Decimal credit vectors and rejects overflow/zero-net without Number", () => {
    const vectors = [
      { q: "0.001", p: "0.01500" },
      { q: "1.005", p: "1.23455" },
      { q: "9999999999999999", p: "0.00001" },
    ];
    const expected = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          `import json,sys\nfrom decimal import Decimal,localcontext,ROUND_HALF_UP\nwith localcontext() as c:\n c.prec=80\n q=lambda x:x.quantize(Decimal('0.00001'),rounding=ROUND_HALF_UP)\n print(json.dumps([[str(g),str(t),str(g+t)] for v in json.load(sys.stdin) for g in[q(Decimal(v['q'])*Decimal(v['p']))] for t in[q(g*Decimal('0.13'))]]))`,
        ],
        { input: JSON.stringify(vectors), encoding: "utf8" },
      ),
    ) as string[][];
    vectors.forEach((v, i) => {
      const input = exactNcPartialFixture(),
        line = required(input.adjustments[0]).line,
        e = required(expected[i]);
      line.cantidad = v.q;
      line.precioUnitario = v.p;
      input.medioPago = [{ tipoMedioPago: "04", totalMedioPago: required(e[2]) }];
      const actual = required(calculateExactNcPartial(input).detalleServicio[0]);
      expect([actual.subTotal, actual.impuestoNeto, actual.montoTotalLinea]).toEqual(e);
    });
    const bad = exactNcPartialFixture();
    required(bad.adjustments[0]).line.cantidad = "2";
    required(bad.adjustments[0]).line.precioUnitario = "9999999999999.99999";
    expect(() => calculateExactNcPartial(bad)).toThrow("monetary bound");
    const zero = exactNcPartialFixture();
    required(zero.adjustments[0]).line.descuento = [{ codigoDescuento: "07", porcentaje: "100" }];
    expect(() => calculateExactNcPartial(zero)).toThrow("Zero or negative net");
  });
});
