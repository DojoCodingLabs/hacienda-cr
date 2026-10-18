import { createTestP12 } from "../__fixtures__/signing.js";
import { signXml } from "../signing/signer.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { createHash } from "node:crypto";
import retainedCreditFixture from "../__fixtures__/retained-fe-credit-080.json" with { type: "json" };
import { execFileSync } from "node:child_process";
import {
  FacturaElectronicaSchema,
  ExactFeInputSchema,
  RetainedExactFeInputSchema,
  ExactFeCalculatedSchema,
  type ExactFeInput,
} from "@dojocoding/hacienda-shared";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { calculateExactFe, calculateRetainedExactFe } from "../tax/exact-fe.js";
import { buildFacturaXml } from "./factura-builder.js";
import { buildExactFacturaXml } from "./exact-fe-builder.js";
import { validateAgainstXsd } from "../__testing__/xsd.js";
interface UnsafeFe {
  detalleServicio: [
    {
      precioUnitario: unknown;
      cantidad: unknown;
      exoneracion?: unknown;
      impuesto: [
        {
          tarifa: unknown;
        },
      ];
      descuento?: unknown;
    },
  ];
  otrosCargos?: unknown;
  resumenFactura?: unknown;
  emisor: {
    exoneracion?: unknown;
  };
}
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing exact FE fixture value");
  return value;
}
function input(): ExactFeInput {
  return {
    caseCode: "FE-domestic-ordinary-iva13-v1",
    clave: SIMPLE_INVOICE.clave,
    proveedorSistemas: SIMPLE_INVOICE.proveedorSistemas,
    codigoActividadEmisor: required(SIMPLE_INVOICE.codigoActividadEmisor),
    numeroConsecutivo: SIMPLE_INVOICE.numeroConsecutivo,
    fechaEmision: SIMPLE_INVOICE.fechaEmision,
    emisor: structuredClone(SIMPLE_INVOICE.emisor),
    receptor: structuredClone(SIMPLE_INVOICE.receptor),
    condicionVenta: "01",
    detalleServicio: [
      {
        numeroLinea: 1,
        codigoCabys: "8310100000000",
        cantidad: "1",
        unidadMedida: "Sp",
        detalle: "Servicio exacto sintético",
        precioUnitario: "100",
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
      },
    ],
    codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
  };
}
function oracle(cases: ExactFeInput[]) {
  return JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        `
import sys,json
from decimal import Decimal, localcontext, ROUND_HALF_UP
with localcontext() as ctx:
 ctx.prec=90
 q=Decimal('0.00001')
 def rounded(n): return n.quantize(q,rounding=ROUND_HALF_UP)
 out=[]
 for doc in json.load(sys.stdin):
  rows=[]
  for line in doc['detalleServicio']:
   gross=rounded(Decimal(line['cantidad'])*Decimal(line['precioUnitario']))
   discounts=[rounded(gross*Decimal(d['porcentaje'])/100) if 'porcentaje' in d else Decimal(d['montoDescuento']) for d in line.get('descuento',[])]
   deduction=sum(discounts,Decimal(0));net=gross-deduction;tax=rounded(net*Decimal('13')/100)
   rows.append(dict(gross=str(gross),discount=str(rounded(deduction)),net=str(rounded(net)),tax=str(tax),total=str(rounded(net+tax))))
  out.append(dict(rows=rows,total=str(rounded(sum((Decimal(r['total']) for r in rows),Decimal(0))))))
 print(json.dumps(out))
`,
      ],
      { input: JSON.stringify(cases), encoding: "utf8" },
    ),
  ) as {
    rows: {
      gross: string;
      discount: string;
      net: string;
      tax: string;
      total: string;
    }[];
    total: string;
  }[];
}
function allocate(source: ExactFeInput) {
  required(source.medioPago[0]).totalMedioPago = required(oracle([source])[0]).total;
  return source;
}
describe("additive exact ordinary FE strings → BigInt → XML", () => {
  it("round-trips source and computed JSON strings and emits deterministic exact decimal text", () => {
    const source = allocate(input());
    source.codigoTipoMoneda = { codigoMoneda: "USD", tipoCambio: "513.12345" };
    const calculated = calculateExactFe(source),
      xml = buildExactFacturaXml(source);
    expect(ExactFeInputSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    expect(ExactFeCalculatedSchema.parse(JSON.parse(JSON.stringify(calculated)))).toEqual(
      calculated,
    );
    expect(buildExactFacturaXml(JSON.parse(JSON.stringify(source)))).toBe(xml);
    expect(xml).toContain("<TotalComprobante>113.00000</TotalComprobante>");
    expect(xml).toContain("<TipoCambio>513.12345</TipoCambio>");
    expect(
      validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true }),
    ).toEqual({ valid: true, errors: "" });
  });
  it("preserves maximum schema money, smallestfraction and full quantity range without float conversion", () => {
    const cases = [input(), input(), input(), input()];
    required(required(cases[0]).detalleServicio[0]).precioUnitario = "9999999999999.99999";
    required(required(cases[0]).detalleServicio[0]).cantidad = "0.001";
    required(required(cases[1]).detalleServicio[0]).precioUnitario = "0.00001";
    required(required(cases[1]).detalleServicio[0]).cantidad = "9999999999999.999";
    required(required(cases[2]).detalleServicio[0]).precioUnitario = "0.00001";
    required(required(cases[2]).detalleServicio[0]).cantidad = "9999999999999999";
    required(required(cases[3]).detalleServicio[0]).precioUnitario = "8849557522123.89380";
    for (const source of cases) {
      allocate(source);
      const result = calculateExactFe(source),
        expected = required(oracle([source])[0]);
      expect(result.resumenFactura.totalComprobante).toBe(expected.total);
      expect(
        validateAgainstXsd(buildExactFacturaXml(source), "FacturaElectronica_V4.4.xsd", {
          allowMissingSignature: true,
        }),
      ).toEqual({ valid: true, errors: "" });
    }
    expect(calculateExactFe(required(cases[3])).resumenFactura.totalComprobante).toBe(
      "9999999999999.99999",
    );
    const tiny = input();
    required(tiny.detalleServicio[0]).precioUnitario = "0.00001";
    allocate(tiny);
    expect(buildExactFacturaXml(tiny)).toContain("<PrecioUnitario>0.00001</PrecioUnitario>");
  });
  it("matches independent Python Decimal half-up oracle across mixed service/goods, discounts and aggregate/payment facts", () => {
    const cases: ExactFeInput[] = [];
    for (let n = 1; n <= 36; n++) {
      const source = input(),
        line = required(source.detalleServicio[0]);
      line.cantidad = `${n}.137`;
      line.precioUnitario = `${7919 * n}.12345`;
      line.descuento = [{ codigoDescuento: "07", porcentaje: `${n % 31}.12501` }];
      if (n % 3 === 0)
        line.descuento.push({
          codigoDescuento: "99",
          codigoDescuentoOtros: "Descuento explícito",
          montoDescuento: "0.00001",
        });
      const second = {
        ...line,
        numeroLinea: 2,
        codigoCabys: "0123400000000",
        esServicio: false,
        descuento: undefined,
      };
      source.detalleServicio.push(second);
      cases.push(source);
    }
    const expected = oracle(cases);
    cases.forEach((source, i) => {
      required(source.medioPago[0]).totalMedioPago = required(expected[i]).total;
      const result = calculateExactFe(source);
      expect(result.resumenFactura.totalComprobante).toBe(required(expected[i]).total);
      result.detalleServicio.forEach((line, j) => {
        const row = required(required(expected[i]).rows[j]);
        expect([line.montoTotal, line.subTotal, line.impuestoNeto, line.montoTotalLinea]).toEqual([
          row.gross,
          row.net,
          row.tax,
          row.total,
        ]);
      });
    });
  });
  it("preserves explicit code99 companions and split payment text through native XML", () => {
    const source = input();
    required(source.detalleServicio[0]).descuento = [
      {
        codigoDescuento: "99",
        codigoDescuentoOtros: "Acuerdo comercial explícito",
        montoDescuento: "0.00001",
      },
    ];
    source.condicionVenta = "99";
    source.condicionVentaOtros = "Acuerdo explícito ordinario";
    const total = oracle([source])[0];
    if (!total) throw new Error("Missing oracle");
    source.medioPago = [
      { tipoMedioPago: "99", medioPagoOtros: "Medio explícito", totalMedioPago: "100" },
      { tipoMedioPago: "01", totalMedioPago: "12.99999" },
    ];
    expect(total.total).toBe("112.99999");
    const xml = buildExactFacturaXml(source);
    expect(xml).toContain("<CodigoDescuentoOTRO>Acuerdo comercial explícito</CodigoDescuentoOTRO>");
    expect(xml).not.toContain("<NaturalezaDescuento>");
    expect(
      validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true }),
    ).toEqual({ valid: true, errors: "" });
    source.condicionVenta = "02";
    delete source.condicionVentaOtros;
    source.plazoCredito = "30";
    expect(
      validateAgainstXsd(buildExactFacturaXml(source), "FacturaElectronica_V4.4.xsd", {
        allowMissingSignature: true,
      }),
    ).toEqual({ valid: true, errors: "" });
  });
  it("half ties round at gross, explicit percentage discount and per-line tax boundaries", () => {
    const gross = input();
    required(gross.detalleServicio[0]).cantidad = "0.001";
    required(gross.detalleServicio[0]).precioUnitario = "0.00500";
    allocate(gross);
    expect(required(calculateExactFe(gross).detalleServicio[0]).montoTotal).toBe("0.00001");
    const discount = input();
    required(discount.detalleServicio[0]).precioUnitario = "0.00003";
    required(discount.detalleServicio[0]).descuento = [{ codigoDescuento: "07", porcentaje: "50" }];
    allocate(discount);
    expect(
      required(required(required(calculateExactFe(discount).detalleServicio[0]).descuento)[0])
        .montoDescuento,
    ).toBe("0.00002");
    const tax = input();
    required(tax.detalleServicio[0]).precioUnitario = "0.00050";
    allocate(tax);
    expect(required(calculateExactFe(tax).detalleServicio[0]).impuestoNeto).toBe("0.00007");
  });
  it("rejects unsupported free/special cases and mismatched CABYS classification before exact XML", () => {
    for (const type of ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"]) {
      const source = input();
      expect(() =>
        buildExactFacturaXml({
          ...source,
          detalleServicio: [{ ...required(source.detalleServicio[0]), tipoTransaccion: type }],
        } as ExactFeInput),
      ).toThrow();
    }
    for (const code of ["01", "02", "03"]) {
      const source = input();
      expect(() =>
        buildExactFacturaXml({
          ...source,
          detalleServicio: [
            {
              ...required(source.detalleServicio[0]),
              descuento: [{ codigoDescuento: code, porcentaje: "10" }],
            },
          ],
        } as ExactFeInput),
      ).toThrow();
    }
    for (const mutate of [
      (line: ExactFeInput["detalleServicio"][number]) => {
        line.precioUnitario = "0";
      },
      (line: ExactFeInput["detalleServicio"][number]) => {
        line.precioUnitario = "0.00001";
        line.cantidad = "0.001";
      },
      (line: ExactFeInput["detalleServicio"][number]) => {
        line.descuento = [{ codigoDescuento: "07", porcentaje: "100" }];
      },
      (line: ExactFeInput["detalleServicio"][number]) => {
        line.esServicio = false;
      },
      (line: ExactFeInput["detalleServicio"][number]) => {
        line.codigoCabys = "0123400000000";
      },
    ]) {
      const source = input();
      mutate(required(source.detalleServicio[0]));
      expect(() => buildExactFacturaXml(source)).toThrow();
    }
    const ordinary = input(),
      line = required(ordinary.detalleServicio[0]);
    line.tipoTransaccion = "01";
    line.codigoCabys = "0123400000000";
    line.esServicio = false;
    const calculated = calculateExactFe(ordinary),
      xml = buildExactFacturaXml(ordinary);
    expect(calculated.resumenFactura.totalServGravados).toBe("0.00000");
    expect(calculated.resumenFactura.totalMercanciasGravadas).toBe("100.00000");
    expect(xml).toContain("<TipoTransaccion>01</TipoTransaccion>");
    expect(buildExactFacturaXml(input())).not.toContain("<TipoTransaccion>");
    expect(
      validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true }),
    ).toEqual({ valid: true, errors: "" });
  });
  it("rejects numeric coercion, unsupported facts, overprecision, overflow and inconsistent payment or discount intent", () => {
    for (const change of [
      (s: UnsafeFe) => (s.detalleServicio[0].precioUnitario = Number("9999999999999.99999")),
      (s: UnsafeFe) => (s.detalleServicio[0].cantidad = "1.0001"),
      (s: UnsafeFe) => (s.detalleServicio[0].cantidad = "9999999999999999.001"),
      (s: UnsafeFe) => (s.detalleServicio[0].precioUnitario = "10000000000000"),
      (s: UnsafeFe) => (s.detalleServicio[0].precioUnitario = "0.000001"),
      (s: UnsafeFe) => (s.detalleServicio[0].precioUnitario = "1e3"),
      (s: UnsafeFe) => (s.detalleServicio[0].precioUnitario = "NaN"),
      (s: UnsafeFe) => (s.detalleServicio[0].exoneracion = {}),
      (s: UnsafeFe) => (s.detalleServicio[0].impuesto[0].tarifa = "0"),
      (s: UnsafeFe) => (s.otrosCargos = []),
      (s: UnsafeFe) => (s.resumenFactura = { totalComprobante: "0" }),
      (s: UnsafeFe) => (s.emisor.exoneracion = {}),
      (s: UnsafeFe) =>
        (s.detalleServicio[0].descuento = [{ codigoDescuento: "99", montoDescuento: "1" }]),
      (s: UnsafeFe) =>
        (s.detalleServicio[0].descuento = [
          { codigoDescuento: "07", montoDescuento: "1", porcentaje: "1" },
        ]),
    ]) {
      const source = input();
      change(source as unknown as UnsafeFe);
      expect(() => buildExactFacturaXml(source)).toThrow();
    }
    const overflow = input();
    required(overflow.detalleServicio[0]).precioUnitario = "9999999999999.99999";
    expect(() => calculateExactFe(overflow)).toThrow();
    const aggregate = input();
    required(aggregate.detalleServicio[0]).precioUnitario = "5000000000000";
    aggregate.detalleServicio.push({ ...required(aggregate.detalleServicio[0]), numeroLinea: 2 });
    aggregate.medioPago = [
      { tipoMedioPago: "01", totalMedioPago: "5650000000000" },
      { tipoMedioPago: "02", totalMedioPago: "5650000000000" },
    ];
    expect(() => calculateExactFe(aggregate)).toThrow("Exact FE monetary bound exceeded");
    const excessive = input();
    required(excessive.detalleServicio[0]).descuento = [
      { codigoDescuento: "07", montoDescuento: "101" },
    ];
    expect(() => calculateExactFe(excessive)).toThrow();
    const badPayment = input();
    required(badPayment.medioPago[0]).totalMedioPago = "113.00001";
    expect(() => calculateExactFe(badPayment)).toThrow();
  });
});

