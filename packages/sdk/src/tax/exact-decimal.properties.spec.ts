import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calculateExactOrdinaryMoney } from "./exact-ordinary.js";
import { fromNumber, multiply, parse, percent, ratio, round, text } from "./exact-decimal.js";
import * as oracle from "../__testing__/decimal-oracle.js";

/**
 * Property battery for the exact monetary kernel.
 *
 * Every invariant is judged against `../__testing__/decimal-oracle.ts`, an
 * independent implementation written with a different representation (plain
 * decimal strings, digit-by-digit arithmetic, no `BigInt` and no `Number` in
 * the arithmetic path). The oracle cannot reproduce a defect of the kernel it
 * checks, so a shared mistake shows up as a disagreement.
 *
 * The budget is configurable so CI can raise it without touching the code:
 * `PROPERTY_NUM_RUNS` (default 1000 for the path, 500 for the primitives).
 */

const RUNS = Number(process.env.PROPERTY_NUM_RUNS ?? "1000");
const PRIMITIVE_RUNS = Math.max(100, Math.floor(RUNS / 2));

/**
 * The battery is slower than a unit test and slower still when the whole
 * suite runs in parallel, so its budget is bounded by an explicit timeout
 * instead of the 5 s default.
 */
const PROPERTY_TIMEOUT = 120_000;

/** Build a plain decimal text with a bounded integer and fraction. */
function decimalText(
  maxIntegerDigits: number,
  maxDecimals: number,
  minInteger = 0,
): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.integer({ min: minInteger, max: 10 ** maxIntegerDigits - 1 }),
      fc.integer({ min: 0, max: 10 ** maxDecimals - 1 }),
      fc.integer({ min: 0, max: maxDecimals }),
    )
    .map(([whole, fraction, decimals]) =>
      decimals === 0 ? `${whole}` : `${whole}.${String(fraction).padStart(decimals, "0")}`,
    );
}

/** A positive monetary text with at most five decimals. */
const positiveMoney = decimalText(9, 5, 1);

/** A unit price bounded so that the gross amount stays inside the money bound. */
const unitPrice = decimalText(4, 5, 1);

/**
 * A quantity with at most three decimals. The generated quantities and prices
 * are bounded so that the gross amount, and the sum of up to four lines, stay
 * inside the monetary bound the kernel enforces.
 */
const quantity = decimalText(7, 3, 1);

/** Scale a decimal text into the kernel's scaled representation. */
function scaledOf(value: string, scale: number): bigint {
  return parse(value, scale);
}

/** Render a scaled kernel value back to plain decimal text. */
function plainOf(value: bigint, scale: number): string {
  return text(value, scale);
}

