/**
 * Property-based tests for the tax calculator.
 *
 * The invariants below are the ones that make a comprobante internally
 * consistent: line totals add up to the summary, the summary decomposes
 * exactly, every tax equals base × tarifa under Hacienda rounding, and no
 * monetary value on the money path is a plain `number`.
 *
 * They run in the normal suite with a modest number of cases and, via
 * `pnpm test:properties`, with a much larger `PROPERTY_RUNS` budget.
 */

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { Money, ZERO } from "@dojocoding/hacienda-shared";
import type { Impuesto, Descuento } from "@dojocoding/hacienda-shared";
import {
  calculateInvoiceSummary,
  calculateLineItemTotals,
  round5,
  type CalculatedLineItem,
  type InvoiceSummary,
  type LineItemInput,
  type LineItemTaxInput,
} from "./calculator.js";

/** Number of generated cases; the CI `test:properties` run raises this. */
const PROPERTY_RUNS = Number(process.env.PROPERTY_RUNS ?? 250);

// The exhaustive `test:properties` budget (10k+ cases per property) can exceed
// Vitest's default 5s per-test timeout, so raise it for this file.
vi.setConfig({ testTimeout: 120_000 });

// ---------------------------------------------------------------------------
// Exact integer helpers (1e-5 units) — an oracle free of binary floating point
// ---------------------------------------------------------------------------

function moneyFromUnits5(units: bigint): Money {
  const whole = units / 100000n;
  const fraction = units % 100000n;
  return Money.fromString(`${whole}.${fraction.toString().padStart(5, "0")}`);
}

const IVA_RATES = [0, 1, 2, 4, 8, 13] as const;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

interface LineSpec {
  cantidad: number;
  precioUnits: bigint;
  descuentoPct: number | undefined;
  tax: LineItemTaxInput;
  esServicio: boolean;
}

function taxSpec(options: {
  tarifa: number;
  codigo: string;
  codigoTarifaIVA: string;
  exoneracion: "none" | "full" | "half";
}): LineItemTaxInput {
  const base = {
    codigo: options.codigo,
    codigoTarifaIVA: options.codigoTarifaIVA,
    tarifa: options.tarifa,
  };
  if (options.exoneracion === "none") return base;

  return {
    ...base,
    exoneracion: {
      tipoDocumento: "03",
      numeroDocumento: "AL-001-2025",
      nombreInstitucion: "02",
      fechaEmision: "2025-01-15T00:00:00-06:00",
      tarifaExonerada: options.exoneracion === "full" ? options.tarifa : options.tarifa / 2,
    },
  };
}

const lineSpec = fc
  .record({
    cantidad: fc.integer({ min: 1, max: 1000 }),
    precioUnits: fc.nat({ max: 10 ** 9 }),
    descuentoPct: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    tarifa: fc.constantFrom(...IVA_RATES),
    codigo: fc.constantFrom("01", "01", "01", "02"),
    codigoTarifaIVA: fc.constantFrom("01", "08", "10"),
    exoneracion: fc.constantFrom("none", "none", "full", "half"),
    esServicio: fc.boolean(),
  })
  .map((spec): LineSpec => ({
    cantidad: spec.cantidad,
    precioUnits: BigInt(spec.precioUnits),
    descuentoPct: spec.descuentoPct,
    esServicio: spec.esServicio,
    tax: taxSpec({
      tarifa: spec.tarifa,
      codigo: spec.codigo,
      codigoTarifaIVA: spec.codigoTarifaIVA,
      exoneracion: spec.exoneracion,
    }),
  }));

function buildLine(spec: LineSpec, index: number): LineItemInput {
  const precioUnitario = moneyFromUnits5(spec.precioUnits);
  const gross = precioUnitario.times(spec.cantidad).round(5);

  const descuento: Descuento[] | undefined =
    spec.descuentoPct === undefined
      ? undefined
      : [
          {
            montoDescuento: gross.times(spec.descuentoPct).dividedBy(100).round(5),
            codigoDescuento: "01" as Descuento["codigoDescuento"],
            naturalezaDescuento: "Propiedad",
          },
        ];

  return {
    numeroLinea: index + 1,
    codigoCabys: "4321000000000",
    cantidad: spec.cantidad,
    unidadMedida: "Unp",
    detalle: "Linea de propiedad",
    precioUnitario,
    esServicio: spec.esServicio,
    impuesto: [spec.tax],
    ...(descuento ? { descuento } : {}),
  };
}

