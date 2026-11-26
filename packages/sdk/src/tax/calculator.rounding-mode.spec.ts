/**
 * Golden tests for the legacy Number calculators' rounding modes.
 *
 * `"legacy-tofixed"` (default) rounds the binary value with
 * `Number.toFixed(5)`; `"half-up"` rounds the decimal value HALF_UP, the rule
 * in Hacienda's "Anexos y Estructuras" v4.4, section II, p. 13-14. They only
 * disagree on exact sixth-decimal halves whose nearest double lies just below
 * the half. These tests pin the bytes of BOTH modes for such halves, plus
 * controls on which the two modes must agree, so that neither mode can drift
 * silently. Expected HALF_UP values were cross-checked with Python
 * `decimal.Decimal(...).quantize(Decimal("0.00001"), ROUND_HALF_UP)` on the
 * decimal text of the inputs.
 */

import { describe, it, expect } from "vitest";
import { MonetaryValueError } from "@dojocoding/hacienda-shared";
import {
  DEFAULT_LEGACY_ROUNDING_MODE,
  LEGACY_ROUNDING_MODES,
  calculateInvoiceSummary,
  calculateLineItemTotals,
  calculateTaxAmount,
  createLegacyCalculator,
  round5,
  round5HalfUp,
  type LegacyCalculationOptions,
  type LineItemInput,
} from "./calculator.js";

const legacy = createLegacyCalculator({ roundingMode: "legacy-tofixed" });
const halfUp = createLegacyCalculator({ roundingMode: "half-up" });

function ivaLine(cantidad: number, precioUnitario: number): LineItemInput {
  return {
    numeroLinea: 1,
    codigoCabys: "2111100000000",
    cantidad,
    unidadMedida: "Unid",
    detalle: "Producto de prueba",
    precioUnitario,
    impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
  };
}

// ---------------------------------------------------------------------------
// Scalar rounding
// ---------------------------------------------------------------------------

describe("round5 versus round5HalfUp on exact sixth-decimal halves", () => {
  it.each([
    // [label, value, legacy-tofixed bytes, half-up bytes]
    ["20.203515", 20.203515, "20.20351", "20.20352"],
    ["0.123455", 0.123455, "0.12345", "0.12346"],
    ["1.234565", 1.234565, "1.23456", "1.23457"],
    ["8.686375", 8.686375, "8.68637", "8.68638"],
    ["99.999995 (carry into the integer)", 99.999995, "99.99999", "100"],
    ["0.999 × 1802.455", 0.999 * 1802.455, "1800.65254", "1800.65255"],
    ["13% IVA on 80074.1975", (80074.1975 * 13) / 100, "10409.64567", "10409.64568"],
    ["-20.203515 (half away from zero)", -20.203515, "-20.20351", "-20.20352"],
  ])("%s", (_label, value, legacyBytes, halfUpBytes) => {
    expect(String(round5(value))).toBe(legacyBytes);
    expect(String(legacy.round5(value))).toBe(legacyBytes);
    expect(String(round5HalfUp(value))).toBe(halfUpBytes);
    expect(String(halfUp.round5(value))).toBe(halfUpBytes);
  });

  it.each([
    // Controls: both modes produce the same bytes.
    ["Anexo example 20.203518", 20.203518, "20.20352"],
    ["1.000015 (double above the half)", 1.000015, "1.00002"],
    ["1.000005 (double above the half)", 1.000005, "1.00001"],
    ["0.000015", 0.000015, "0.00002"],
    ["0.1 + 0.2", 0.1 + 0.2, "0.3"],
    ["13% IVA on 2-decimal base 1234.56", (1234.56 * 13) / 100, "160.4928"],
    ["13% IVA on 100000", (100000 * 13) / 100, "13000"],
    ["zero", 0, "0"],
    ["already 5 decimals", 12345.67891, "12345.67891"],
  ])("control: %s agrees in both modes", (_label, value, bytes) => {
    expect(String(round5(value))).toBe(bytes);
    expect(String(round5HalfUp(value))).toBe(bytes);
  });
});

