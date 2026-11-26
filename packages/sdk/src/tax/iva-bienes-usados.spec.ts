/**
 * IVA 08, "IVA Régimen de Bienes Usados (Factor)" (Anexos y Estructuras v4.4,
 * nota 8, p. 70), on every money path.
 *
 * Primary rules (Anexos v4.4, vendored PDF):
 * - p. 37, Codigo: "Al utilizar el código 08, se debe utilizar para el cálculo
 *   de factor del IVA por el subtotal."
 * - p. 39, FactorCalculoIVA (Decimal 5,4): "Cuando en el código de impuesto se
 *   defina IVA Bienes Usados se deberá utilizar este campo con el factor
 *   establecido por el Ministerio de Hacienda. Debe expresarse en formato
 *   decimal. Validación: En caso de utilizar el código 08 de la nota 08, se
 *   verificará que este campo se encuentre en el comprobante, caso contario se
 *   rechazará."
 * - p. 42, Monto: "En caso de utilizar el factor establecido para el régimen de
 *   bienes usados, este campo se obtiene de la multiplicación del factor por
 *   el subtotal."
 * - Every vendored v4.4 XSD (2024 and 2026): Tarifa and FactorCalculoIVA are
 *   minOccurs="0"; FactorCalculoIVA is xs:decimal totalDigits 5,
 *   fractionDigits 4.
 *
 * Expected amounts are hand-computed below and re-derived by an independent
 * Python Decimal oracle (HALF_UP, 5 decimals; Anexos v4.4, pp. 13-14).
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  DecimalTaxInputSchema,
  ImpuestoSchema,
  type DecimalDocumentInput,
  type FacturaElectronica,
} from "@dojocoding/hacienda-shared";
import {
  calculateInvoiceSummary,
  calculateLineItemTotals,
  calculateTaxAmount,
  createLegacyCalculator,
  type LineItemInput,
} from "./calculator.js";
import {
  calculateDecimalDocument,
  calculateDecimalLineItemTotals,
  calculateDecimalTaxAmount,
} from "./decimal-document.js";
import { validateFacturaInput } from "../xml/validator.js";
import { toLineaDetalle } from "../__fixtures__/linea-detalle.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { buildDecimalDocumentXml } from "../documents/decimal-document-builder.js";
import { SCHEMA_GENERATIONS, validateAgainstXsd, xmllintAvailable } from "../__testing__/xsd.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";

/** Independent oracle: subtotal × factor, Decimal HALF_UP at 5 decimals. */
function oracle(cases: readonly (readonly [string, string])[]): string[] {
  return JSON.parse(
    execFileSync(
      "python3",
      [
        "-I",
        "-c",
        `import json,sys
from decimal import Decimal as D, ROUND_HALF_UP, localcontext
with localcontext() as c:
 c.prec=100
 print(json.dumps([format((D(s)*D(f)).quantize(D('0.00001'),rounding=ROUND_HALF_UP),'.5f') for s,f in json.load(sys.stdin)]))`,
      ],
      { input: JSON.stringify(cases), encoding: "utf8" },
    ),
  ) as string[];
}

/**
 * [subtotal, factor, hand-computed amount].
 * - 100000 × 0.13 = 13000 exactly.
 * - 24691.35782 × 0.0565 = 1395.06171683 → 1395.06172 (sixth decimal 6).
 * - 80074.1975 × 0.13 = 10409.645675 → 10409.64568 (exact half, HALF_UP).
 * - 1.00001 × 0.5 = 0.500005 → 0.50001 (exact half, HALF_UP).
 * - 10 × 9.9999 = 99.999 (XSD maximum factor).
 * - 750 × 0.0001 = 0.075 (XSD minimum positive factor).
 * - 999.99999 × 0 = 0 (zero factor).
 */
const CASES = [
  ["100000", "0.13", "13000.00000"],
  ["24691.35782", "0.0565", "1395.06172"],
  ["80074.1975", "0.13", "10409.64568"],
  ["1.00001", "0.5", "0.50001"],
  ["10", "9.9999", "99.99900"],
  ["750", "0.0001", "0.07500"],
  ["999.99999", "0", "0.00000"],
] as const;

