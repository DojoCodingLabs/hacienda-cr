import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { ExactFecInputSchema } from "@dojocoding/hacienda-shared";
import { exactFecFixture } from "../__fixtures__/exact-fec.js";
import { fixtureClave } from "../__fixtures__/identity.js";
import { validateDocumentIdentity } from "../xml/document-identity.js";
import { calculateExactFec } from "../tax/exact-fec.js";
import { buildExactFacturaCompraXml } from "./exact-fec-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
function required<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("Missing synthetic fact");
  return v;
}
describe("exact ordinary domestic FEC", () => {
  it("preserves actual supplier/buyer and buyer-owned08 identity through dedicated native FEC XML", async () => {
    const input = exactFecFixture(),
      before = JSON.stringify(input),
      xml = buildExactFacturaCompraXml(input);
    expect(input.emisor.identificacion.numero).not.toBe(input.receptor.identificacion.numero);
    expect(input.clave.slice(9, 21)).toBe(input.receptor.identificacion.numero.padStart(12, "0"));
    expect(xml.replace(/>\s+</g, "><")).toContain(
      `<Emisor><Nombre>${input.emisor.nombre}</Nombre>`,
    );
    expect(xml.replace(/>\s+</g, "><")).toContain(
      `<Receptor><Nombre>${input.receptor.nombre}</Nombre>`,
    );
    expect(xml).not.toContain("CodigoActividadEmisor");
    expect(xml).toContain("<CodigoActividadReceptor>620100</CodigoActividadReceptor>");
    expect(xml).not.toContain("ImpuestoAsumidoEmisorFabrica");
    expect(xml).toContain("<TipoDocIR>99</TipoDocIR>");
    expect(xml).toContain("<Numero>RECIBO-SINTETICO-0001</Numero>");
    expect(calculateExactFec(input).resumenFactura.totalComprobante).toBe("113.00000");
    for (const generation of ["2024", "2026"] as const)
      expect(
        validateAgainstXsd(xml, "FacturaElectronicaCompra_V4.4.xsd", {
          allowMissingSignature: true,
          generation,
        }).errors,
      ).toBe("");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    expect(buildExactFacturaCompraXml(input)).toBe(xml);
    const withoutEmail = structuredClone(input);
    delete withoutEmail.emisor.correoElectronico;
    const noEmailXml = buildExactFacturaCompraXml(withoutEmail);
    expect((await validateDocumentXml(noEmailXml)).valid).toBe(true);
    expect(noEmailXml.replace(/>\s+</g, "><")).not.toContain(
      `<CorreoElectronico>${input.emisor.correoElectronico}</CorreoElectronico>`,
    );
    const buyerCredential = createTestP12("synthetic-buyer");
    const signed = await signXml(xml, buyerCredential, "synthetic-buyer");
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
    expect(signed).toContain(`<Numero>${input.emisor.identificacion.numero}</Numero>`);
    expect(signed).toContain(`<Numero>${input.receptor.identificacion.numero}</Numero>`);
  });
  it("rejects supplier-owned identity, missing buyer/activity and unsupported family/tax authority", () => {
    const input = exactFecFixture();
    const wrong = fixtureClave(input.fechaEmision, "08", 4, input.emisor.identificacion.numero);
    expect(() =>
      buildExactFacturaCompraXml({
        ...input,
        clave: wrong,
        numeroConsecutivo: wrong.slice(21, 41),
      }),
    ).toThrow("Document identity validation failed");
    expect(
      validateDocumentIdentity(
        { ...input, clave: wrong, numeroConsecutivo: wrong.slice(21, 41) },
        "08",
      ),
    ).toContainEqual({
      path: "clave",
      message: "clave taxpayer must match the purchase invoice buyer (receptor)",
    });
    for (const type of ["01", "02", "03", "04", "09", "10"]) {
      const clave = fixtureClave(input.fechaEmision, type, 4, input.receptor.identificacion.numero);
      expect(() =>
        calculateExactFec({ ...input, clave, numeroConsecutivo: clave.slice(21, 41) }),
      ).toThrow();
    }
    for (const patch of [
      { receptor: undefined },
      { codigoActividadReceptor: undefined },
      { codigoActividadReceptor: "123" },
      { totalComprobante: "1" },
      { accepted: true },
      { emisor: { ...input.emisor, identificacion: { tipo: "05", numero: "FOREIGN" } } },
      {
        emisor: { ...input.emisor, identificacion: { tipo: "06", numero: "NO-CONTRIB" } },
        condicionVenta: "13",
      },
      { receptor: { ...input.receptor, otrasSenasExtranjero: "Dirección extranjera" } },
      ...["03", "08", "09", "10", "11", "12", "13", "99"].map((condicionVenta) => ({
        condicionVenta,
      })),
    ])
      expect(ExactFecInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    const special = structuredClone(input);
    required(special.detalleServicio[0]).tipoTransaccion = "02";
    expect(() => calculateExactFec(special)).toThrow();
  });
  it("requires explicit supporting evidence companions and exact chronology without inventing a legal clock", () => {
    const input = exactFecFixture(),
      base = required(input.informacionReferencia[0]);
    for (const tipoDoc of ["06", "07", "14"] as const) {
      const { tipoDocOtros, ...r } = base;
      void tipoDocOtros;
      const valid = { ...input, informacionReferencia: [{ ...r, tipoDoc }] };
      expect(buildExactFacturaCompraXml(valid)).toContain(`<TipoDocIR>${tipoDoc}</TipoDocIR>`);
    }
    for (const patch of [
      { informacionReferencia: [] },
      { informacionReferencia: Array(11).fill(base) },
      { informacionReferencia: [base, base] },
      ...[
        { numero: undefined },
        { numero: " " },
        { codigo: undefined },
        { codigo: "02" },
        { razon: "ab" },
        { razon: "😀".repeat(181) },
        { tipoDocOtros: undefined },
        { tipoDocOtros: "abcd" },
        { tipoDoc: "16" },
        { tipoDoc: "01" },
        { fechaEmision: "2026-10-18T12:00:00.0000000001-06:00" },
      ].map((r) => ({ informacionReferencia: [{ ...base, ...r }] })),
    ])
      expect(ExactFecInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    const precise = {
      ...input,
      fechaEmision: "2026-10-18T12:00:00.0000000009-06:00",
      informacionReferencia: [
        { ...base, fechaEmision: "2026-10-18T18:00:00.0000000001Z", razon: "a😀b" },
      ],
    };
    expect(buildExactFacturaCompraXml(precise)).toContain("a😀b");
    // Old reference can be source-valid without passing actual issuance-time age eligibility.
    expect(
      buildExactFacturaCompraXml({
        ...input,
        informacionReferencia: [{ ...base, fechaEmision: "2000-02-29T00:00:00Z" }],
      }),
    ).toContain("2000-02-29");
  });
  it("preserves explicit positive credit lexemes and allocations, Unicode parties and actual supplier activity", async () => {
    const input = exactFecFixture();
    input.condicionVenta = "02";
    input.plazoCredito = "00030";
    input.codigoActividadEmisor = "620100";
    input.emisor.nombre = "😀".repeat(100);
    input.receptor.nombre = "😀".repeat(100);
    input.emisor.nombreComercial = "😀".repeat(80);
    input.receptor.nombreComercial = "abc";
    const xml = buildExactFacturaCompraXml(input);
    expect(xml).toContain("<PlazoCredito>00030</PlazoCredito>");
    expect(xml).toContain("<CodigoActividadEmisor>620100</CodigoActividadEmisor>");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    for (const plazoCredito of [undefined, "0", "00000", "100000", "-1"])
      expect(() => calculateExactFec({ ...input, plazoCredito })).toThrow();
    for (const [party, field, value] of [
      ["emisor", "nombre", "abcd"],
      ["receptor", "nombre", "ab"],
      ["emisor", "nombreComercial", "ab"],
      ["receptor", "nombreComercial", "ab"],
      ["emisor", "nombre", "😀".repeat(101)],
      ["receptor", "nombre", "😀".repeat(101)],
    ] as const) {
      const bad = structuredClone(input);
      bad[party][field] = value;
      expect(() => calculateExactFec(bad)).toThrow();
    }
    expect(() =>
      calculateExactFec({
        ...input,
        medioPago: [
          { tipoMedioPago: "01", totalMedioPago: "0" },
          { tipoMedioPago: "02", totalMedioPago: "113" },
        ],
      }),
    ).toThrow("positive");
    expect(() =>
      calculateExactFec({ ...input, medioPago: [{ tipoMedioPago: "01", totalMedioPago: "1" }] }),
    ).toThrow("allocation");
  });
  it("matches independent Decimal purchase totals at fractional/max bounds with real goods/service aggregation", () => {
    const vectors = [
      { q: "0.001", p: "0.01500" },
      { q: "1.005", p: "1.23455" },
      { q: "9999999999999999", p: "0.00001" },
      { q: "12.345", p: "91.99999" },
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
      const input = exactFecFixture(),
        line = required(input.detalleServicio[0]),
        e = required(expected[i]);
      line.cantidad = v.q;
      line.precioUnitario = v.p;
      required(input.medioPago[0]).totalMedioPago = required(e[2]);
      const actual = required(calculateExactFec(input).detalleServicio[0]);
      expect([actual.subTotal, actual.impuestoNeto, actual.montoTotalLinea]).toEqual(e);
    });
    const input = exactFecFixture();
    input.codigoTipoMoneda = { codigoMoneda: "USD", tipoCambio: "501.00001" };
    const first = required(input.detalleServicio[0]);
    first.descuento = [{ codigoDescuento: "07", porcentaje: "10" }];
    input.detalleServicio.push({
      ...structuredClone(first),
      numeroLinea: 2,
      codigoCabys: "4321000000000",
      esServicio: false,
    });
    input.medioPago = [
      { tipoMedioPago: "01", totalMedioPago: "100" },
      { tipoMedioPago: "02", totalMedioPago: "103.40000" },
    ];
    expect(calculateExactFec(input).resumenFactura).toMatchObject({
      totalServGravados: "100.00000",
      totalMercanciasGravadas: "100.00000",
      totalDescuentos: "20.00000",
      totalImpuesto: "23.40000",
      totalComprobante: "203.40000",
    });
    first.precioUnitario = "9999999999999.99999";
    first.cantidad = "2";
    expect(() => calculateExactFec(input)).toThrow("Exact FEC monetary bound");
  });
});
