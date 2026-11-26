/**
 * Exact-family discount cascade (Anexos v4.4): each discount applies to the
 * base remaining after the previous one, percentages rounded HALF_UP to five
 * decimals. The read-only retained calculator keeps its frozen gross-based
 * rule and its cumulative zero-net guard.
 *
 * Expected values are hand-computed, independent of both the kernel and the
 * Decimal oracles used elsewhere.
 */
import { describe, expect, it } from "vitest";
import {
  RetainedExactFeInputSchema,
  type ExactFeInput,
  type ExactTeInput,
  type ExactFecInput,
  type ExactFecForeignServiceIva13Input,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
  type ExactNcTotalInput,
  type ExactNcPartialInput,
  type ExactNdInput,
  type ExactFeReplacementInput,
} from "@dojocoding/hacienda-shared";
import {
  applyDiscounts,
  applyFrozenGrossDiscounts,
  type ExactDiscountEntry,
} from "./exact-decimal.js";
import * as taxBarrel from "./index.js";
import { calculateExactFe, calculateRetainedExactFe } from "./exact-fe.js";
import { calculateExactTe } from "./exact-te.js";
import { calculateExactFec } from "./exact-fec.js";
import { calculateExactFecForeignServiceIva13 } from "./exact-fec-foreign-service.js";
import { calculateExactFecUsedPersonalGoodsNonSubject } from "./exact-fec-used-personal.js";
import { calculateExactNcTotal } from "./exact-nc.js";
import { calculateExactNcPartial } from "./exact-nc-partial.js";
import { calculateExactNd } from "./exact-nd.js";
import { calculateExactFeReplacement } from "./exact-fe-replacement.js";
import { buildExactFacturaXml } from "../documents/exact-fe-builder.js";
import { buildExactTiqueteXml } from "../documents/exact-te-builder.js";
import { buildExactFacturaCompraXml } from "../documents/exact-fec-builder.js";
import { buildExactFacturaCompraForeignServiceIva13Xml } from "../documents/exact-fec-foreign-service-builder.js";
import { buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml } from "../documents/exact-fec-used-personal-builder.js";
import { buildExactNotaCreditoTotalXml } from "../documents/exact-nc-builder.js";
import { buildExactNotaCreditoPartialXml } from "../documents/exact-nc-partial-builder.js";
import { buildExactNotaDebitoXml } from "../documents/exact-nd-builder.js";
import { buildExactFacturaReplacementXml } from "../documents/exact-fe-replacement-builder.js";
import {
  validateAgainstXsd,
  SCHEMA_GENERATIONS,
  type SchemaGeneration,
} from "../__testing__/xsd.js";
import { exactNcFixture } from "../__fixtures__/exact-nc.js";
import { exactTeFixture } from "../__fixtures__/exact-te.js";
import { exactFecFixture } from "../__fixtures__/exact-fec.js";
import { exactFecForeignServiceIva13Fixture } from "../__fixtures__/exact-fec-foreign-service.js";
import { exactFecUsedPersonalGoodsNonSubjectFixture } from "../__fixtures__/exact-fec-used-personal.js";
import { exactNdFixture } from "../__fixtures__/exact-nd.js";
import {
  exactNcPartialFixture,
  exactFeReplacementFixture,
} from "../__fixtures__/exact-credit-extensions.js";

/** Five-decimal scaled integer from a plain decimal text. */
const s = (value: string): bigint => {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100000n + BigInt(fraction.padEnd(5, "0"));
};
const pct = (porcentaje: string): ExactDiscountEntry => ({ porcentaje });
const abs = (montoDescuento: string): ExactDiscountEntry => ({ montoDescuento });
const GUARD = "Zero or negative net line is outside ordinary exact FE";
/** Assert a RangeError with exactly this message (not a ZodError or a bound error). */
function expectRangeError(run: () => unknown, message: string): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RangeError);
  expect((caught as Error).message).toBe(message);
}