const scaled5 = (text: string) => {
  const [whole = "0", fraction = ""] = text.split(".");
  return BigInt(whole) * 100000n + BigInt(fraction.padEnd(5, "0"));
};
const fixed5 = (value: bigint) =>
  `${value / 100000n}.${(value % 100000n).toString().padStart(5, "0")}`;

describe("IVA 08 oracle", () => {
  it("agrees with the hand-computed amounts", () => {
    expect(oracle(CASES.map(([s, f]) => [s, f] as const))).toEqual(CASES.map(([, , a]) => a));
  });
});

describe("IVA 08 on the exact decimal path", () => {
  it.each(CASES)("taxes subtotal %s × factor %s = %s, HALF_UP at 5 decimals", (s, f, amount) => {
    const value = calculateDecimalTaxAmount(
      { codigo: "08", factorCalculoIVA: f },
      scaled5(s),
      1000n,
    );
    expect(fixed5(value)).toBe(amount);
  });

  it("ignores an informational tarifa and never divides the factor by 100", () => {
    expect(
      fixed5(
        calculateDecimalTaxAmount(
          { codigo: "08", tarifa: "13", factorCalculoIVA: "0.0565" },
          scaled5("24691.35782"),
          1000n,
        ),
      ),
    ).toBe("1395.06172");
  });

  it("taxes the subtotal, not a base imponible raised by ISC", () => {
    const line = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Unid",
      detalle: "Vehiculo usado",
      precioUnitario: "1000",
      descuento: [{ montoDescuento: "250", codigoDescuento: "07" }],
      impuesto: [
        { codigo: "02", tarifa: "10" },
        { codigo: "08", factorCalculoIVA: "0.13" },
      ],
    });
    // Subtotal 750; ISC 10% = 75 lifts baseImponible to 825; 08 = 0.13 × 750.
    expect(line.subTotal).toBe("750");
    expect(line.baseImponible).toBe("825");
    expect(line.impuesto.map((t) => t.monto)).toEqual(["75", "97.5"]);
    expect(line.impuesto[1]).not.toHaveProperty("tarifa");
    expect(line.impuestoNeto).toBe("172.5");
  });

  it("rejects 08 without a factor at the schema and the kernel", () => {
    const parsed = DecimalTaxInputSchema.safeParse({ codigo: "08", tarifa: "13" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path.join("."))).toContain("factorCalculoIVA");
    expect(() => calculateDecimalTaxAmount({ codigo: "08", tarifa: "13" }, 100n, 1000n)).toThrow(
      "IVA bienes usados (codigo 08) requires factorCalculoIVA",
    );
  });

  it("accepts 08 with neither tarifa nor codigoTarifaIVA", () => {
    expect(
      DecimalTaxInputSchema.safeParse({ codigo: "08", factorCalculoIVA: "0.13" }).success,
    ).toBe(true);
  });

  it("rejects a factor outside 08, a fifth factor decimal and exoneración on 08", () => {
    const issues = (tax: unknown) =>
      DecimalTaxInputSchema.safeParse(tax).error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(
      issues({ codigo: "01", codigoTarifaIVA: "08", tarifa: "13", factorCalculoIVA: "0.13" }),
    ).toContain("factorCalculoIVA");
    expect(issues({ codigo: "08", factorCalculoIVA: "0.12345" })).toContain("factorCalculoIVA");
    expect(
      issues({
        codigo: "08",
        factorCalculoIVA: "0.13",
        exoneracion: {
          tipoDocumento: "03",
          numeroDocumento: "EX-100-2025",
          nombreInstitucion: "06",
          fechaEmision: "2025-06-01T00:00:00-06:00",
          tarifaExonerada: "13",
        },
      }),
    ).toContain("exoneracion");
  });
});

const usedGoodsLine = (precioUnitario: number, factorCalculoIVA: number): LineItemInput => ({
  numeroLinea: 1,
  codigoCabys: "4321000000000",
  cantidad: 1,
  unidadMedida: "Unid",
  detalle: "Vehiculo usado",
  precioUnitario,
  impuesto: [{ codigo: "08", factorCalculoIVA }],
});