describe("non-finite input", () => {
  it("legacy-tofixed keeps passing NaN and ±Infinity through", () => {
    expect(round5(Number.NaN)).toBeNaN();
    expect(round5(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(round5(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY);
    expect(legacy.round5(Number.NaN)).toBeNaN();
    expect(createLegacyCalculator().round5(Number.POSITIVE_INFINITY)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it("half-up rejects NaN and ±Infinity with MonetaryValueError", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => round5HalfUp(value)).toThrow(MonetaryValueError);
      expect(() => halfUp.round5(value)).toThrow(MonetaryValueError);
    }
    expect(() => halfUp.calculateLineItemTotals(ivaLine(1, Number.NaN))).toThrow(
      MonetaryValueError,
    );
  });
});

// ---------------------------------------------------------------------------
// Line items and summaries: golden bytes in both modes
// ---------------------------------------------------------------------------

describe("golden line and summary bytes", () => {
  it.each([
    {
      label: "fractional quantity 0.999 × 1802.455",
      line: ivaLine(0.999, 1802.455),
      legacy: { montoTotal: 1800.65254, monto: 234.08483, montoTotalLinea: 2034.73737 },
      halfUp: { montoTotal: 1800.65255, monto: 234.08483, montoTotalLinea: 2034.73738 },
    },
    {
      label: "5-decimal IVA base 80074.1975 at 13%",
      line: ivaLine(1, 80074.1975),
      legacy: { montoTotal: 80074.1975, monto: 10409.64567, montoTotalLinea: 90483.84317 },
      halfUp: { montoTotal: 80074.1975, monto: 10409.64568, montoTotalLinea: 90483.84318 },
    },
    {
      label: "unit price 20.203515",
      line: ivaLine(1, 20.203515),
      legacy: { montoTotal: 20.20351, monto: 2.62646, montoTotalLinea: 22.82997 },
      halfUp: { montoTotal: 20.20352, monto: 2.62646, montoTotalLinea: 22.82998 },
    },
  ])("$label", ({ line, legacy: legacyBytes, halfUp: halfUpBytes }) => {
    const defaultLine = calculateLineItemTotals(line);
    const legacyLine = legacy.calculateLineItemTotals(line);
    const halfUpLine = halfUp.calculateLineItemTotals(line);

    // The default and the explicit legacy mode are byte-identical.
    expect(JSON.stringify(legacyLine)).toBe(JSON.stringify(defaultLine));
    expect(JSON.stringify(createLegacyCalculator().calculateLineItemTotals(line))).toBe(
      JSON.stringify(defaultLine),
    );

    for (const [calculated, bytes] of [
      [legacyLine, legacyBytes],
      [halfUpLine, halfUpBytes],
    ] as const) {
      expect(String(calculated.montoTotal)).toBe(String(bytes.montoTotal));
      expect(String(calculated.subTotal)).toBe(String(bytes.montoTotal));
      expect(String(calculated.baseImponible)).toBe(String(bytes.montoTotal));
      expect(String(calculated.impuesto[0]?.monto)).toBe(String(bytes.monto));
      expect(String(calculated.impuestoNeto)).toBe(String(bytes.monto));
      expect(String(calculated.montoTotalLinea)).toBe(String(bytes.montoTotalLinea));
    }

    const defaultSummary = calculateInvoiceSummary([defaultLine]);
    expect(JSON.stringify(legacy.calculateInvoiceSummary([legacyLine]))).toBe(
      JSON.stringify(defaultSummary),
    );
    const halfUpSummary = halfUp.calculateInvoiceSummary([halfUpLine]);
    for (const [summary, bytes] of [
      [defaultSummary, legacyBytes],
      [halfUpSummary, halfUpBytes],
    ] as const) {
      expect(String(summary.totalMercanciasGravadas)).toBe(String(bytes.montoTotal));
      expect(String(summary.totalVentaNeta)).toBe(String(bytes.montoTotal));
      expect(String(summary.totalImpuesto)).toBe(String(bytes.monto));
      expect(summary.totalDesgloseImpuesto).toEqual([
        { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: bytes.monto },
      ]);
      expect(String(summary.totalComprobante)).toBe(String(bytes.montoTotalLinea));
    }
  });

  it.each([
    ["2 × 1000 at 13%", ivaLine(2, 1000)],
    ["2-decimal base 1234.56 at 13%", ivaLine(1, 1234.56)],
    ["0.5 × 0.03 at 13%", ivaLine(0.5, 0.03)],
  ])("control: %s is byte-identical in both modes", (_label, line) => {
    const legacyLine = legacy.calculateLineItemTotals(line);
    const halfUpLine = halfUp.calculateLineItemTotals(line);
    expect(JSON.stringify(halfUpLine)).toBe(JSON.stringify(legacyLine));
    expect(JSON.stringify(halfUp.calculateInvoiceSummary([halfUpLine], 10.5))).toBe(
      JSON.stringify(calculateInvoiceSummary([legacyLine], 10.5)),
    );
  });

  it("threads the mode through exoneration and summary classification", () => {
    const line: LineItemInput = {
      ...ivaLine(1, 20.203515),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          exoneracion: {
            tipoDocumento: "02",
            numeroDocumento: "AL-001",
            nombreInstitucion: "01",
            fechaEmision: "2025-01-01T00:00:00-06:00",
            tarifaExonerada: 13,
          },
        },
      ],
    };
    const legacyLine = legacy.calculateLineItemTotals(line);
    const halfUpLine = halfUp.calculateLineItemTotals(line);
    expect(legacyLine.impuesto[0]?.exoneracion?.montoExoneracion).toBe(2.62646);
    expect(halfUpLine.impuesto[0]?.exoneracion?.montoExoneracion).toBe(2.62646);
    expect(legacyLine.impuestoNeto).toBe(0);
    expect(halfUpLine.impuestoNeto).toBe(0);
    expect(legacy.calculateInvoiceSummary([legacyLine]).totalMercExonerada).toBe(20.20351);
    expect(halfUp.calculateInvoiceSummary([halfUpLine]).totalMercExonerada).toBe(20.20352);
  });

  it("threads the mode through calculateTaxAmount", () => {
    const tax = { codigo: "01", tarifa: 13 };
    expect(calculateTaxAmount(tax, 80074.1975, 1)).toBe(10409.64567);
    expect(legacy.calculateTaxAmount(tax, 80074.1975, 1)).toBe(10409.64567);
    expect(halfUp.calculateTaxAmount(tax, 80074.1975, 1)).toBe(10409.64568);

    // A caller-supplied monto must match the selected mode's result.
    const legacyMonto = { ...tax, monto: 10409.64567 };
    const halfUpMonto = { ...tax, monto: 10409.64568 };
    expect(legacy.calculateTaxAmount(legacyMonto, 80074.1975, 1)).toBe(10409.64567);
    expect(() => legacy.calculateTaxAmount(halfUpMonto, 80074.1975, 1)).toThrow(
      /does not match its percentage rate/,
    );
    expect(halfUp.calculateTaxAmount(halfUpMonto, 80074.1975, 1)).toBe(10409.64568);
    expect(() => halfUp.calculateTaxAmount(legacyMonto, 80074.1975, 1)).toThrow(
      /does not match its percentage rate/,
    );
  });
});

// ---------------------------------------------------------------------------
// Options contract
// ---------------------------------------------------------------------------

describe("createLegacyCalculator options", () => {
  it("defaults to legacy-tofixed", () => {
    expect(DEFAULT_LEGACY_ROUNDING_MODE).toBe("legacy-tofixed");
    expect(LEGACY_ROUNDING_MODES).toEqual(["legacy-tofixed", "half-up"]);
    expect(createLegacyCalculator().roundingMode).toBe("legacy-tofixed");
    expect(createLegacyCalculator({}).roundingMode).toBe("legacy-tofixed");
    expect(createLegacyCalculator({ roundingMode: undefined }).roundingMode).toBe("legacy-tofixed");
    expect(halfUp.roundingMode).toBe("half-up");
  });

  it("rejects unknown modes and non-object options", () => {
    expect(() =>
      createLegacyCalculator({ roundingMode: "half-even" } as unknown as LegacyCalculationOptions),
    ).toThrow(/Unknown roundingMode "half-even"/);
    expect(() =>
      createLegacyCalculator({ roundingMode: "HALF-UP" } as unknown as LegacyCalculationOptions),
    ).toThrow(TypeError);
    expect(() => createLegacyCalculator("half-up" as unknown as LegacyCalculationOptions)).toThrow(
      TypeError,
    );
    expect(() => createLegacyCalculator(null as unknown as LegacyCalculationOptions)).toThrow(
      TypeError,
    );
  });

  it("returns a frozen calculator whose members work point-free", () => {
    expect(Object.isFrozen(halfUp)).toBe(true);
    const lines = [ivaLine(0.999, 1802.455), ivaLine(1, 20.203515)].map(
      halfUp.calculateLineItemTotals,
    );
    expect(lines.map((line) => line.montoTotal)).toEqual([1800.65255, 20.20352]);
    expect([20.203515, 0.123455].map(halfUp.round5)).toEqual([20.20352, 0.12346]);
  });
});
