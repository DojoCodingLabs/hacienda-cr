import { describe, expect, it } from "vitest";
import fc from "fast-check";
import * as oracle from "../__testing__/decimal-oracle.js";
import {
  calculateDecimalLineItemTotals,
  calculateDecimalInvoiceSummary,
} from "./decimal-document.js";

const money = fc.double({ min: 0.01, max: 1000, noNaN: true }).map((n) => n.toFixed(2));
const qty = fc.double({ min: 1, max: 10, noNaN: true }).map((n) => n.toFixed(2));

describe("decimal document properties", () => {
  it("sums line totals and taxes exactly", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(qty, money), { minLength: 1, maxLength: 4 }), (rows) => {
        const lines = rows.map(([cantidad, precio], index) => ({
          numeroLinea: index + 1,
          codigoCabys: "4321000000000",
          cantidad,
          unidadMedida: "Sp" as const,
          detalle: "Propiedad",
          precioUnitario: precio,
          impuesto: [{ codigo: "01" as const, codigoTarifaIVA: "08" as const, tarifa: "13" }],
          esServicio: false,
        }));
        const calculated = lines.map((line) => calculateDecimalLineItemTotals(line));
        const summary = calculateDecimalInvoiceSummary(calculated, {
          codigoMoneda: "CRC",
          tipoCambio: "1",
        });
        const expectedGross = oracle.sum(
          rows.map(([q, p]) => oracle.round(oracle.multiply(q, p), 5)),
        );
        const expectedTax = oracle.sum(
          rows.map(([q, p]) =>
            oracle.round(
              oracle.divide(
                oracle.multiply(oracle.round(oracle.multiply(q, p), 5), "13"),
                "100",
                5,
              ),
              5,
            ),
          ),
        );
        expect(oracle.equal(summary.totalVenta ?? "0", expectedGross)).toBe(true);
        expect(oracle.equal(summary.totalImpuesto ?? "0", expectedTax)).toBe(true);
        expect(
          oracle.equal(summary.totalComprobante ?? "0", oracle.add(expectedGross, expectedTax)),
        ).toBe(true);
        for (const line of calculated) {
          expect(
            oracle.equal(
              line.montoTotal,
              oracle.round(oracle.multiply(line.cantidad, line.precioUnitario), 5),
            ),
          ).toBe(true);
        }
      }),
      { numRuns: Number(process.env.PROPERTY_RUNS ?? 100) },
    );
  });

  it("preserves discounts and exoneration boundaries", () => {
    fc.assert(
      fc.property(qty, money, (cantidad, precio) => {
        const gross = oracle.round(oracle.multiply(cantidad, precio), 5);
        const discount = oracle.round(oracle.multiply(gross, "0.1"), 5);
        const net = oracle.subtract(gross, discount);
        const tax = oracle.round(oracle.divide(oracle.multiply(net, "13"), "100", 5), 5);
        const line = calculateDecimalLineItemTotals({
          numeroLinea: 1,
          codigoCabys: "4321000000000",
          cantidad,
          unidadMedida: "Sp",
          detalle: "Descuento",
          precioUnitario: precio,
          descuento: [{ codigoDescuento: "01", montoDescuento: discount }],
          impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
        });
        expect(oracle.equal(line.subTotal, net)).toBe(true);
        expect(oracle.equal(line.impuestoNeto ?? "0", tax)).toBe(true);
        const summary = calculateDecimalInvoiceSummary([line], {
          codigoMoneda: "CRC",
          tipoCambio: "1",
        });
        expect(oracle.equal(summary.totalDescuentos ?? "0", discount)).toBe(true);
      }),
      { numRuns: Number(process.env.PROPERTY_RUNS ?? 100) },
    );
  });
});