interface InvoiceCase {
  lines: CalculatedLineItem[];
  summary: InvoiceSummary;
  otrosCargos: Money;
}

function makeCase(lineSpecs: LineSpec[], otrosUnits: number | undefined): InvoiceCase {
  const lines = lineSpecs.map((spec, index) => calculateLineItemTotals(buildLine(spec, index)));
  const otrosCargos = otrosUnits === undefined ? ZERO : moneyFromUnits5(BigInt(otrosUnits));
  return { lines, summary: calculateInvoiceSummary(lines, otrosCargos), otrosCargos };
}

const invoiceCase: fc.Arbitrary<InvoiceCase> = fc
  .array(lineSpec, { minLength: 1, maxLength: 8 })
  .chain((lineSpecs) =>
    fc
      .option(fc.nat({ max: 10 ** 8 }), { nil: undefined })
      .map((otrosUnits) => makeCase(lineSpecs, otrosUnits)),
  );

/** Adversarial case: many lines, tiny and huge amounts, max discounts. */
const adversarialCase: fc.Arbitrary<InvoiceCase> = fc
  .array(lineSpec, { minLength: 8, maxLength: 30 })
  .map((specs, index) =>
    makeCase(
      specs.map((spec, position) => ({
        ...spec,
        // Alternate between the smallest representable amount and a large one.
        precioUnits: position % 2 === 0 ? 1n : 9_000_000_000_000n,
        descuentoPct: 100,
        tarifa: IVA_RATES[index % IVA_RATES.length] ?? 13,
      })),
      undefined,
    ),
  );

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

function lineTotalSum(lines: CalculatedLineItem[]): Money {
  return lines.reduce((sum, line) => sum.plus(line.montoTotalLinea), ZERO);
}

function taxNetSum(lines: CalculatedLineItem[]): Money {
  return lines.reduce((sum, line) => sum.plus(line.impuestoNeto ?? ZERO), ZERO);
}