describe("applyDiscounts (current exact families)", () => {
  it("cascades two percentages on the remaining base", () => {
    expect(applyDiscounts(s("100"), [pct("10"), pct("10")])).toEqual({
      amounts: [s("10"), s("9")],
      remaining: s("81"),
    });
  });

  it("keeps absolute amounts exact and makes the order of mixed entries observable", () => {
    expect(applyDiscounts(s("100"), [abs("30"), abs("20.12345")])).toEqual({
      amounts: [s("30"), s("20.12345")],
      remaining: s("49.87655"),
    });
    // Absolute first: 200 − 50 = 150; 10% → 15; 5.5% of 135 → 7.425.
    expect(applyDiscounts(s("200"), [abs("50"), pct("10"), pct("5.5")])).toEqual({
      amounts: [s("50"), s("15"), s("7.425")],
      remaining: s("127.575"),
    });
    // Percentage first: 10% of 200 → 20; −50 → 130; 5.5% of 130 → 7.15.
    expect(applyDiscounts(s("200"), [pct("10"), abs("50"), pct("5.5")])).toEqual({
      amounts: [s("20"), s("50"), s("7.15")],
      remaining: s("122.85"),
    });
  });

  it("applies five entries, each against the base left by the previous one", () => {
    // 1000 −100 (10%) → 900 −45 (5%) → 855 −55 (abs) → 800 −200 (25%) → 600 −0.00006 (0.00001%).
    expect(
      applyDiscounts(s("1000"), [pct("10"), pct("5"), abs("55"), pct("25"), pct("0.00001")]),
    ).toEqual({
      amounts: [s("100"), s("45"), s("55"), s("200"), s("0.00006")],
      remaining: s("599.99994"),
    });
  });

  it("rounds each percentage HALF_UP at the fifth decimal", () => {
    // 1.00001 × 50% = 0.500005 → 0.50001 (half rounds up).
    expect(applyDiscounts(s("1.00001"), [pct("50")])).toEqual({
      amounts: [s("0.50001")],
      remaining: s("0.5"),
    });
    // 1.00001 × 49.99999% = 0.5000048999… → 0.50000 (below the half).
    expect(applyDiscounts(s("1.00001"), [pct("49.99999")]).amounts).toEqual([s("0.5")]);
    // On the remaining 0.5: 0.001% = 0.000005 → 0.00001; 0.00099% = 0.00000495 → 0.
    expect(applyDiscounts(s("1"), [pct("50"), pct("0.001")]).amounts).toEqual([
      s("0.5"),
      s("0.00001"),
    ]);
    expect(applyDiscounts(s("1"), [pct("50"), pct("0.00099")]).amounts).toEqual([s("0.5"), 0n]);
    // The base decides the rounding: 20% of the remaining 0.00002 is 0.000004 → 0,
    // while 20% of the gross 0.00003 would be 0.000006 → 0.00001.
    expect(applyDiscounts(s("0.00003"), [abs("0.00001"), pct("20")]).amounts).toEqual([
      s("0.00001"),
      0n,
    ]);
    expect(applyFrozenGrossDiscounts(s("0.00003"), [abs("0.00001"), pct("20")]).amounts).toEqual([
      s("0.00001"),
      s("0.00001"),
    ]);
  });

  it("rejects a discount that consumes the whole remaining base", () => {
    for (const entries of [
      [pct("100")],
      [abs("100")],
      [abs("100.00001")],
      [pct("50"), abs("50")],
      [pct("50"), pct("50"), abs("25")],
      [abs("99.99999"), pct("100")],
    ])
      expect(() => applyDiscounts(s("100"), entries, GUARD)).toThrow(new RangeError(GUARD));
    expect(() => applyDiscounts(s("100"), [abs("-1")])).toThrow(
      "Discount amount must be strictly less than the remaining base",
    );
    // A cascade of halves never consumes the base.
    expect(applyDiscounts(s("100"), [pct("50"), pct("50")]).remaining).toBe(s("25"));
  });

  it("treats an entry without amount or percentage as zero", () => {
    expect(applyDiscounts(s("100"), [{}])).toEqual({ amounts: [0n], remaining: s("100") });
  });
});

describe("applyFrozenGrossDiscounts (retained calculator only)", () => {
  it("computes every percentage on the constant gross base", () => {
    expect(applyFrozenGrossDiscounts(s("100"), [pct("10"), pct("10")])).toEqual({
      amounts: [s("10"), s("10")],
      remaining: s("80"),
    });
    expect(applyFrozenGrossDiscounts(s("200"), [abs("50"), pct("10"), pct("5.5")])).toEqual({
      amounts: [s("50"), s("20"), s("11")],
      remaining: s("119"),
    });
    expect(applyFrozenGrossDiscounts(s("1.00001"), [pct("50")]).amounts).toEqual([s("0.50001")]);
  });

  it("guards the cumulative deduction against the gross, as the published calculator did", () => {
    for (const entries of [
      [pct("50"), pct("50")],
      [abs("60"), abs("60")],
      [pct("100")],
      [abs("99.99999"), pct("0.001")],
    ])
      expect(() => applyFrozenGrossDiscounts(s("100"), entries, GUARD)).toThrow(
        new RangeError(GUARD),
      );
    expect(() => applyFrozenGrossDiscounts(s("100"), [abs("-1")])).toThrow(RangeError);
    expect(applyFrozenGrossDiscounts(s("100"), [abs("60"), abs("39.99999")]).remaining).toBe(1n);
    expect(applyFrozenGrossDiscounts(s("100"), [{}])).toEqual({
      amounts: [0n],
      remaining: s("100"),
    });
  });

  it("is internal: the tax barrel re-exports neither primitive", () => {
    expect(Object.keys(taxBarrel)).not.toContain("applyDiscounts");
    expect(Object.keys(taxBarrel)).not.toContain("applyFrozenGrossDiscounts");
  });
});

