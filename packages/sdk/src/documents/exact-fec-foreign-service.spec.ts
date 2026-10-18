import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { ExactFecForeignServiceIva13InputSchema } from "@dojocoding/hacienda-shared";
import { exactFecForeignServiceIva13Fixture } from "../__fixtures__/exact-fec-foreign-service.js";
import { exactFecFixture } from "../__fixtures__/exact-fec.js";
import { fixtureClave } from "../__fixtures__/identity.js";
import { calculateExactFecForeignServiceIva13 } from "../tax/exact-fec-foreign-service.js";
import { buildExactFacturaCompraForeignServiceIva13Xml } from "./exact-fec-foreign-service-builder.js";
import { buildExactFacturaCompraXml } from "./exact-fec-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
function required<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("Missing synthetic source");
  return v;
}
describe("explicit foreign-service ordinary IVA13 purchase source", () => {
  it("retains exact supplier05/buyer08/reference16+reason11 and dedicated foreign address through both native schemas", async () => {
    const input = exactFecForeignServiceIva13Fixture(),
      before = JSON.stringify(input),
      xml = buildExactFacturaCompraForeignServiceIva13Xml(input);
    expect(calculateExactFecForeignServiceIva13(input).resumenFactura.totalComprobante).toBe(
      "113.00000",
    );
    expect(xml).toContain("<Tipo>05</Tipo>");
    expect(xml).toContain(`<Numero>${input.emisor.identificacion.numero}</Numero>`);
    expect(xml).toContain(
      `<OtrasSenasExtranjero>${input.emisor.otrasSenasExtranjero}</OtrasSenasExtranjero>`,
    );
    expect(xml).toContain(`<Numero>${input.receptor.identificacion.numero}</Numero>`);
    expect(xml).toContain("<TipoDocIR>16</TipoDocIR>");
    expect(xml).toContain("<Codigo>11</Codigo>");
    expect(input.clave.slice(9, 21)).toBe(input.receptor.identificacion.numero.padStart(12, "0"));
    expect(xml).not.toContain("CodigoActividadEmisor");
    expect(xml).not.toContain("ImpuestoAsumidoEmisorFabrica");
    const supplierXml = required(xml.split("</Emisor>")[0]);
    expect(supplierXml).not.toContain("Ubicacion");
    for (const generation of ["2024", "2026"] as const)
      expect(
        validateAgainstXsd(xml, "FacturaElectronicaCompra_V4.4.xsd", {
          allowMissingSignature: true,
          generation,
        }).errors,
      ).toBe("");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    const signed = await signXml(
      xml,
      createTestP12("synthetic-buyer-credential"),
      "synthetic-buyer-credential",
    );
    expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
  });
  it("rejects inferred regimes, missing address/reference, wrong parties, unsupported goods/intangibles and source rewrites", () => {
    const input = exactFecForeignServiceIva13Fixture(),
      line = required(input.detalleServicio[0]),
      ref = input.informacionReferencia[0];
    for (const patch of [
      { caseCode: "FEC-domestic-ordinary-iva13-v1" },
      { eligible: true },
      { taxPaid: true },
      { creditable: true },
      { codigoActividadEmisor: "620100" },
      { emisor: { ...input.emisor, ubicacion: input.receptor.ubicacion } },
      { emisor: { ...input.emisor, otrasSenasExtranjero: undefined } },
      { emisor: { ...input.emisor, identificacion: { tipo: "06", numero: "NOCONTRIB" } } },
      { receptor: { ...input.receptor, identificacion: { tipo: "05", numero: "OTHERBUYER" } } },
      { informacionReferencia: [] },
      { informacionReferencia: [{ ...ref, tipoDoc: "99" }] },
      { informacionReferencia: [{ ...ref, codigo: "04" }] },
      { detalleServicio: [{ ...line, esServicio: false, codigoCabys: "4321000000000" }] },
      {
        detalleServicio: [
          { ...line, impuesto: [{ codigo: "01", codigoTarifaIVA: "11", tarifa: "0" }] },
        ],
      },
      { condicionVenta: "13" },
      { condicionVenta: "10" },
      {
        medioPago: [
          { tipoMedioPago: "01", totalMedioPago: "0" },
          { tipoMedioPago: "04", totalMedioPago: "113" },
        ],
      },
    ])
      expect(ExactFecForeignServiceIva13InputSchema.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
    const wrong = fixtureClave(input.fechaEmision, "08", 4, "3109999999");
    expect(() =>
      calculateExactFecForeignServiceIva13({
        ...input,
        clave: wrong,
        numeroConsecutivo: wrong.slice(21, 41),
      }),
    ).toThrow("identity");
    expect(() => buildExactFacturaCompraXml(input)).toThrow(); // No old API silently changes family/case.
  });
  it("requires explicit positive credit days and preserves actual optional fields and Unicode text without normalization", () => {
    const input = exactFecForeignServiceIva13Fixture();
    input.condicionVenta = "02";
    for (const plazoCredito of [undefined, "0", "00000", "100000"])
      expect(
        ExactFecForeignServiceIva13InputSchema.safeParse({ ...input, plazoCredito }).success,
      ).toBe(false);
    input.plazoCredito = "00030";
    input.emisor.nombre = "😀".repeat(100);
    input.emisor.otrasSenasExtranjero = "😀".repeat(300);
    input.emisor.nombreComercial = "a😀b";
    input.emisor.telefono = { codigoPais: "1", numTelefono: "5551234567" };
    delete input.emisor.correoElectronico;
    const xml = buildExactFacturaCompraForeignServiceIva13Xml(input);
    expect(xml).toContain("<PlazoCredito>00030</PlazoCredito>");
    expect(xml).toContain(input.emisor.otrasSenasExtranjero);
    expect(xml).toContain("<CodigoPais>1</CodigoPais>");
    expect(
      validateAgainstXsd(xml, "FacturaElectronicaCompra_V4.4.xsd", { allowMissingSignature: true })
        .valid,
    ).toBe(true);
    for (const [field, value] of [
      ["nombre", "abcd"],
      ["nombre", "😀".repeat(101)],
      ["nombreComercial", "ab"],
      ["otrasSenasExtranjero", "abcd"],
      ["otrasSenasExtranjero", "😀".repeat(301)],
    ] as const)
      expect(
        ExactFecForeignServiceIva13InputSchema.safeParse({
          ...input,
          emisor: { ...input.emisor, [field]: value },
        }).success,
      ).toBe(false);
    for (const numero of ["", "A".repeat(21), "A-123", " 123 "])
      expect(
        ExactFecForeignServiceIva13InputSchema.safeParse({
          ...input,
          emisor: { ...input.emisor, identificacion: { tipo: "05", numero } },
        }).success,
      ).toBe(false);
  });
  it("preserves exact chronology and actual reference lexemes without inventing legal-age eligibility", () => {
    const input = exactFecForeignServiceIva13Fixture();
    input.fechaEmision = "2026-10-18T12:00:00.0000000001-06:00";
    input.informacionReferencia[0].fechaEmision = "2026-10-18T18:00:00.0000000009Z";
    expect(() => calculateExactFecForeignServiceIva13(input)).toThrow("postdate");
    input.fechaEmision = "2026-10-18T12:00:00.0000000009-06:00";
    input.informacionReferencia[0].razon = "a😀b";
    expect(buildExactFacturaCompraForeignServiceIva13Xml(input)).toContain(
      `<FechaEmisionIR>${input.informacionReferencia[0].fechaEmision}</FechaEmisionIR>`,
    );
    input.informacionReferencia[0].razon = "ab";
    expect(() => calculateExactFecForeignServiceIva13(input)).toThrow();
    input.informacionReferencia[0].razon = "😀".repeat(181);
    expect(() => calculateExactFecForeignServiceIva13(input)).toThrow();
  });
  it("uses the independent Decimal oracle for explicit taxable service values without Number coercion or source mutation", () => {
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
          `import sys,json\nfrom decimal import Decimal,localcontext,ROUND_HALF_UP\nwith localcontext() as c:\n c.prec=80\n q=lambda x:x.quantize(Decimal('0.00001'),rounding=ROUND_HALF_UP)\n print(json.dumps([[str(g),str(t),str(g+t)] for v in json.load(sys.stdin) for g in[q(Decimal(v['q'])*Decimal(v['p']))] for t in[q(g*Decimal('0.13'))]]))`,
        ],
        { input: JSON.stringify(vectors), encoding: "utf8" },
      ),
    ) as string[][];
    vectors.forEach((v, i) => {
      const input = exactFecForeignServiceIva13Fixture(),
        line = required(input.detalleServicio[0]),
        wanted = required(expected[i]);
      line.cantidad = v.q;
      line.precioUnitario = v.p;
      input.medioPago = [{ tipoMedioPago: "04", totalMedioPago: required(wanted[2]) }];
      const before = JSON.stringify(input),
        actual = required(calculateExactFecForeignServiceIva13(input).detalleServicio[0]);
      expect([actual.subTotal, actual.impuestoNeto, actual.montoTotalLinea]).toEqual(wanted);
      expect(JSON.stringify(input)).toBe(before);
    });
    const bad = exactFecForeignServiceIva13Fixture();
    required(bad.detalleServicio[0]).cantidad = "2";
    required(bad.detalleServicio[0]).precioUnitario = "9999999999999.99999";
    expect(() => calculateExactFecForeignServiceIva13(bad)).toThrow("monetary bound");
  });
  it("preserves the approved ordinary domestic FEC byte golden after internal monetary projection extraction", () => {
    const xml = buildExactFacturaCompraXml(exactFecFixture());
    expect(createHash("sha256").update(xml).digest("hex")).toBe(
      "671159f865148076335177ce4a1fef20a2854ceda098f5fc963215258b701d6c",
    );
  });
});