describe("calculator properties (summary consistency)", () => {
  it("the sum of line totals equals the grand total", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines, summary, otrosCargos }) => {
        expect(taxNetSum(lines).equals(summary.totalImpuesto)).toBe(true);
        expect(round5(summary.totalComprobante).equals(summary.totalComprobante)).toBe(true);
        expect(summary.totalComprobante.minus(otrosCargos).equals(lineTotalSum(lines))).toBe(true);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("decomposes the summary exactly", () => {
    fc.assert(
      fc.property(invoiceCase, ({ summary, otrosCargos }) => {
        expect(
          summary.totalVenta.minus(summary.totalDescuentos).equals(summary.totalVentaNeta),
        ).toBe(true);
        expect(
          summary.totalVentaNeta
            .plus(summary.totalImpuesto)
            .plus(otrosCargos)
            .equals(summary.totalComprobante),
        ).toBe(true);
        expect(
          summary.totalGravado
            .plus(summary.totalExento)
            .plus(summary.totalExonerado)
            .equals(summary.totalVenta),
        ).toBe(true);
        expect(
          summary.totalGravado
            .plus(summary.totalExento)
            .plus(summary.totalExonerado)
            .minus(summary.totalDescuentos)
            .equals(summary.totalVentaNeta),
        ).toBe(true);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("aggregates the per-rate tax breakdown consistently", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines, summary }) => {
        let expected = ZERO;
        for (const line of lines) {
          for (const tax of line.impuesto) {
            const exonerated = tax.exoneracion?.montoExoneracion ?? ZERO;
            const net = tax.monto.minus(exonerated);
            expected = expected.plus(net.isNegative() ? ZERO : net);
          }
        }
        const breakdown = summary.totalDesgloseImpuesto.reduce(
          (sum, entry) => sum.plus(entry.totalMontoImpuesto),
          ZERO,
        );
        expect(breakdown.equals(expected)).toBe(true);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe("calculator properties (line and tax contract)", () => {
  it("keeps montoTotal, subTotal and montoTotalLinea coherent", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines }) => {
        for (const line of lines) {
          expect(round5(line.montoTotal).equals(line.montoTotal)).toBe(true);
          expect(
            line.montoTotalLinea.equals(round5(line.subTotal.plus(line.impuestoNeto ?? ZERO))),
          ).toBe(true);
          expect(line.baseImponible?.equals(line.subTotal)).toBe(true);
          expect(line.subTotal.isNegative()).toBe(false);
          expect(line.montoTotalLinea.isNegative()).toBe(false);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("computes each tax as base × tarifa under Hacienda rounding", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines }) => {
        for (const line of lines) {
          for (const tax of line.impuesto) {
            const expected = round5(line.subTotal.times(tax.tarifa).dividedBy(100));
            expect(tax.monto.equals(expected)).toBe(true);
            expect(tax.monto.isNegative()).toBe(false);
          }
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("brackets the net tax between zero and the full tax", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines }) => {
        for (const line of lines) {
          const fullTax = line.impuesto
            .filter((tax: Impuesto) => tax.codigo === "01")
            .reduce((sum, tax) => sum.plus(tax.monto), ZERO);
          const net = line.impuestoNeto ?? ZERO;
          expect(net.isNegative()).toBe(false);
          expect(net.greaterThan(fullTax)).toBe(false);
          for (const tax of line.impuesto) {
            const exonerated = tax.exoneracion?.montoExoneracion ?? ZERO;
            expect(exonerated.greaterThan(tax.monto)).toBe(false);
          }
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("never leaves a plain number on the money path", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines, summary }) => {
        const moneyFields: (Money | undefined)[] = [
          summary.totalServGravados,
          summary.totalServExentos,
          summary.totalServExonerado,
          summary.totalMercanciasGravadas,
          summary.totalMercanciasExentas,
          summary.totalMercExonerada,
          summary.totalGravado,
          summary.totalExento,
          summary.totalExonerado,
          summary.totalVenta,
          summary.totalDescuentos,
          summary.totalVentaNeta,
          summary.totalImpuesto,
          summary.totalComprobante,
          ...summary.totalDesgloseImpuesto.map((entry) => entry.totalMontoImpuesto),
        ];
        for (const line of lines) {
          moneyFields.push(
            line.precioUnitario,
            line.montoTotal,
            line.subTotal,
            line.baseImponible,
            line.impuestoNeto,
            line.montoTotalLinea,
            ...line.impuesto.map((tax) => tax.monto),
            ...line.impuesto.map((tax) => tax.exoneracion?.montoExoneracion),
          );
        }
        for (const value of moneyFields) {
          if (value === undefined) continue;
          expect(value).toBeInstanceOf(Money);
          expect(typeof value).not.toBe("number");
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("rounds every money output to at most five decimals", () => {
    fc.assert(
      fc.property(invoiceCase, ({ lines, summary }) => {
        const rendered = [
          summary.totalComprobante,
          summary.totalImpuesto,
          summary.totalVentaNeta,
          ...lines.map((line) => line.montoTotalLinea),
        ].map((value) => value.toXMLString());
        for (const xml of rendered) {
          expect(xml).toMatch(/^\d+(\.\d{1,5})?$/);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe("calculator properties (adversarial inputs)", () => {
  it("keeps every invariant with extreme amounts, max discounts and mixed rates", () => {
    fc.assert(
      fc.property(adversarialCase, ({ lines, summary, otrosCargos }) => {
        expect(summary.totalComprobante.minus(otrosCargos).equals(lineTotalSum(lines))).toBe(true);
        expect(
          summary.totalVentaNeta
            .plus(summary.totalImpuesto)
            .plus(otrosCargos)
            .equals(summary.totalComprobante),
        ).toBe(true);
        expect(
          summary.totalVenta.minus(summary.totalDescuentos).equals(summary.totalVentaNeta),
        ).toBe(true);
        for (const line of lines) {
          expect(line.subTotal.isNegative()).toBe(false);
          expect(line.subTotal.equals(ZERO)).toBe(true); // 100% discount
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
