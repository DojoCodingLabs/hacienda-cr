import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExactNcTotalInputSchema, type ExactNcTotalInput } from "@dojocoding/hacienda-shared";
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
import { fixtureClave } from "../__fixtures__/identity.js";
import { calculateExactNcTotal } from "../tax/exact-nc.js";
import { calculateExactFe } from "../tax/exact-fe.js";
import { buildExactFacturaXml } from "./exact-fe-builder.js";
import { buildExactNotaCreditoTotalXml } from "./exact-nc-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
import { signXml } from "../signing/signer.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing NC test value");
  return value;
}

const xsd = (xml: string) =>
  validateAgainstXsd(xml, "NotaCreditoElectronica_V4.4.xsd", {
    allowMissingSignature: true,
    generation: "2026",
  });
it("full credit preserves exact positive original facts/JSON and separate FE/NC identities without mutating source", () => {
  const input = exactNcFixture(),
    before = JSON.stringify(input);
  const result = calculateExactNcTotal(input);
  expect(result).toEqual(calculateExactFe(input.original));
  expect(result.resumenFactura.totalComprobante).toBe("113.00000");
  const xml = buildExactNotaCreditoTotalXml(input);
  expect(xml).toContain("<TipoDocIR>01</TipoDocIR>");
  expect(xml).toContain(`<Numero>${input.original.clave}</Numero>`);
  expect(xml).toContain(`<FechaEmisionIR>${input.original.fechaEmision}</FechaEmisionIR>`);
  expect(xml).toContain("<Codigo>01</Codigo>");
  expect(xml).toContain("<TotalComprobante>113.00000</TotalComprobante>");
  expect(buildExactNotaCreditoTotalXml(JSON.parse(before))).toBe(xml);
  expect(JSON.stringify(input)).toBe(before);
  expect(buildExactFacturaXml(input.original)).not.toContain("InformacionReferencia");
  expect(xsd(xml).valid).toBe(true);
});
it("strict single FE reference binds its exact original clave/date and explicit nonblank reason", () => {
  const source = exactNcFixture(),
    reference = source.informacionReferencia[0];
  for (const invalid of [
    { ...source, informacionReferencia: [] },
    { ...source, informacionReferencia: [reference, reference] },
    { ...source, informacionReferencia: [{ ...reference, tipoDoc: "10" }] },
    { ...source, informacionReferencia: [{ ...reference, codigo: "16" }] },
    { ...source, informacionReferencia: [{ ...reference, numero: source.clave }] },
    { ...source, informacionReferencia: [{ ...reference, numero: undefined }] },
    { ...source, informacionReferencia: [{ ...reference, fechaEmision: "2026-10-17T12:00:00Z" }] },
    { ...source, informacionReferencia: [{ ...reference, razon: "" }] },
    { ...source, informacionReferencia: [{ ...reference, razon: "   " }] },
    { ...source, informacionReferencia: [{ ...reference, razon: "a".repeat(181) }] },
    { ...source, informacionReferencia: [{ ...reference, codigoOtros: "ignored" }] },
  ])
    expect(ExactNcTotalInputSchema.safeParse(invalid).success).toBe(false);
});
it("no editable NC amount, coercion, unsupported currency/regime or independent party projection is accepted", () => {
  const source = exactNcFixture();
  for (const invalid of [
    { ...source, total: "113" },
    { ...source, resumenFactura: { totalComprobante: "113" } },
    { ...source, emisor: source.original.emisor },
    {
      ...source,
      original: {
        ...source.original,
        detalleServicio: [{ ...source.original.detalleServicio[0], precioUnitario: 100 }],
      },
    },
    {
      ...source,
      original: {
        ...source.original,
        codigoTipoMoneda: { codigoMoneda: "EUR", tipoCambio: "550" },
      },
    },
    { ...source, original: { ...source.original, otrosCargos: [] } },
    {
      ...source,
      original: {
        ...source.original,
        detalleServicio: [{ ...source.original.detalleServicio[0], cantidad: "-1" }],
      },
    },
  ])
    expect(ExactNcTotalInputSchema.safeParse(invalid).success).toBe(false);
});
it("calculator rejects mismatched original or NC identity and credits dated before the original", () => {
  for (const type of ["01", "02", "04"]) {
    const input = exactNcFixture();
    input.clave = fixtureClave(input.fechaEmision, type, 2);
    input.numeroConsecutivo = input.clave.slice(21, 41);
    expect(() => calculateExactNcTotal(input)).toThrow();
  }
  const originalMismatch = exactNcFixture();
  originalMismatch.original.numeroConsecutivo = "00100001010000000999";
  expect(() => calculateExactNcTotal(originalMismatch)).toThrow();
  const earlier = exactNcFixture();
  earlier.fechaEmision = "2020-01-01T12:00:00-06:00";
  earlier.clave = fixtureClave(earlier.fechaEmision, "03", 2);
  earlier.numeroConsecutivo = earlier.clave.slice(21, 41);
  expect(ExactNcTotalInputSchema.safeParse(earlier).success).toBe(false);
});
it("independent Python Decimal preserves full-credit rounding, five-place money and large quantities in CRC/USD", () => {
  const cases: ExactNcTotalInput[] = [];
  for (const [index, price] of [
    "0.00001",
    "0.00005",
    "0.99999",
    "100.12345",
    "8849557522123.89380",
  ].entries()) {
    for (const currency of ["CRC", "USD"] as const) {
      const input = exactNcFixture();
      input.original.codigoTipoMoneda = {
        codigoMoneda: currency,
        tipoCambio: currency === "CRC" ? "1" : "513.12345",
      };
      input.original.detalleServicio[0].precioUnitario = price;
      if (index === 3)
        input.original.detalleServicio[0].descuento = [
          { codigoDescuento: "04", porcentaje: "6.25" },
        ];
      cases.push(input);
    }
  }
  const big = exactNcFixture();
  big.original.detalleServicio[0].cantidad = "9999999999999999";
  big.original.detalleServicio[0].precioUnitario = "0.00001";
  cases.push(big);
  const totals = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        `
import sys,json
from decimal import Decimal,localcontext,ROUND_HALF_UP
with localcontext() as c:
 c.prec=90
 q=Decimal('0.00001');r=lambda x:x.quantize(q,rounding=ROUND_HALF_UP)
 values=[]
 for nc in json.load(sys.stdin):
  l=nc['original']['detalleServicio'][0];g=r(Decimal(l['cantidad'])*Decimal(l['precioUnitario']))
  d=sum((r(g*Decimal(x['porcentaje'])/100) if 'porcentaje' in x else Decimal(x['montoDescuento']) for x in l.get('descuento',[])),Decimal(0))
  n=g-d;t=r(n*Decimal(13)/100);values.append(dict(gross=str(g),net=str(r(n)),tax=str(t),total=str(r(n+t))))
 print(json.dumps(values))
`,
      ],
      { input: JSON.stringify(cases), encoding: "utf8" },
    ),
  ) as { gross: string; net: string; tax: string; total: string }[];
  cases.forEach((input, index) => {
    const expected = required(totals[index]);
    required(input.original.medioPago[0]).totalMedioPago = expected.total;
    const result = calculateExactNcTotal(input),
      line = required(result.detalleServicio[0]);
    expect([
      line.montoTotal,
      line.subTotal,
      line.impuestoNeto,
      result.resumenFactura.totalComprobante,
    ]).toEqual([expected.gross, expected.net, expected.tax, expected.total]);
    expect(xsd(buildExactNotaCreditoTotalXml(input)).valid).toBe(true);
  });
  expect(required(totals.at(-1)).total).toBe("112999999999.99999");
});
it("native NC XSD enforces reference1..10 and Unicode reason max180; named case is deliberately narrower", () => {
  const input = exactNcFixture();
  input.informacionReferencia[0].razon = "😀".repeat(180);
  const xml = buildExactNotaCreditoTotalXml(input);
  expect(xsd(xml).valid).toBe(true);
  const reference = required(
    xml.match(/<InformacionReferencia>[\s\S]*?<\/InformacionReferencia>/),
  )[0];
  expect(xsd(xml.replace(reference, "")).valid).toBe(false);
  expect(xsd(xml.replace(reference, reference.repeat(10))).valid).toBe(true);
  expect(xsd(xml.replace(reference, reference.repeat(11))).valid).toBe(false);
  expect(xsd(xml.replace("😀".repeat(180), "😀".repeat(181))).valid).toBe(false);
  // Official Razon is optional, no minLength: API requires it for this case.
  expect(xsd(xml.replace(/<Razon>[\s\S]*?<\/Razon>/, "<Razon/>")).valid).toBe(true);
});
it("actual synthetic signature on exact NC passes native official XSD and installed offline validation", async () => {
  const directory = mkdtempSync(join(tmpdir(), "exact-nc-sign-"));
  let material: Buffer | undefined;
  try {
    const key = join(directory, "key.pem"),
      cert = join(directory, "cert.pem"),
      p12 = join(directory, "cert.p12");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        key,
        "-out",
        cert,
        "-days",
        "1",
        "-subj",
        "/CN=Synthetic exact NC only",
        "-addext",
        "basicConstraints=critical,CA:FALSE",
      ],
      { stdio: "pipe" },
    );
    execFileSync(
      "openssl",
      [
        "pkcs12",
        "-export",
        "-legacy",
        "-inkey",
        key,
        "-in",
        cert,
        "-out",
        p12,
        "-passout",
        "pass:synthetic",
      ],
      { stdio: "pipe" },
    );
    material = readFileSync(p12);
    const signed = await signXml(
      buildExactNotaCreditoTotalXml(exactNcFixture()),
      material,
      "synthetic",
    );
    expect(xsd(signed).valid).toBe(true);
    const validation = await validateDocumentXml(signed, { requireSignature: true });
    expect(validation.valid).toBe(true);
    expect(validation.hasSignature).toBe(true);
  } finally {
    material?.fill(0);
    rmSync(directory, { recursive: true, force: true });
  }
});