interface Line {
  cantidad: string;
  precioUnitario: string;
  descuento?: unknown[];
}
interface Calculated {
  detalleServicio: readonly {
    descuento?: readonly { montoDescuento: string }[];
    subTotal: string;
    baseImponible?: string;
    impuestoNeto: string;
    montoTotalLinea: string;
  }[];
  resumenFactura: {
    totalDescuentos?: string;
    totalVentaNeta?: string;
    totalImpuesto?: string;
    totalComprobante: string;
  };
}
interface CascadeFamily {
  name: string;
  make: () => object;
  line: (source: object) => Line;
  payments: (source: object) => { medioPago?: { tipoMedioPago: string; totalMedioPago: string }[] };
  calculate: (source: object) => Calculated;
  build: (source: object) => string;
  tax: string;
  xsd: string;
  /** XSD generations whose code catalogs admit the family (default: both). */
  generations?: readonly SchemaGeneration[];
}
type Wrapped<K extends string> = Record<K, { detalleServicio: Line[] }>;
const own = (source: object) => (source as { detalleServicio: Line[] }).detalleServicio[0] as Line;
const self = (source: object) =>
  source as { medioPago?: { tipoMedioPago: string; totalMedioPago: string }[] };
const adjustment = (source: object) =>
  (source as { adjustments: { line: Line }[] }).adjustments[0]?.line as Line;

const CASCADE_FAMILIES: readonly CascadeFamily[] = [
  {
    name: "FE",
    make: () => exactNcFixture().original,
    line: own,
    payments: self,
    calculate: (x) => calculateExactFe(x as ExactFeInput),
    build: (x) => buildExactFacturaXml(x as ExactFeInput),
    tax: "10.53000",
    xsd: "FacturaElectronica_V4.4.xsd",
  },
  {
    name: "FE replacement",
    make: () => exactFeReplacementFixture(),
    line: (x) => (x as Wrapped<"replacement">).replacement.detalleServicio[0] as Line,
    payments: (x) => self((x as { replacement: object }).replacement),
    calculate: (x) => calculateExactFeReplacement(x as ExactFeReplacementInput),
    build: (x) => buildExactFacturaReplacementXml(x as ExactFeReplacementInput),
    tax: "10.53000",
    xsd: "FacturaElectronica_V4.4.xsd",
    // Reference code 16 (rejected-document replacement) exists only in 2026.
    generations: ["2026"],
  },
  {
    name: "TE",
    make: () => exactTeFixture(),
    line: own,
    payments: self,
    calculate: (x) => calculateExactTe(x as ExactTeInput),
    build: (x) => buildExactTiqueteXml(x as ExactTeInput),
    tax: "10.53000",
    xsd: "TiqueteElectronico_V4.4.xsd",
  },
  {
    name: "NC total",
    make: () => exactNcFixture(),
    line: (x) => (x as Wrapped<"original">).original.detalleServicio[0] as Line,
    payments: (x) => self((x as { original: object }).original),
    calculate: (x) => calculateExactNcTotal(x as ExactNcTotalInput),
    build: (x) => buildExactNotaCreditoTotalXml(x as ExactNcTotalInput),
    tax: "10.53000",
    xsd: "NotaCreditoElectronica_V4.4.xsd",
  },
  {
    name: "NC partial",
    make: () => exactNcPartialFixture(),
    line: adjustment,
    payments: self,
    calculate: (x) => calculateExactNcPartial(x as ExactNcPartialInput),
    build: (x) => buildExactNotaCreditoPartialXml(x as ExactNcPartialInput),
    tax: "10.53000",
    xsd: "NotaCreditoElectronica_V4.4.xsd",
  },
  {
    name: "ND",
    make: () => exactNdFixture(),
    line: adjustment,
    payments: self,
    calculate: (x) => calculateExactNd(x as ExactNdInput),
    build: (x) => buildExactNotaDebitoXml(x as ExactNdInput),
    tax: "10.53000",
    xsd: "NotaDebitoElectronica_V4.4.xsd",
  },
  {
    name: "FEC",
    make: () => exactFecFixture(),
    line: own,
    payments: self,
    calculate: (x) => calculateExactFec(x as ExactFecInput),
    build: (x) => buildExactFacturaCompraXml(x as ExactFecInput),
    tax: "10.53000",
    xsd: "FacturaElectronicaCompra_V4.4.xsd",
  },
  {
    name: "FEC foreign service",
    make: () => exactFecForeignServiceIva13Fixture(),
    line: own,
    payments: self,
    calculate: (x) => calculateExactFecForeignServiceIva13(x as ExactFecForeignServiceIva13Input),
    build: (x) =>
      buildExactFacturaCompraForeignServiceIva13Xml(x as ExactFecForeignServiceIva13Input),
    tax: "10.53000",
    xsd: "FacturaElectronicaCompra_V4.4.xsd",
  },
  {
    name: "FEC used-personal goods",
    make: () => exactFecUsedPersonalGoodsNonSubjectFixture(),
    line: own,
    payments: self,
    calculate: (x) =>
      calculateExactFecUsedPersonalGoodsNonSubject(x as ExactFecUsedPersonalGoodsNonSubjectInput),
    build: (x) =>
      buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml(
        x as ExactFecUsedPersonalGoodsNonSubjectInput,
      ),
    tax: "0.00000",
    xsd: "FacturaElectronicaCompra_V4.4.xsd",
  },
];

