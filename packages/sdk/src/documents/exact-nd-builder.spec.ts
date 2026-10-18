import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { ExactNdInputSchema } from "@dojocoding/hacienda-shared";
import { exactNdFixture } from "../__fixtures__/exact-nd.js";
import { fixtureClave } from "../__fixtures__/identity.js";
import { calculateExactNd } from "../tax/exact-nd.js";
import { buildExactNotaDebitoXml } from "./exact-nd-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing synthetic fixture");
  return value;
}
describe("exact ordinary FE-reference positive ND increment", () => {
  it("calculates only the independent increment and preserves immutable original facts and native reference XML", async () => {
    const input = exactNdFixture(),
      before = JSON.stringify(input),
      calculated = calculateExactNd(input),
      xml = buildExactNotaDebitoXml(JSON.parse(before));
    expect(calculated.resumenFactura).toMatchObject({
      totalVentaNeta: "10.00001",
      totalImpuesto: "1.30000",
      totalComprobante: "11.30001",
    });
    expect(xml).toContain(
      '<NotaDebitoElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaDebitoElectronica"',
    );
    expect(xml).toContain(`<Numero>${input.original.clave}</Numero>`);
    expect(xml).toContain(`<FechaEmisionIR>${input.original.fechaEmision}</FechaEmisionIR>`);
    expect(xml).toContain("<Codigo>02</Codigo>");
    expect(xml).not.toContain("<TotalComprobante>113.00000</TotalComprobante>");
    for (const generation of ["2024", "2026"] as const)
      expect(
        validateAgainstXsd(xml, "NotaDebitoElectronica_V4.4.xsd", {
          allowMissingSignature: true,
          generation,
        }).errors,
      ).toBe("");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    expect(buildExactNotaDebitoXml(input)).toBe(xml);
  });
  it("binds source correspondence, unique original line policy, caller order and sequential ND output", () => {
    const input = exactNdFixture(),
      first = required(input.original.detalleServicio[0]);
    input.original.detalleServicio.push({
      ...structuredClone(first),
      numeroLinea: 2,
      precioUnitario: "100",
      codigoCabys: "4321000000000",
      esServicio: false,
    });
    input.original.medioPago = [{ tipoMedioPago: "01", totalMedioPago: "226" }];
    const firstDelta = required(input.adjustments[0]).line;
    input.adjustments = [
      {
        originalLineNumber: 2,
        line: { ...structuredClone(firstDelta), codigoCabys: "4321000000000", esServicio: false },
      },
      { originalLineNumber: 1, line: { ...structuredClone(firstDelta), numeroLinea: 2 } },
    ];
    input.medioPago = [{ tipoMedioPago: "01", totalMedioPago: "22.60002" }];
    const result = calculateExactNd(input);
    expect(result.detalleServicio.map((l) => [l.numeroLinea, l.codigoCabys])).toEqual([
      [1, "4321000000000"],
      [2, "8310100000000"],
    ]);
    for (const originalLineNumber of [1, 99]) {
      const bad = structuredClone(input);
      required(bad.adjustments[0]).originalLineNumber = originalLineNumber;
      expect(() => calculateExactNd(bad)).toThrow();
    }
    const bad = structuredClone(input);
    required(bad.adjustments[0]).line.unidadMedida = "Unid";
    expect(() => calculateExactNd(bad)).toThrow("correspond");
    const commercial = structuredClone(input);
    required(commercial.adjustments[0]).line.codigoComercial = [
      { tipo: "01", codigo: "unrelated" },
    ];
    expect(() => calculateExactNd(commercial)).toThrow("correspond");
    const sequence = structuredClone(input);
    required(sequence.adjustments[0]).line.numeroLinea = 2;
    expect(() => calculateExactNd(sequence)).toThrow("sequential");
  });
  it("rejects wrong references, families, identities, original arithmetic and unsupported authority/amount fields", () => {
    const input = exactNdFixture(),
      ref = required(input.informacionReferencia[0]);
    const invalid: unknown[] = [
      { ...input, accepted: true },
      { ...input, total: "1" },
      { ...input, codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: "2" } },
      { ...input, informacionReferencia: [] },
      { ...input, informacionReferencia: [ref, ref] },
      { ...input, informacionReferencia: [{ ...ref, tipoDoc: "03" }] },
      { ...input, informacionReferencia: [{ ...ref, codigo: "01" }] },
      { ...input, informacionReferencia: [{ ...ref, numero: "5".repeat(50) }] },
      { ...input, informacionReferencia: [{ ...ref, fechaEmision: "2025-01-01T00:00:00Z" }] },
      { ...input, original: { ...input.original, condicionVenta: "12" } },
      {
        ...input,
        adjustments: [
          {
            originalLineNumber: 1,
            line: { ...required(input.adjustments[0]).line, precioUnitario: 10 },
          },
        ],
      },
    ];
    for (const source of invalid) expect(ExactNdInputSchema.safeParse(source).success).toBe(false);
    const wrongIdentity = {
      ...input,
      clave: input.original.clave,
      numeroConsecutivo: input.original.numeroConsecutivo,
    };
    expect(() => calculateExactNd(wrongIdentity)).toThrow();
    const wrongType = {
      ...input,
      clave: input.clave.slice(0, 29) + "03" + input.clave.slice(31),
      numeroConsecutivo:
        input.numeroConsecutivo.slice(0, 8) + "03" + input.numeroConsecutivo.slice(10),
    };
    expect(() => buildExactNotaDebitoXml(wrongType)).toThrow();
    const originalMath = structuredClone(input);
    required(originalMath.original.medioPago[0]).totalMedioPago = "1";
    expect(() => calculateExactNd(originalMath)).toThrow("payment allocation");
  });
  it("preserves full fractional instants and reference lexemes across offsets without a hidden age clock", () => {
    const input = exactNdFixture();
    input.original.fechaEmision = "2026-10-18T12:00:00.0000000009-06:00";
    input.original.clave = fixtureClave(input.original.fechaEmision, "01", 1);
    input.original.numeroConsecutivo = input.original.clave.slice(21, 41);
    required(input.informacionReferencia[0]).numero = input.original.clave;
    required(input.informacionReferencia[0]).fechaEmision = input.original.fechaEmision;
    const earlier = { ...input, fechaEmision: "2026-10-18T18:00:00.0000000001Z" };
    expect(() => calculateExactNd(earlier)).toThrow("must not precede");
    const same = { ...input, fechaEmision: "2026-10-18T18:00:00.000000000900Z" };
    expect(calculateExactNd(same).resumenFactura.totalComprobante).toBe("11.30001");
    expect(buildExactNotaDebitoXml(same)).toContain(
      `<FechaEmisionIR>${input.original.fechaEmision}</FechaEmisionIR>`,
    );
    const historical = exactNdFixture();
    historical.original.fechaEmision = "2000-02-29T12:00:00-06:00";
    historical.original.clave = fixtureClave(historical.original.fechaEmision, "01", 1);
    historical.original.numeroConsecutivo = historical.original.clave.slice(21, 41);
    required(historical.informacionReferencia[0]).numero = historical.original.clave;
    required(historical.informacionReferencia[0]).fechaEmision = historical.original.fechaEmision;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => {
      throw Error("No builder age clock permitted");
    });
    try {
      expect(calculateExactNd(historical).resumenFactura.totalComprobante).toBe("11.30001");
    } finally {
      clock.mockRestore();
    }
  });
  it("agrees with independent Python Decimal delta vectors and bounds overflow/net/allocation", () => {
    const quantities = ["0.001", "1.005", "9999999999999999", "12.345"],
      prices = ["0.01500", "1.23455", "0.00001", "91.99999"],
      vectors = quantities.map((quantity, i) => ({ quantity, price: required(prices[i]) }));
    const expected = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          `import json,sys\nfrom decimal import Decimal,localcontext,ROUND_HALF_UP\nwith localcontext() as c:\n c.prec=80\n q=lambda x:x.quantize(Decimal('0.00001'),rounding=ROUND_HALF_UP)\n print(json.dumps([[str(g),str(t),str(g+t)]for v in json.load(sys.stdin)for g in[q(Decimal(v['quantity'])*Decimal(v['price']))]for t in[q(g*Decimal('0.13'))]]))`,
        ],
        { input: JSON.stringify(vectors), encoding: "utf8" },
      ),
    ) as string[][];
    vectors.forEach((v, i) => {
      const input = exactNdFixture(),
        row = required(expected[i]);
      required(input.adjustments[0]).line.cantidad = v.quantity;
      required(input.adjustments[0]).line.precioUnitario = v.price;
      required(input.medioPago[0]).totalMedioPago = required(row[2]);
      const line = required(calculateExactNd(input).detalleServicio[0]);
      expect([line.subTotal, line.impuestoNeto, line.montoTotalLinea]).toEqual(row);
    });
    const bad = exactNdFixture();
    required(bad.adjustments[0]).line.cantidad = "2";
    required(bad.adjustments[0]).line.precioUnitario = "9999999999999.99999";
    expect(() => calculateExactNd(bad)).toThrow("Exact ND monetary bound");
    const zero = exactNdFixture();
    required(zero.adjustments[0]).line.descuento = [{ codigoDescuento: "07", porcentaje: "100" }];
    expect(() => calculateExactNd(zero)).toThrow("Zero or negative net");
    expect(() =>
      calculateExactNd({
        ...exactNdFixture(),
        medioPago: [{ tipoMedioPago: "01", totalMedioPago: "0" }],
      }),
    ).toThrow("Supplied ND payment allocations must be positive");
  });
  it("supports independently allocated discounts, exact maximums and valid copied credit lexemes without an original-total ceiling", () => {
    const zeroSplit = exactNdFixture();
    zeroSplit.medioPago = [
      { tipoMedioPago: "01", totalMedioPago: "0" },
      { tipoMedioPago: "02", totalMedioPago: "11.30001" },
    ];
    expect(() => calculateExactNd(zeroSplit)).toThrow(
      "Supplied ND payment allocations must be positive",
    );
    const mismatch = exactNdFixture();
    mismatch.medioPago = [{ tipoMedioPago: "01", totalMedioPago: "1" }];
    expect(() => calculateExactNd(mismatch)).toThrow(
      "Exact ordinary ND payment allocation must equal invoice total",
    );
    const discounted = exactNdFixture();
    required(discounted.adjustments[0]).line.descuento = [
      { porcentaje: "10", codigoDescuento: "07" },
    ];
    required(discounted.medioPago[0]).totalMedioPago = "10.17001";
    expect(calculateExactNd(discounted).resumenFactura).toMatchObject({
      totalDescuentos: "1.00000",
      totalVentaNeta: "9.00001",
      totalImpuesto: "1.17000",
      totalComprobante: "10.17001",
    });
    const maximum = exactNdFixture();
    required(maximum.adjustments[0]).line.precioUnitario = "8849557522123.89380";
    required(maximum.medioPago[0]).totalMedioPago = "9999999999999.99999";
    const xml = buildExactNotaDebitoXml(JSON.parse(JSON.stringify(maximum)));
    expect(xml).toContain("<TotalComprobante>9999999999999.99999</TotalComprobante>");
    expect(
      validateAgainstXsd(xml, "NotaDebitoElectronica_V4.4.xsd", { allowMissingSignature: true })
        .errors,
    ).toBe("");
    for (const condicionVenta of ["02", "10"] as const) {
      const input = exactNdFixture();
      input.original.condicionVenta = condicionVenta;
      input.original.plazoCredito = "00030";
      expect(buildExactNotaDebitoXml(input)).toContain("<PlazoCredito>00030</PlazoCredito>");
      for (const plazoCredito of [undefined, "0", "00000"])
        expect(() =>
          calculateExactNd({ ...input, original: { ...input.original, plazoCredito } }),
        ).toThrow();
    }
  });
  it("signs genuine ND02 and validates the actual synthetic signature under native current XSD", async () => {
    const input = exactNdFixture(),
      p12 = createTestP12("synthetic-nd"),
      signed = await signXml(buildExactNotaDebitoXml(input), p12, "synthetic-nd");
    expect(validateAgainstXsd(signed, "NotaDebitoElectronica_V4.4.xsd").errors).toBe("");
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
  });
});
