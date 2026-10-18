import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { ExactTeInputSchema, ExactFeInputSchema } from "@dojocoding/hacienda-shared";
import { exactTeFixture } from "../__fixtures__/exact-te.js";
import { TIQUETE_WITH_RECEPTOR } from "../__fixtures__/document-fixtures.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { buildExactTiqueteXml } from "./exact-te-builder.js";
import { calculateExactTe } from "../tax/exact-te.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { signXml } from "../signing/signer.js";

function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error("Missing synthetic fixture value");
  return value;
}
describe("exact ordinary TE", () => {
  it("preserves absent, named-unidentified and identified actual receiver through genuine TE native XML", async () => {
    for (const receptor of [
      undefined,
      { nombre: "Persona consumidora real" },
      TIQUETE_WITH_RECEPTOR.receptor,
    ]) {
      const source = ExactTeInputSchema.parse({
        ...exactTeFixture(),
        ...(receptor ? { receptor: structuredClone(receptor) } : {}),
      });
      const before = JSON.stringify(source),
        xml = buildExactTiqueteXml(JSON.parse(before));
      expect(xml).toContain(
        '<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico"',
      );
      expect(xml.includes("<Receptor>")).toBe(!!receptor);
      expect(xml.includes("<Identificacion>")).toBe(true); // Actual issuer always exists.
      expect(xml).not.toContain("CodigoActividadReceptor");
      expect(xml).toContain("<TotalComprobante>113.00001</TotalComprobante>");
      for (const generation of ["2024", "2026"] as const)
        expect(
          validateAgainstXsd(xml, "TiqueteElectronico_V4.4.xsd", {
            allowMissingSignature: true,
            generation,
          }).errors,
        ).toBe("");
      expect((await validateDocumentXml(xml)).valid).toBe(true);
      expect(JSON.stringify(source)).toBe(before);
      expect(buildExactTiqueteXml(source)).toBe(xml);
    }
    expect(
      ExactFeInputSchema.safeParse({
        ...exactTeFixture(),
        caseCode: "FE-domestic-ordinary-iva13-v1",
      }).success,
    ).toBe(false);
  });
  it("checks actual TE identity instead of merely changing a FE root", () => {
    const source = exactTeFixture();
    for (const patch of [
      { numeroConsecutivo: source.numeroConsecutivo.replace("04", "01") },
      { clave: source.clave.slice(0, 9) + "003109999999" + source.clave.slice(21) },
      { fechaEmision: "2025-01-01T00:00:00-06:00" },
      { numeroConsecutivo: "00000000040000000001" },
    ]) {
      expect(() => calculateExactTe({ ...source, ...patch })).toThrow();
      expect(() => buildExactTiqueteXml({ ...source, ...patch })).toThrow();
    }
  });
  it("rejects unsupported fiscal facts and precomputed/FE-only fields instead of discarding them", () => {
    const source = exactTeFixture();
    const invalid: unknown[] = [
      { ...source, codigoActividadReceptor: "620100" },
      { ...source, resumenFactura: { totalComprobante: "0" } },
      { ...source, informacionReferencia: [] },
      { ...source, receptor: {} },
      {
        ...source,
        receptor: { nombre: "Real", identificacion: { tipo: "05", numero: "FOREIGN" } },
      },
      { ...source, receptor: { nombre: "Real", otrasSenasExtranjero: "Dirección extranjera" } },
      { ...source, detalleServicio: [{ ...source.detalleServicio[0], precioUnitario: 100 }] },
      { ...source, detalleServicio: [{ ...source.detalleServicio[0], esServicio: false }] },
      { ...source, detalleServicio: [{ ...source.detalleServicio[0], tipoTransaccion: "02" }] },
      {
        ...source,
        detalleServicio: [
          {
            ...source.detalleServicio[0],
            descuento: [{ montoDescuento: "1", codigoDescuento: "01" }],
          },
        ],
      },
      { ...source, codigoTipoMoneda: { codigoMoneda: "EUR", tipoCambio: "1" } },
    ];
    for (const input of invalid) expect(ExactTeInputSchema.safeParse(input).success).toBe(false);
    for (const condition of ["09", "11", "12", "13"])
      expect(ExactTeInputSchema.safeParse({ ...source, condicionVenta: condition }).success).toBe(
        false,
      );
    for (const condition of ["02", "10"] as const) {
      for (const days of [undefined, "0", "00000", "100000"])
        expect(
          ExactTeInputSchema.safeParse({ ...source, condicionVenta: condition, plazoCredito: days })
            .success,
        ).toBe(false);
      for (const days of ["1", "00030", "99999"]) {
        const input = { ...source, condicionVenta: condition, plazoCredito: days };
        expect(buildExactTiqueteXml(input)).toContain(`<PlazoCredito>${days}</PlazoCredito>`);
      }
    }
  });
  it("matches independent Python Decimal gross/discount/tax boundaries and mixed-line aggregates", () => {
    const vectors = Array.from({ length: 24 }, (_, i) => ({
      quantity: required(["0.001", "1.005", "999.999", "12.345"][i % 4]),
      price: required(["0.01500", "1.23455", "100.00001", "91.99999"][Math.floor(i / 4) % 4]),
      discount: i % 2 ? "3.12345" : "0",
    }));
    const oracle = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          `import json,sys\nfrom decimal import Decimal,localcontext,ROUND_HALF_UP\nwith localcontext() as c:\n c.prec=80\n def q(x):return x.quantize(Decimal('0.00001'),rounding=ROUND_HALF_UP)\n rows=[]\n for v in json.load(sys.stdin):\n  g=q(Decimal(v['quantity'])*Decimal(v['price']));d=q(g*Decimal(v['discount'])/100);n=g-d;t=q(n*Decimal('0.13'));rows.append([str(g),str(d),str(n),str(t),str(n+t)])\n print(json.dumps(rows))`,
        ],
        { input: JSON.stringify(vectors), encoding: "utf8" },
      ),
    ) as string[][];
    vectors.forEach((v, i) => {
      const expected = required(oracle[i]);
      const source = exactTeFixture();
      required(source.detalleServicio[0]).cantidad = v.quantity;
      required(source.detalleServicio[0]).precioUnitario = v.price;
      if (v.discount !== "0")
        required(source.detalleServicio[0]).descuento = [
          { porcentaje: v.discount, codigoDescuento: "07" },
        ];
      required(source.medioPago[0]).totalMedioPago = required(expected[4]);
      const result = calculateExactTe(source),
        line = required(result.detalleServicio[0]);
      expect([
        line.montoTotal,
        line.descuento?.[0]?.montoDescuento ?? "0.00000",
        line.subTotal,
        line.impuestoNeto,
        line.montoTotalLinea,
      ]).toEqual(expected);
    });
    const mixed = exactTeFixture();
    mixed.detalleServicio.push({
      ...required(mixed.detalleServicio[0]),
      numeroLinea: 2,
      esServicio: false,
      codigoCabys: "4321000000000",
    });
    mixed.medioPago = [
      { tipoMedioPago: "01", totalMedioPago: "100.00000" },
      { tipoMedioPago: "02", totalMedioPago: "126.00002" },
    ];
    expect(calculateExactTe(mixed).resumenFactura).toMatchObject({
      totalServGravados: "100.00001",
      totalMercanciasGravadas: "100.00001",
      totalComprobante: "226.00002",
    });
  });
  it("retains maximum exact text through JSON/XML and rejects allocation/overflow/zero-net", () => {
    const source = exactTeFixture();
    required(source.detalleServicio[0]).precioUnitario = "8849557522123.89380";
    required(source.medioPago[0]).totalMedioPago = "9999999999999.99999";
    const xml = buildExactTiqueteXml(JSON.parse(JSON.stringify(source)));
    expect(xml).toContain("<TotalComprobante>9999999999999.99999</TotalComprobante>");
    expect(calculateExactTe(source).resumenFactura.totalComprobante).toBe("9999999999999.99999");
    expect(() =>
      calculateExactTe({ ...source, medioPago: [{ tipoMedioPago: "01", totalMedioPago: "0" }] }),
    ).toThrow("Supplied payment allocation must be positive");
    const overflow = exactTeFixture();
    required(overflow.detalleServicio[0]).cantidad = "2";
    required(overflow.detalleServicio[0]).precioUnitario = "9999999999999.99999";
    expect(() => calculateExactTe(overflow)).toThrow("monetary bound");
    const zero = exactTeFixture();
    required(zero.detalleServicio[0]).descuento = [{ porcentaje: "100", codigoDescuento: "07" }];
    expect(() => calculateExactTe(zero)).toThrow("Zero or negative net");
  });
  it("signs actual exact TE without altering the source and passes native signature-required XSD", async () => {
    const source = exactTeFixture(),
      before = createHash("sha256").update(JSON.stringify(source)).digest("hex"),
      p12 = createTestP12("synthetic-te");
    const signed = await signXml(buildExactTiqueteXml(source), p12, "synthetic-te");
    expect(validateAgainstXsd(signed, "TiqueteElectronico_V4.4.xsd").errors).toBe("");
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
    expect(createHash("sha256").update(JSON.stringify(source)).digest("hex")).toBe(before);
  });
});