describe.each(CASCADE_FAMILIES.map((family) => [family.name, family] as const))(
  "cascade parity: %s",
  (_name, family) => {
    it("100 with two 10% discounts reports 10 + 9, subtotal and base 81", () => {
      const source = family.make();
      const line = family.line(source);
      line.cantidad = "1";
      line.precioUnitario = "100";
      line.descuento = [
        { codigoDescuento: "07", porcentaje: "10" },
        { codigoDescuento: "07", porcentaje: "10" },
      ];
      const total = family.tax === "0.00000" ? "81" : "91.53";
      const holder = family.payments(source);
      holder.medioPago = [
        { tipoMedioPago: holder.medioPago?.[0]?.tipoMedioPago ?? "01", totalMedioPago: total },
      ];
      const calculated = family.calculate(source);
      const row = calculated.detalleServicio[0];
      expect(row?.descuento?.map((d) => d.montoDescuento)).toEqual(["10.00000", "9.00000"]);
      expect(row?.subTotal).toBe("81.00000");
      expect(row?.baseImponible ?? "81.00000").toBe("81.00000");
      expect(row?.impuestoNeto).toBe(family.tax);
      expect(calculated.resumenFactura.totalDescuentos).toBe("19.00000");
      expect(calculated.resumenFactura.totalVentaNeta).toBe("81.00000");
      expect(calculated.resumenFactura.totalComprobante).toBe(
        family.tax === "0.00000" ? "81.00000" : "91.53000",
      );
      const xml = family.build(source);
      expect(xml).toContain("<MontoDescuento>10.00000</MontoDescuento>");
      expect(xml).toContain("<MontoDescuento>9.00000</MontoDescuento>");
      expect(xml).toContain("<SubTotal>81.00000</SubTotal>");
      expect(xml).toContain("<TotalDescuentos>19.00000</TotalDescuentos>");
      for (const generation of family.generations ?? SCHEMA_GENERATIONS)
        expect(
          validateAgainstXsd(xml, family.xsd, { allowMissingSignature: true, generation }),
          generation,
        ).toEqual({ valid: true, errors: "" });
    });
  },
);

/** FE line of 100 with the given discounts and the given allocation. */
/** An FE input with an explicit payment, so both current and retained calculators accept its shape. */
function feWith(
  descuento: unknown[],
  total: string,
): ExactFeInput & Required<Pick<ExactFeInput, "medioPago">> {
  const source = exactNcFixture().original;
  const line = source.detalleServicio[0] as unknown as Line;
  line.cantidad = "1";
  line.precioUnitario = "100";
  line.descuento = descuento;
  return { ...source, medioPago: [{ tipoMedioPago: "01", totalMedioPago: total }] };
}
const amountsOf = (calculated: Calculated) =>
  calculated.detalleServicio[0]?.descuento?.map((d) => d.montoDescuento);