describe("kernel monetario", () => {
  it(
    "multiplica como el oráculo independiente",
    () => {
      fc.assert(
        fc.property(positiveMoney, positiveMoney, (a, b) => {
          const kernel = plainOf(multiply(scaledOf(a, 5), scaledOf(b, 5), 5, 5, 5), 5);
          const expected = oracle.round(oracle.multiply(a, b), 5);
          expect(oracle.equal(kernel, expected)).toBe(true);
        }),
        { numRuns: PRIMITIVE_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );

  it(
    "aplica el porcentaje como el oráculo independiente",
    () => {
      fc.assert(
        fc.property(positiveMoney, positiveMoney, (amount, rate) => {
          const kernel = plainOf(percent(scaledOf(amount, 5), scaledOf(rate, 5), 5, 5, 5), 5);
          const expected = oracle.round(oracle.divide(oracle.multiply(amount, rate), "100", 5), 5);
          expect(oracle.equal(kernel, expected)).toBe(true);
        }),
        { numRuns: PRIMITIVE_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );

  it(
    "resuelve la razón como el oráculo independiente",
    () => {
      fc.assert(
        fc.property(positiveMoney, positiveMoney, positiveMoney, (amount, part, whole) => {
          const kernel = plainOf(
            ratio(scaledOf(amount, 5), scaledOf(part, 5), scaledOf(whole, 5), 5, 5, 5),
            5,
          );
          const expected = oracle.round(oracle.divide(oracle.multiply(amount, part), whole, 5), 5);
          expect(oracle.equal(kernel, expected)).toBe(true);
        }),
        { numRuns: PRIMITIVE_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );

  it(
    "redondea HALF_UP como el oráculo independiente",
    () => {
      fc.assert(
        fc.property(positiveMoney, positiveMoney, (a, b) => {
          // `round` divides two scaled integers and returns a ratio, so both
          // sides are judged at scale zero.
          const kernel = plainOf(round(scaledOf(a, 5), scaledOf(b, 5)), 0);
          const expected = oracle.divide(a, b, 0);
          expect(oracle.equal(kernel, expected)).toBe(true);
        }),
        { numRuns: PRIMITIVE_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );

  it(
    "lee un número finito por su representación más corta",
    () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          (value) => {
            const kernel = plainOf(fromNumber(value, 5), 5);
            const expected = oracle.round(String(value), 5);
            expect(oracle.equal(kernel, expected)).toBe(true);
          },
        ),
        { numRuns: PRIMITIVE_RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});

/** A generated line of the exact ordinary case. */
interface GeneratedLine {
  cantidad: string;
  precioUnitario: string;
  esServicio: boolean;
  descuento?:
    | { codigoDescuento: "04"; porcentaje: string }
    | { codigoDescuento: "05"; montoDescuento: string };
}

const lineArbitrary: fc.Arbitrary<GeneratedLine> = fc
  .tuple(
    quantity,
    unitPrice,
    fc.boolean(),
    fc.boolean(),
    fc.integer({ min: 1, max: 99 }),
    fc.integer({ min: 0, max: 99_999 }),
    fc.integer({ min: 0, max: 5 }),
  )
  .chain(([cantidad, precioUnitario, esServicio, withPercentage, whole, fraction, decimals]) => {
    const gross = oracle.round(oracle.multiply(cantidad, precioUnitario), 5);
    if (!withPercentage) {
      // An explicit amount discount is exact by construction; it is kept
      // strictly below the gross so the net stays positive.
      return fc.constant({
        cantidad,
        precioUnitario,
        esServicio,
        descuento: {
          codigoDescuento: "05" as const,
          montoDescuento: oracle.round(oracle.multiply(gross, "0.5"), 5),
        },
      });
    }
    const rate =
      decimals === 0 ? `${whole}` : `${whole}.${String(fraction).padStart(decimals, "0")}`;
    const applied = oracle.round(oracle.divide(oracle.multiply(gross, rate), "100", 5), 5);
    // A percentage that would eat the whole gross is replaced by the
    // smallest one, which always leaves a positive net.
    const safeRate = oracle.compare(applied, gross) < 0 ? rate : "1";
    return fc.constant({
      cantidad,
      precioUnitario,
      esServicio,
      descuento: { codigoDescuento: "04" as const, porcentaje: safeRate },
    });
  });

/** Expected gross amount of a line, computed by the oracle. */
function oracleGross(line: GeneratedLine): string {
  return oracle.round(oracle.multiply(line.cantidad, line.precioUnitario), 5);
}

/** Expected discount of a line, computed by the oracle. */
function oracleDiscount(line: GeneratedLine, gross: string): string {
  if (!line.descuento) return "0";
  if ("porcentaje" in line.descuento) {
    return oracle.round(
      oracle.divide(oracle.multiply(gross, line.descuento.porcentaje), "100", 5),
      5,
    );
  }
  return oracle.round(line.descuento.montoDescuento, 5);
}

describe("camino exacto ordinary", () => {
  it(
    "deriva cada línea de la cantidad y el precio, con IVA13 y pago asignado",
    () => {
      fc.assert(
        fc.property(fc.array(lineArbitrary, { minLength: 1, maxLength: 4 }), (lines) => {
          const source = {
            detalleServicio: lines.map((line, index) => ({
              numeroLinea: index + 1,
              codigoCabys: line.esServicio ? "8310100000000" : "1210100000000",
              unidadMedida: "Sp" as const,
              detalle: "Línea sintética de prueba",
              cantidad: line.cantidad,
              precioUnitario: line.precioUnitario,
              impuesto: [
                { codigo: "01" as const, codigoTarifaIVA: "08" as const, tarifa: "13" as const },
              ],
              esServicio: line.esServicio,
              ...(line.descuento ? { descuento: [line.descuento] } : {}),
            })),
            codigoTipoMoneda: { codigoMoneda: "CRC" as const, tipoCambio: "1" },
            medioPago: [] as { tipoMedioPago: "01"; totalMedioPago: string }[],
          };

          // The payment allocation is computed by the oracle, so the kernel only
          // agrees if its arithmetic matches the independent one.
          const expectedTotal = oracle.sum(
            lines.map((line) => {
              const gross = oracleGross(line);
              const net = oracle.subtract(gross, oracleDiscount(line, gross));
              const tax = oracle.round(oracle.divide(oracle.multiply(net, "13"), "100", 5), 5);
              return oracle.add(net, tax);
            }),
          );
          const calculated = calculateExactOrdinaryMoney({
            ...source,
            medioPago: [{ tipoMedioPago: "01", totalMedioPago: expectedTotal }],
          });

          lines.forEach((line, index) => {
            const gross = oracleGross(line);
            const discount = oracleDiscount(line, gross);
            const net = oracle.subtract(gross, discount);
            const tax = oracle.round(oracle.divide(oracle.multiply(net, "13"), "100", 5), 5);
            const calculatedLine = calculated.detalleServicio[index];
            expect(calculatedLine).toBeDefined();
            expect(oracle.equal(calculatedLine?.montoTotal ?? "0", gross)).toBe(true);
            expect(oracle.equal(calculatedLine?.subTotal ?? "0", net)).toBe(true);
            expect(oracle.equal(calculatedLine?.baseImponible ?? "0", net)).toBe(true);
            expect(oracle.equal(calculatedLine?.impuestoNeto ?? "0", tax)).toBe(true);
            expect(oracle.equal(calculatedLine?.impuesto[0]?.monto ?? "0", tax)).toBe(true);
            expect(oracle.equal(calculatedLine?.montoTotalLinea ?? "0", oracle.add(net, tax))).toBe(
              true,
            );
          });

          const summary = calculated.resumenFactura;
          expect(oracle.equal(summary.totalVenta ?? "0", oracle.sum(lines.map(oracleGross)))).toBe(
            true,
          );
          expect(
            oracle.equal(
              summary.totalDescuentos ?? "0",
              oracle.sum(lines.map((line) => oracleDiscount(line, oracleGross(line)))),
            ),
          ).toBe(true);
          expect(
            oracle.equal(
              summary.totalVentaNeta ?? "0",
              oracle.subtract(summary.totalVenta ?? "0", summary.totalDescuentos ?? "0"),
            ),
          ).toBe(true);
          expect(oracle.equal(summary.totalComprobante, expectedTotal)).toBe(true);
          expect(
            oracle.equal(
              summary.totalImpuesto ?? "0",
              oracle.sum(
                lines.map((line) => {
                  const gross = oracleGross(line);
                  const net = oracle.subtract(gross, oracleDiscount(line, gross));
                  return oracle.round(oracle.divide(oracle.multiply(net, "13"), "100", 5), 5);
                }),
              ),
            ),
          ).toBe(true);
        }),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});

describe("casos adversariales", () => {
  it("rechaza un bruto redondeado a cero", () => {
    expect(() =>
      calculateExactOrdinaryMoney({
        detalleServicio: [
          {
            numeroLinea: 1,
            codigoCabys: "8310100000000",
            unidadMedida: "Sp",
            detalle: "Línea sintética de prueba",
            cantidad: "0.00001",
            precioUnitario: "0.00001",
            impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
            esServicio: true,
          },
        ],
        codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
        medioPago: [{ tipoMedioPago: "01", totalMedioPago: "0.00001" }],
      }),
    ).toThrow(/Zero-gross line is outside ordinary exact FE/);
  });

  it("rechaza una línea con descuento del cien por ciento", () => {
    expect(() =>
      calculateExactOrdinaryMoney({
        detalleServicio: [
          {
            numeroLinea: 1,
            codigoCabys: "8310100000000",
            unidadMedida: "Sp",
            detalle: "Línea sintética de prueba",
            cantidad: "1",
            precioUnitario: "100",
            descuento: [{ codigoDescuento: "04", porcentaje: "100" }],
            impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
            esServicio: true,
          },
        ],
        codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
        medioPago: [{ tipoMedioPago: "01", totalMedioPago: "0" }],
      }),
    ).toThrow(/Zero or negative net line is outside ordinary exact FE/);
  });

  it("rechaza un pago que no cubre el total", () => {
    expect(() =>
      calculateExactOrdinaryMoney({
        detalleServicio: [
          {
            numeroLinea: 1,
            codigoCabys: "8310100000000",
            unidadMedida: "Sp",
            detalle: "Línea sintética de prueba",
            cantidad: "1",
            precioUnitario: "100",
            impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
            esServicio: true,
          },
        ],
        codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
        medioPago: [{ tipoMedioPago: "01", totalMedioPago: "112.99999" }],
      }),
    ).toThrow(/payment allocation must equal invoice total/);
  });

  it("acepta una cantidad de dieciséis dígitos y calcula el monto grande", () => {
    const cantidad = "9999999999999999";
    const precioUnitario = "0.00001";
    const gross = oracle.round(oracle.multiply(cantidad, precioUnitario), 5);
    const tax = oracle.round(oracle.divide(oracle.multiply(gross, "13"), "100", 5), 5);
    const total = oracle.add(gross, tax);
    const calculated = calculateExactOrdinaryMoney({
      detalleServicio: [
        {
          numeroLinea: 1,
          codigoCabys: "8310100000000",
          unidadMedida: "Sp",
          detalle: "Línea sintética de prueba",
          cantidad,
          precioUnitario,
          impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
          esServicio: true,
        },
      ],
      codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: total }],
    });
    expect(oracle.equal(calculated.detalleServicio[0]?.montoTotal ?? "0", gross)).toBe(true);
    expect(oracle.equal(calculated.resumenFactura.totalComprobante, total)).toBe(true);
  });

  it("acepta un monto grande dentro de la cota", () => {
    const cantidad = "999999999";
    const precioUnitario = "0.00001";
    const gross = oracle.round(oracle.multiply(cantidad, precioUnitario), 5);
    const tax = oracle.round(oracle.divide(oracle.multiply(gross, "13"), "100", 5), 5);
    const total = oracle.add(gross, tax);
    const calculated = calculateExactOrdinaryMoney({
      detalleServicio: [
        {
          numeroLinea: 1,
          codigoCabys: "8310100000000",
          unidadMedida: "Sp",
          detalle: "Línea sintética de prueba",
          cantidad,
          precioUnitario,
          impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
          esServicio: true,
        },
      ],
      codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: total }],
    });
    expect(oracle.equal(calculated.detalleServicio[0]?.montoTotal ?? "0", gross)).toBe(true);
    expect(oracle.equal(calculated.resumenFactura.totalComprobante, total)).toBe(true);
  });
});

/**
 * Mutants of the kernel, kept next to the battery so the oracle is proved
 * able to catch the defects it is supposed to catch. A mutant stands in for
 * a broken kernel: if the oracle cannot tell it apart from the correct
 * result, the battery would not be protecting anything.
 */
function multiplyTruncating(
  a: bigint,
  b: bigint,
  aScale: number,
  bScale: number,
  outScale: number,
): bigint {
  const product = a * b;
  const excess = aScale + bScale - outScale;
  return excess <= 0 ? product * 10n ** BigInt(-excess) : product / 10n ** BigInt(excess);
}

describe("detección de mutaciones", () => {
  it("el oráculo distingue un kernel que trunca en vez de redondear", () => {
    // 1.5 * 0.00001 = 0.000015: the sixth decimal decides the result.
    const a = "1.5";
    const b = "0.00001";
    const correct = plainOf(multiply(scaledOf(a, 5), scaledOf(b, 5), 5, 5, 5), 5);
    const mutant = plainOf(multiplyTruncating(scaledOf(a, 5), scaledOf(b, 5), 5, 5, 5), 5);
    const expected = oracle.round(oracle.multiply(a, b), 5);
    expect(oracle.equal(correct, expected)).toBe(true);
    expect(oracle.equal(mutant, expected)).toBe(false);
  });

  it("el oráculo distingue un descuento aplicado a la base equivocada", () => {
    const gross = "100";
    const rate = "10";
    const correct = oracle.round(oracle.divide(oracle.multiply(gross, rate), "100", 5), 5);
    // A sequential base: the discount is taken from the net instead of the gross.
    const mutant = oracle.round(
      oracle.divide(oracle.multiply(oracle.subtract(gross, correct), rate), "100", 5),
      5,
    );
    expect(oracle.equal(correct, mutant)).toBe(false);
  });

  it("el oráculo distingue un total desplazado un céntimo", () => {
    expect(oracle.equal("113", "113.00001")).toBe(false);
  });
});
