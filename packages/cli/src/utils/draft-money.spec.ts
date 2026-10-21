import { describe, expect, it } from "vitest";
import {
  buildDraftSummary,
  calculateDraftLineMoney,
  type DraftSummaryLine,
} from "./draft-money.js";

describe("draft exact money", () => {
  it("rounds a gross tie HALF_UP at five decimals, not with binary Math.round", () => {
    const line = calculateDraftLineMoney({
      cantidad: "0.5",
      precioUnitario: "1.00001",
      tarifa: 0,
    });

    // 0.5 × 1.00001 = 0.500005; the sixth decimal is a tie, so it goes up.
    expect(line.montoTotal).toBe("0.50001");
    expect(line.subTotal).toBe("0.50001");
    expect(line.montoTotalLinea).toBe("0.50001");
  });

  it("calculates IVA from the exact subtotal and rounds the tax tie HALF_UP", () => {
    const line = calculateDraftLineMoney({
      cantidad: "1",
      precioUnitario: "0.00005",
      tarifa: 13,
    });

    // 0.00005 × 13% = 0.0000065 → 0.00001.
    expect(line.montoTotal).toBe("0.00005");
    expect(line.impuestoNeto).toBe("0.00001");
    expect(line.montoTotalLinea).toBe("0.00006");
  });

  it("keeps the maximum money value exact", () => {
    const line = calculateDraftLineMoney({
      cantidad: "1",
      precioUnitario: "9999999999999.99999",
      tarifa: 0,
    });

    expect(line.montoTotal).toBe("9999999999999.99999");
    expect(line.montoTotalLinea).toBe("9999999999999.99999");
  });

  it("rejects a computed total above the money bound", () => {
    expect(() =>
      calculateDraftLineMoney({
        cantidad: "1",
        precioUnitario: "9999999999999.99999",
        tarifa: 13,
      }),
    ).toThrow(/outside|bound/i);
  });

  it("rejects input precision beyond the declared scale instead of rounding it", () => {
    expect(() =>
      calculateDraftLineMoney({
        cantidad: "1.0000",
        precioUnitario: "1",
        tarifa: 0,
      }),
    ).toThrow(/3 decimals/i);

    expect(() =>
      calculateDraftLineMoney({
        cantidad: "1",
        precioUnitario: "1.000005",
        tarifa: 0,
      }),
    ).toThrow(/5 decimals|decimales/i);
  });

  it("rejects exponent notation and non-positive quantities", () => {
    expect(() =>
      calculateDraftLineMoney({
        cantidad: "1e3",
        precioUnitario: "1",
        tarifa: 0,
      }),
    ).toThrow(/plain decimal/i);

    expect(() =>
      calculateDraftLineMoney({
        cantidad: "0",
        precioUnitario: "1",
        tarifa: 0,
      }),
    ).toThrow(/greater than zero/i);
  });

  it("sums quantized lines without a second rounding step", () => {
    const lines: DraftSummaryLine[] = [
      { subTotal: "0.1", impuestoNeto: "0", taxable: true },
      { subTotal: "0.2", impuestoNeto: "0", taxable: true },
    ];

    const summary = buildDraftSummary(lines, "01");
    expect(summary.totalVenta).toBe("0.3");
    expect(summary.totalComprobante).toBe("0.3");
    expect(summary.medioPago[0]?.totalMedioPago).toBe("0.3");
  });

  it("preserves every amount through JSON serialization", () => {
    const line = calculateDraftLineMoney({
      cantidad: "0.5",
      precioUnitario: "1.00001",
      tarifa: 13,
    });
    const summary = buildDraftSummary(
      [{ subTotal: line.subTotal, impuestoNeto: line.impuestoNeto, taxable: true }],
      "01",
    );

    const roundTrip = JSON.parse(JSON.stringify({ line, summary })) as {
      line: typeof line;
      summary: typeof summary;
    };

    expect(roundTrip).toEqual({ line, summary });
    expect(typeof roundTrip.line.montoTotal).toBe("string");
    expect(roundTrip.summary.totalComprobante).toBe("0.56501");
  });
});
