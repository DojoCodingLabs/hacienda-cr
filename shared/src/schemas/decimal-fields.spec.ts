import { describe, expect, it } from "vitest";
import {
  DecimalCurrencySchema,
  DecimalDiscountSchema,
  DecimalExonerationInputSchema,
  DecimalFactorSchema,
  DecimalMoneySchema,
  DecimalOtherChargeSchema,
  DecimalPaymentSchema,
  DecimalPercentageSchema,
  DecimalPositiveMoneySchema,
  DecimalProportionSchema,
  DecimalQuantitySchema,
  DecimalRateSchema,
  DecimalSpecificQuantitySchema,
  DecimalTaxInputSchema,
  DecimalTaxTotalSchema,
} from "./decimal-fields.js";

describe("decimal fields", () => {
  it("preserves a valid monetary text and rejects non-text or malformed values", () => {
    expect(DecimalMoneySchema.parse("113000.00001")).toBe("113000.00001");
    const rejected = [
      "",
      "NaN",
      "Infinity",
      "1e3",
      "1E3",
      "-1",
      "+1",
      "01.00",
      "1.000001",
      "10000000000000",
      1,
    ];
    for (const value of rejected) {
      expect(DecimalMoneySchema.safeParse(value).success).toBe(false);
    }
    expect(DecimalMoneySchema.safeParse("9999999999999.99999").success).toBe(true);
  });

  it("enforces quantity, rate, factor, percentage and proportion scales", () => {
    expect(DecimalQuantitySchema.parse("9999999999999.999")).toBe("9999999999999.999");
    expect(DecimalQuantitySchema.safeParse("9999999999999999").success).toBe(false);
    expect(DecimalQuantitySchema.safeParse("1.0001").success).toBe(false);
    expect(DecimalRateSchema.parse("99.99")).toBe("99.99");
    expect(DecimalRateSchema.safeParse("100").success).toBe(false);
    expect(DecimalFactorSchema.parse("9.9999")).toBe("9.9999");
    expect(DecimalPercentageSchema.parse("100")).toBe("100");
    expect(DecimalProportionSchema.parse("99999.99999")).toBe("99999.99999");
    expect(DecimalSpecificQuantitySchema.parse("99999.99")).toBe("99999.99");
  });

  it("rejects JSON numbers and out-of-bound values in monetary fields", () => {
    expect(DecimalPositiveMoneySchema.safeParse(1).success).toBe(false);
    expect(DecimalPositiveMoneySchema.safeParse("0").success).toBe(false);
    expect(DecimalPositiveMoneySchema.safeParse("-0.00001").success).toBe(false);
    expect(DecimalPositiveMoneySchema.parse("0.00001")).toBe("0.00001");
  });

  it("validates tax, discount, charge, payment, currency and summary sub-schemas", () => {
    expect(
      DecimalTaxInputSchema.safeParse({
        codigo: "01",
        codigoTarifaIVA: "08",
        tarifa: "13",
      }).success,
    ).toBe(true);
    expect(
      DecimalTaxInputSchema.safeParse({
        codigo: "01",
        codigoTarifaIVA: "08",
        tarifa: "13",
        monto: "10",
      }).success,
    ).toBe(false);
    expect(
      DecimalTaxInputSchema.safeParse({
        codigo: "05",
        codigoTarifaIVA: "08",
        tarifa: "13",
        datosImpuestoEspecifico: {
          cantidadUnidadMedida: "1",
          volumenUnidadConsumo: "1",
          impuestoUnidad: "10",
        },
        monto: "10",
      }).success,
    ).toBe(true);
    expect(
      DecimalDiscountSchema.safeParse({ codigoDescuento: "99", montoDescuento: "1" }).success,
    ).toBe(false);
    expect(
      DecimalDiscountSchema.safeParse({
        codigoDescuento: "99",
        montoDescuento: "1",
        codigoDescuentoOtros: "Otro descuento",
      }).success,
    ).toBe(true);
    expect(
      DecimalOtherChargeSchema.safeParse({
        tipoDocumento: "01",
        detalle: "Cargo",
        montoCargo: "1",
      }).success,
    ).toBe(true);
    expect(
      DecimalPaymentSchema.safeParse({ tipoMedioPago: "99", totalMedioPago: "1" }).success,
    ).toBe(false);
    expect(
      DecimalPaymentSchema.safeParse({
        tipoMedioPago: "99",
        totalMedioPago: "1",
        medioPagoOtros: "Otro",
      }).success,
    ).toBe(true);
    expect(DecimalCurrencySchema.safeParse({ codigoMoneda: "CRC", tipoCambio: "1" }).success).toBe(
      true,
    );
    expect(DecimalTaxTotalSchema.safeParse({ codigo: "01", totalMontoImpuesto: "1" }).success).toBe(
      true,
    );
    expect(
      DecimalExonerationInputSchema.safeParse({
        tipoDocumento: "01",
        numeroDocumento: "123",
        nombreInstitucion: "01",
        fechaEmision: "2025-01-01",
        tarifaExonerada: "5",
      }).success,
    ).toBe(true);
  });

  it("preserves values through JSON and structuredClone", () => {
    const value = DecimalMoneySchema.parse("113000.00001");
    expect(structuredClone(value)).toBe(value);
    expect(JSON.parse(JSON.stringify({ value })).value).toBe(value);
  });
});
