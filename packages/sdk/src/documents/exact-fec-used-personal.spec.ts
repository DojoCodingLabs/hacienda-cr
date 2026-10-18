import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  ExactFecUsedPersonalGoodsNonSubjectInputSchema,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
} from "@dojocoding/hacienda-shared";
import { exactFecUsedPersonalGoodsNonSubjectFixture as fixture } from "../__fixtures__/exact-fec-used-personal.js";
import { exactFecForeignServiceIva13Fixture } from "../__fixtures__/exact-fec-foreign-service.js";
import { buildExactFacturaCompraForeignServiceIva13Xml } from "./exact-fec-foreign-service-builder.js";
import { exactFecFixture } from "../__fixtures__/exact-fec.js";
import { buildExactFacturaCompraXml } from "./exact-fec-builder.js";
import { calculateExactFecUsedPersonalGoodsNonSubject as calculate } from "../tax/exact-fec-used-personal.js";
import { buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml as build } from "./exact-fec-used-personal-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
import { fixtureClave } from "../__fixtures__/identity.js";
function first(input: ExactFecUsedPersonalGoodsNonSubjectInput) {
  const l = input.detalleServicio[0];
  if (!l) throw Error("Missing fixture line");
  return l;
}
function oracle(input: unknown): {
  lines: { gross: string; discount: string; net: string }[];
  gross: string;
  discount: string;
  net: string;
} {
  return JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        `import json,sys
from decimal import Decimal as D, ROUND_HALF_UP, localcontext
with localcontext() as c:
 c.prec=100
 x=json.load(sys.stdin);q=D('0.00001');rows=[]
 for l in x['detalleServicio']:
  g=(D(l['cantidad'])*D(l['precioUnitario'])).quantize(q,rounding=ROUND_HALF_UP)
  d=sum(((g*D(v['porcentaje'])/100).quantize(q,rounding=ROUND_HALF_UP) if 'porcentaje' in v else D(v['montoDescuento'])) for v in l.get('descuento',[]))
  rows.append({'gross':format(g,'.5f'),'discount':format(d,'.5f'),'net':format(g-d,'.5f')})
 print(json.dumps({'lines':rows,**{k:format(sum(D(r[k]) for r in rows),'.5f') for k in ['gross','discount','net']}}))`,
      ],
      { input: JSON.stringify(input), encoding: "utf8" },
    ),
  );
}
describe("explicit non-subject used personal goods FEC", () => {
  it("preserves actual supplier06/buyer08 and tariff11 non-subject fields through native/signing without resale effects", async () => {
    const input = fixture(),
      before = JSON.stringify(input),
      xml = build(input),
      result = calculate(input);
    expect(result.resumenFactura).toMatchObject({
      totalMercNoSujeta: "100.00000",
      totalNoSujeto: "100.00000",
      totalVenta: "100.00000",
      totalImpuesto: "0.00000",
      totalComprobante: "100.00000",
    });
    expect(xml).toContain("<Tipo>06</Tipo>");
    expect(xml).toContain("<CondicionVenta>13</CondicionVenta>");
    expect(xml.replace(/>\s+</g, "><")).toContain(
      "<Codigo>01</Codigo><CodigoTarifaIVA>11</CodigoTarifaIVA><Tarifa>0</Tarifa><Monto>0.00000</Monto>",
    );
    expect(xml).toContain("<TotalMercNoSujeta>100.00000</TotalMercNoSujeta>");
    expect(xml).not.toMatch(
      /TotalGravado|TotalExento|TotalMercanciasGravadas|FactorCalculoIVA|PlazoCredito|CodigoActividadEmisor/,
    );
    expect(input.clave.slice(9, 21)).toBe(input.receptor.identificacion.numero.padStart(12, "0"));
    for (const generation of ["2024", "2026"] as const)
      expect(
        validateAgainstXsd(xml, "FacturaElectronicaCompra_V4.4.xsd", {
          allowMissingSignature: true,
          generation,
        }).errors,
      ).toBe("");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    const signed = await signXml(xml, createTestP12("used-buyer"), "used-buyer");
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("reconciles independent Decimal gross/ordinary discounts/net, multi-line allocations, USD and max18,5", () => {
    for (const amounts of [
      ["1.235", "99.99999"],
      ["0.001", "0.005"],
      ["1", "9999999999999.99999"],
    ]) {
      const input = fixture();
      const line = first(input);
      const [quantity, price] = amounts;
      if (!quantity || !price) throw Error("Missing decimal vector");
      line.cantidad = quantity;
      line.precioUnitario = price;
      line.descuento = [
        { codigoDescuento: "04", porcentaje: "1.23456" },
        { codigoDescuento: "05", montoDescuento: "0.00001" },
      ];
      if (quantity === "0.001") delete line.descuento;
      if (quantity !== "1")
        input.detalleServicio.push({ ...structuredClone(line), numeroLinea: 2 });
      const expected = oracle(input);
      input.codigoTipoMoneda = { codigoMoneda: "USD", tipoCambio: "000" };
      expect(ExactFecUsedPersonalGoodsNonSubjectInputSchema.safeParse(input).success).toBe(false);
      input.codigoTipoMoneda = { codigoMoneda: "USD", tipoCambio: "512.12345" };
      input.medioPago = [{ tipoMedioPago: "04", totalMedioPago: expected.net }];
      if (input.detalleServicio.length === 2)
        input.medioPago = expected.lines.map((r) => ({
          tipoMedioPago: "04" as const,
          totalMedioPago: r.net,
        }));
      const actual = calculate(input);
      expect(actual.resumenFactura).toMatchObject({
        totalMercNoSujeta: expected.gross,
        totalNoSujeto: expected.gross,
        totalVenta: expected.gross,
        totalDescuentos: expected.discount,
        totalVentaNeta: expected.net,
        totalComprobante: expected.net,
        totalImpuesto: "0.00000",
      });
      expect(
        actual.detalleServicio
          .map((l) => ({
            gross: l.montoTotal,
            discount: l.descuento
              ?.reduce((a, d) => a + BigInt(d.montoDescuento.replace(".", "")), 0n)
              .toString(),
            net: l.montoTotalLinea,
          }))
          .map((l) => [l.gross, l.net]),
      ).toEqual(expected.lines.map((l) => [l.gross, l.net]));
      expect(build(input)).toContain(`<TotalDescuentos>${expected.discount}</TotalDescuentos>`);
    }
  });
  it("preserves the full 18,5 net maximum and rejects product/aggregate overflow", () => {
    const input = fixture();
    const line = first(input);
    line.precioUnitario = "9999999999999.99999";
    input.medioPago = [{ tipoMedioPago: "04", totalMedioPago: line.precioUnitario }];
    expect(calculate(input).resumenFactura.totalComprobante).toBe(line.precioUnitario);
    expect(build(input)).toContain("<TotalComprobante>9999999999999.99999</TotalComprobante>");
    expect(() => calculate({ ...input, detalleServicio: [{ ...line, cantidad: "2" }] })).toThrow(
      "bound",
    );
    expect(() =>
      calculate({
        ...input,
        detalleServicio: [line, { ...line, numeroLinea: 2 }],
        medioPago: [
          { tipoMedioPago: "04", totalMedioPago: line.precioUnitario },
          { tipoMedioPago: "01", totalMedioPago: line.precioUnitario },
        ],
      }),
    ).toThrow("bound");
  });
  it("rejects implicit eligibility, tax alternatives, gifts/bonuses, source edits and inconsistent allocation", () => {
    const input = fixture(),
      l = first(input),
      r = input.informacionReferencia[0];
    if (!r) throw Error("Missing evidence");
    for (const patch of [
      { eligible: true },
      { taxPaid: true },
      { totalComprobante: "100" },
      { resalePrice: "120" },
      { plazoCredito: "30" },
      { codigoActividadEmisor: "620100" },
      { condicionVenta: "01" },
      { emisor: { ...input.emisor, identificacion: { tipo: "01", numero: "123456789" } } },
      { emisor: { ...input.emisor, otrasSenasExtranjero: "Fake foreign" } },
      { detalleServicio: [{ ...l, esServicio: true, codigoCabys: "8310100000000" }] },
      ...["01", "02", "03"].map((codigoDescuento) => ({
        detalleServicio: [{ ...l, descuento: [{ codigoDescuento, montoDescuento: "1" }] }],
      })),
      ...["08", "10"].map((codigoTarifaIVA) => ({
        detalleServicio: [{ ...l, impuesto: [{ codigo: "01", codigoTarifaIVA, tarifa: "0" }] }],
      })),
      ...["14", "16"].map((tipoDoc) => ({ informacionReferencia: [{ ...r, tipoDoc }] })),
      { informacionReferencia: [{ ...r, codigo: "11" }] },
      { informacionReferencia: [{ ...r, fechaEmision: "2026-10-19T12:00:00-06:00" }] },
      { medioPago: [{ tipoMedioPago: "04", totalMedioPago: "0" }] },
    ])
      expect(
        ExactFecUsedPersonalGoodsNonSubjectInputSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
    expect(() =>
      calculate({ ...input, medioPago: [{ tipoMedioPago: "04", totalMedioPago: "99.99999" }] }),
    ).toThrow("allocation");
    expect(() =>
      calculate({
        ...input,
        detalleServicio: [{ ...l, descuento: [{ codigoDescuento: "04", porcentaje: "100" }] }],
      }),
    ).toThrow("net line");
    const wrong = fixtureClave(
      input.fechaEmision,
      "08",
      4,
      input.emisor.identificacion.numero.replace(/\D/g, "") || "123456789",
    );
    expect(() => build({ ...input, clave: wrong, numeroConsecutivo: wrong.slice(21, 41) })).toThrow(
      "identity",
    );
  });
  it("enforces Unicode names/evidence, actual optional location and precise reference chronology", async () => {
    const input = fixture(),
      r = input.informacionReferencia[0];
    if (!r) throw Error("Missing evidence");
    input.emisor.nombre = "😀".repeat(100);
    input.receptor.nombre = "😀".repeat(3);
    input.informacionReferencia = [
      { ...r, razon: "😀".repeat(180), tipoDocOtros: "😀".repeat(100) },
    ];
    expect(() => build(input)).not.toThrow();
    for (const nombre of ["abcd", "😀".repeat(101)])
      expect(
        ExactFecUsedPersonalGoodsNonSubjectInputSchema.safeParse({
          ...input,
          emisor: { ...input.emisor, nombre },
        }).success,
      ).toBe(false);
    input.emisor.ubicacion = input.receptor.ubicacion;
    expect(build(input).split("</Emisor>")[0]).toContain("<Ubicacion>");
    input.fechaEmision = "2026-10-18T12:00:00.0000000001-06:00";
    input.informacionReferencia = [{ ...r, fechaEmision: "2026-10-18T18:00:00.0000000002+00:00" }];
    expect(ExactFecUsedPersonalGoodsNonSubjectInputSchema.safeParse(input).success).toBe(false);
  });
  it("preserves the prior ordinary FEC bytes after internal decimal/line extraction", () => {
    expect(
      createHash("sha256").update(buildExactFacturaCompraXml(exactFecFixture())).digest("hex"),
    ).toBe("671159f865148076335177ce4a1fef20a2854ceda098f5fc963215258b701d6c");
  });
  it("preserves the prior foreign-service FEC bytes after the line extraction", () => {
    expect(
      createHash("sha256")
        .update(buildExactFacturaCompraForeignServiceIva13Xml(exactFecForeignServiceIva13Fixture()))
        .digest("hex"),
    ).toBe("460fa4e52bdf670cf12c13d8d5a65d1fc45277f29af3f943954a65d4d6864986");
  });
});