describe("IVA 08 on the legacy Number path", () => {
  it("computes factor × subtotal in both rounding modes", () => {
    for (const mode of ["legacy-tofixed", "half-up"] as const) {
      const calculator = createLegacyCalculator({ roundingMode: mode });
      const line = calculator.calculateLineItemTotals(usedGoodsLine(24691.35782, 0.0565));
      expect(line.impuesto).toEqual([
        { codigo: "08", factorCalculoIVA: 0.0565, monto: 1395.06172 },
      ]);
      expect(line.impuestoNeto).toBe(1395.06172);
      expect(line.montoTotalLinea).toBe(26086.41954);
      const summary = calculator.calculateInvoiceSummary([line]);
      expect(summary.totalMercanciasGravadas).toBe(24691.35782);
      expect(summary.totalDesgloseImpuesto).toEqual([
        { codigo: "08", totalMontoImpuesto: 1395.06172 },
      ]);
    }
  });

  it("follows each mode on an exact sixth-decimal half (80074.1975 × 0.13)", () => {
    // toFixed sees the double just below 10409.645675; HALF_UP reads the decimal.
    expect(
      createLegacyCalculator({ roundingMode: "legacy-tofixed" }).calculateLineItemTotals(
        usedGoodsLine(80074.1975, 0.13),
      ).impuesto[0]?.monto,
    ).toBe(10409.64567);
    expect(
      createLegacyCalculator({ roundingMode: "half-up" }).calculateLineItemTotals(
        usedGoodsLine(80074.1975, 0.13),
      ).impuesto[0]?.monto,
    ).toBe(10409.64568);
    expect(calculateLineItemTotals(usedGoodsLine(80074.1975, 0.13)).impuesto[0]?.monto).toBe(
      10409.64567,
    );
  });

  it("keeps calculateTaxAmount's signature and checks a supplied amount", () => {
    expect(calculateTaxAmount({ codigo: "08", factorCalculoIVA: 0.13 }, 100000, 1)).toBe(13000);
    expect(() =>
      calculateTaxAmount({ codigo: "08", factorCalculoIVA: 0.13, monto: 12999 }, 100000, 1),
    ).toThrow("Tax amount does not match factorCalculoIVA × subtotal");
  });

  it("rejects 08 without a factor, a factor outside 08, and exoneración on 08", () => {
    expect(() =>
      calculateLineItemTotals({
        ...usedGoodsLine(100000, 0.13),
        impuesto: [{ codigo: "08", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ).toThrow("IVA bienes usados (codigo 08) requires factorCalculoIVA");
    expect(() =>
      calculateLineItemTotals({
        ...usedGoodsLine(100000, 0.13),
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13, factorCalculoIVA: 0.13 }],
      }),
    ).toThrow("factorCalculoIVA is only valid for IVA bienes usados (codigo 08)");
    expect(() =>
      calculateLineItemTotals({
        ...usedGoodsLine(100000, 0.13),
        impuesto: [
          {
            codigo: "08",
            factorCalculoIVA: 0.13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "EX-100-2025",
              nombreInstitucion: "06",
              fechaEmision: "2025-06-01T00:00:00-06:00",
              tarifaExonerada: 13,
            },
          },
        ],
      }),
    ).toThrow("Exoneración on IVA bienes usados (codigo 08) is not supported");
  });

  it("rejects a factor with more than 4 decimals (XSD fractionDigits 4)", () => {
    expect(
      ImpuestoSchema.safeParse({ codigo: "08", factorCalculoIVA: 0.12345, monto: 0 }).success,
    ).toBe(false);
    expect(
      ImpuestoSchema.safeParse({ codigo: "08", factorCalculoIVA: 0.1234, monto: 0 }).success,
    ).toBe(true);
  });
});

/** Legacy FacturaElectronica built from the legacy calculator's own output. */
function legacyInvoice(precioUnitario: number, factorCalculoIVA: number): FacturaElectronica {
  const { esServicio: _esServicio, ...line } = calculateLineItemTotals(
    usedGoodsLine(precioUnitario, factorCalculoIVA),
  );
  const summary = calculateInvoiceSummary([{ ...line, esServicio: false }]);
  return {
    ...SIMPLE_INVOICE,
    detalleServicio: [toLineaDetalle(line)],
    resumenFactura: {
      ...summary,
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: summary.totalComprobante }],
    },
  };
}