describe("current exact FE credit-day contract and historical read-only custody", () => {
  for (const condicionVenta of ["02", "10"] as const) {
    it(`rejects missing/zero/overflow${condicionVenta} before exact arithmetic or XML`, () => {
      for (const plazoCredito of [undefined, "0", "00000", "100000", "-1", "1.5", "+1"]) {
        const source = { ...input(), condicionVenta, plazoCredito };
        expect(() => calculateExactFe(source)).toThrow();
        expect(() => buildExactFacturaXml(source)).toThrow();
      }
    });
    it(`preserves${condicionVenta} positive term lexemes through JSON/XML and native XSD`, () => {
      for (const plazoCredito of ["1", "00001", "00030", "99999"]) {
        const source = { ...input(), condicionVenta, plazoCredito };
        const restored = JSON.parse(JSON.stringify(source)) as ExactFeInput;
        const expected = required(oracle([restored])[0]);
        expect(calculateExactFe(restored).resumenFactura.totalComprobante).toBe(expected.total);
        const xml = buildExactFacturaXml(restored);
        expect(xml).toContain(`<PlazoCredito>${plazoCredito}</PlazoCredito>`);
        expect(
          validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", { allowMissingSignature: true })
            .valid,
        ).toBe(true);
        expect(restored.plazoCredito).toBe(plazoCredito);
      }
    });
  }
  it("preserves the legacy Number schema/builder behavior without claiming current exact readiness", () => {
    for (const condicionVenta of ["02", "10"] as const) {
      const legacy = {
        ...structuredClone(SIMPLE_INVOICE),
        condicionVenta,
        ...(condicionVenta === "02" ? { plazoCredito: "00000" } : {}),
      };
      expect(FacturaElectronicaSchema.safeParse(legacy).success).toBe(true);
      expect(buildFacturaXml(legacy)).toContain(
        `<CondicionVenta>${condicionVenta}</CondicionVenta>`,
      );
    }
  });
  it("retains signed historical bytes under structural custody without making them current emission inputs", async () => {
    const p12 = createTestP12("synthetic-history");
    try {
      for (const legacy of retainedCreditFixture.rows) {
        const signed = await signXml(legacy.xml, p12, "synthetic-history");
        const bytes = Buffer.from(signed),
          digest = createHash("sha256").update(bytes).digest("hex");
        expect((await validateDocumentXml(signed, { requireSignature: true })).valid).toBe(true);
        const retained = RetainedExactFeInputSchema.parse(legacy.source);
        expect(calculateRetainedExactFe(retained).resumenFactura.totalComprobante).toBe(
          "113.00000",
        );
        expect(() => buildExactFacturaXml(retained)).toThrow();
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(digest);
        expect(bytes.toString()).toBe(signed);
      }
    } finally {
      p12.fill(0);
    }
  });
  it("keeps independently bound old0.8 source/bytes intact without making them current builder inputs", () => {
    expect(retainedCreditFixture.producer.version).toBe("0.8.0");
    expect(retainedCreditFixture.producer.sourceCommit).toBe(
      "96012fa9abc184f78d35a96f736399f1ff1d7606",
    );
    for (const legacy of retainedCreditFixture.rows) {
      const retained = RetainedExactFeInputSchema.parse(legacy.source);
      const before = JSON.stringify(retained);
      expect(createHash("sha256").update(legacy.xml).digest("hex")).toBe(legacy.sha256);
      expect(
        validateAgainstXsd(legacy.xml, "FacturaElectronica_V4.4.xsd", {
          allowMissingSignature: true,
        }).valid,
      ).toBe(true);
      expect(calculateRetainedExactFe(retained).resumenFactura.totalComprobante).toBe(
        required(oracle([retained])[0]).total,
      );
      expect(JSON.stringify(retained)).toBe(before);
      expect(ExactFeInputSchema.safeParse(retained).success).toBe(false);
      expect(() => buildExactFacturaXml(retained)).toThrow();
    }
  });
});