describe("current API versus the frozen retained calculator", () => {
  it("two 10% discounts on 100: current 10/9 → 91.53, retained 10/10 → 90.40", () => {
    const tenTen = [
      { codigoDescuento: "07", porcentaje: "10" },
      { codigoDescuento: "07", porcentaje: "10" },
    ];
    const current = calculateExactFe(feWith(tenTen, "91.53"));
    expect(amountsOf(current)).toEqual(["10.00000", "9.00000"]);
    expect(current.detalleServicio[0]?.subTotal).toBe("81.00000");
    expect(current.resumenFactura.totalImpuesto).toBe("10.53000");
    expect(current.resumenFactura.totalComprobante).toBe("91.53000");

    const retained = calculateRetainedExactFe(
      RetainedExactFeInputSchema.parse(feWith(tenTen, "90.40")),
    );
    expect(amountsOf(retained)).toEqual(["10.00000", "10.00000"]);
    expect(retained.detalleServicio[0]?.subTotal).toBe("80.00000");
    expect(retained.resumenFactura.totalImpuesto).toBe("10.40000");
    expect(retained.resumenFactura.totalComprobante).toBe("90.40000");

    // Each calculator rejects the other's allocation: the bases really differ.
    expect(() => calculateExactFe(feWith(tenTen, "90.40"))).toThrow(
      "Exact ordinary FE payment allocation must equal invoice total",
    );
    expect(() => calculateRetainedExactFe(feWith(tenTen, "91.53"))).toThrow(
      "Exact ordinary FE payment allocation must equal invoice total",
    );
  });

  it("mixed absolute and percentage entries cascade in order through the current FE XML", () => {
    // 100 − 30 = 70; 10% → 7 → 63; 12.5% → 7.875 → 55.125; IVA 7.16625; total 62.29125.
    const source = feWith(
      [
        { codigoDescuento: "05", montoDescuento: "30" },
        { codigoDescuento: "07", porcentaje: "10" },
        { codigoDescuento: "06", porcentaje: "12.5" },
      ],
      "62.29125",
    );
    const calculated = calculateExactFe(source);
    expect(amountsOf(calculated)).toEqual(["30.00000", "7.00000", "7.87500"]);
    expect(calculated.detalleServicio[0]?.subTotal).toBe("55.12500");
    expect(calculated.resumenFactura.totalImpuesto).toBe("7.16625");
    expect(calculated.resumenFactura.totalComprobante).toBe("62.29125");
    expect(buildExactFacturaXml(source)).toContain("<MontoDescuento>7.87500</MontoDescuento>");
    // Retained keeps gross: 30 + 10 + 12.5 = 52.5 → 47.5; IVA 6.175; total 53.675.
    const retained = calculateRetainedExactFe(
      RetainedExactFeInputSchema.parse({
        ...source,
        medioPago: [{ tipoMedioPago: "01", totalMedioPago: "53.675" }],
      }),
    );
    expect(amountsOf(retained)).toEqual(["30.00000", "10.00000", "12.50000"]);
    expect(retained.resumenFactura.totalComprobante).toBe("53.67500");
  });

  it("50% + 50%: the current cascade leaves 25, the retained calculator keeps its RangeError", () => {
    const halves = [
      { codigoDescuento: "07", porcentaje: "50" },
      { codigoDescuento: "07", porcentaje: "50" },
    ];
    const current = calculateExactFe(feWith(halves, "28.25"));
    expect(amountsOf(current)).toEqual(["50.00000", "25.00000"]);
    expect(current.resumenFactura.totalComprobante).toBe("28.25000");
    expectRangeError(() => calculateRetainedExactFe(feWith(halves, "0")), GUARD);
  });

  it("60 + 60 absolute: both calculators reject the zero-or-negative net with the same RangeError", () => {
    const sixties = [
      { codigoDescuento: "05", montoDescuento: "60" },
      { codigoDescuento: "05", montoDescuento: "60" },
    ];
    expectRangeError(() => calculateRetainedExactFe(feWith(sixties, "0")), GUARD);
    expectRangeError(() => calculateExactFe(feWith(sixties, "1")), GUARD);
  });

  it("a discount that consumes the whole remaining base throws in every current kernel", () => {
    expect(() =>
      calculateExactFe(
        feWith(
          [
            { codigoDescuento: "07", porcentaje: "50" },
            { codigoDescuento: "05", montoDescuento: "50" },
          ],
          "1",
        ),
      ),
    ).toThrow(new RangeError(GUARD));
    const used = exactFecUsedPersonalGoodsNonSubjectFixture();
    const usedLine = used.detalleServicio[0] as unknown as Line;
    usedLine.descuento = [
      { codigoDescuento: "07", porcentaje: "50" },
      { codigoDescuento: "05", montoDescuento: "50" },
    ];
    expect(() => calculateExactFecUsedPersonalGoodsNonSubject(used)).toThrow(
      new RangeError("Zero or negative net line is outside non-subject FEC"),
    );
  });
});