describe("IVA 08 legacy validator", () => {
  it("accepts the calculator's own 08 document", () => {
    expect(validateFacturaInput(legacyInvoice(24691.35782, 0.0565))).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects an amount that is not factor × subtotal", () => {
    const input = legacyInvoice(100000, 0.13);
    const line = input.detalleServicio[0];
    const tax = line?.impuesto[0];
    if (!line || !tax) throw new Error("Expected one line and tax");
    // 13% of the subtotal would also be 13000; 0.0565 × 100000 is 5650.
    tax.factorCalculoIVA = 0.0565;
    const result = validateFacturaInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "detalleServicio.0.impuesto.0.monto",
      message: "Tax amount must match its applicable calculation (5650)",
    });
  });

  it("rejects 08 without a factor", () => {
    const input = legacyInvoice(100000, 0.13);
    const tax = input.detalleServicio[0]?.impuesto[0];
    if (!tax) throw new Error("Expected one tax");
    delete tax.factorCalculoIVA;
    const result = validateFacturaInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "detalleServicio.0.impuesto.0.factorCalculoIVA",
      message: "IVA bienes usados (codigo 08) requires factorCalculoIVA",
    });
  });
});

/** 80074.1975 × 0.13 = 10409.645675 → 10409.64568; total 90483.84318. */
const decimalSource = (): DecimalDocumentInput => ({
  tipoDocumento: "01",
  clave: SIMPLE_INVOICE.clave,
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: SIMPLE_INVOICE.numeroConsecutivo,
  fechaEmision: SIMPLE_INVOICE.fechaEmision,
  emisor: {
    nombre: "Empresa Exacta S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "100m norte" },
    correoElectronico: "facturacion@example.com",
  },
  receptor: {
    nombre: "Cliente Exacto S.R.L.",
    identificacion: { tipo: "02", numero: "3109876543" },
    correoElectronico: "compras@example.com",
  },
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Unid",
      detalle: "Vehiculo usado",
      precioUnitario: "80074.1975",
      impuesto: [{ codigo: "08", factorCalculoIVA: "0.13" }],
    },
  ],
  codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
  medioPago: [{ tipoMedioPago: "01", totalMedioPago: "90483.84318" }],
});

describe("IVA 08 XML against the 2024 and 2026 XSDs", () => {
  it("calculates the exact document totals", () => {
    const calculated = calculateDecimalDocument(decimalSource());
    expect(calculated.detalleServicio[0]?.impuesto[0]?.monto).toBe("10409.64568");
    expect(calculated.resumenFactura.totalImpuesto).toBe("10409.64568");
    expect(calculated.resumenFactura.totalComprobante).toBe("90483.84318");
  });

  it.skipIf(!xmllintAvailable()).each(SCHEMA_GENERATIONS)(
    "builds a schema-valid legacy and exact 08 invoice (%s schemas)",
    (generation) => {
      const legacy = buildFacturaXml(legacyInvoice(24691.35782, 0.0565));
      expect(legacy).toContain("<FactorCalculoIVA>0.0565</FactorCalculoIVA>");
      expect(legacy).toContain("<Monto>1395.06172</Monto>");
      expect(legacy).not.toContain("<Tarifa>");
      const exact = buildDecimalDocumentXml(decimalSource());
      expect(exact).toContain("<FactorCalculoIVA>0.13</FactorCalculoIVA>");
      expect(exact).toContain("<Monto>10409.64568</Monto>");
      for (const xml of [legacy, exact]) {
        const result = validateAgainstXsd(xml, "FacturaElectronica_V4.4.xsd", {
          allowMissingSignature: true,
          generation,
        });
        expect(result.errors).toBe("");
        expect(result.valid).toBe(true);
      }
    },
  );
});