describe("current FE document-family sale conditions", () => {
  it("refuses REP-only 09/11 and FEC-only 13 before calculation/XML, retaining read-only historical math", () => {
    for (const condicionVenta of ["09", "11", "13"] as const) {
      const source = { ...input(), condicionVenta };
      const before = JSON.stringify(source);
      expect(ExactFeInputSchema.safeParse(source).success).toBe(false);
      expect(() => calculateExactFe(source)).toThrow();
      expect(() => buildExactFacturaXml(source)).toThrow();
      if (condicionVenta === "13") {
        const retained = RetainedExactFeInputSchema.parse(source);
        expect(calculateRetainedExactFe(retained).resumenFactura.totalComprobante).toBe(
          required(oracle([retained])[0]).total,
        );
        const legacy = { ...SIMPLE_INVOICE, condicionVenta };
        expect(FacturaElectronicaSchema.safeParse(legacy).success).toBe(true);
        expect(buildFacturaXml(legacy)).toContain(
          `<CondicionVenta>${condicionVenta}</CondicionVenta>`,
        );
      } else {
        expect(RetainedExactFeInputSchema.safeParse(source).success).toBe(false);
        expect(
          FacturaElectronicaSchema.safeParse({ ...SIMPLE_INVOICE, condicionVenta }).success,
        ).toBe(false);
      }
      expect(JSON.stringify(source)).toBe(before);
    }
  });
  it("preserves all other valid FE sale-condition inputs", () => {
    for (const condicionVenta of [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "10",
      "12",
      "14",
      "15",
      "99",
    ] as const) {
      const source = {
        ...input(),
        condicionVenta,
        ...(["02", "10"].includes(condicionVenta) ? { plazoCredito: "00030" } : {}),
        ...(condicionVenta === "99" ? { condicionVentaOtros: "Acuerdo explícito sintético" } : {}),
      };
      expect(buildExactFacturaXml(source)).toContain(
        `<CondicionVenta>${condicionVenta}</CondicionVenta>`,
      );
    }
  });
});
