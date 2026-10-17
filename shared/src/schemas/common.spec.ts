/**
 * Tests for the shared catalog schemas in common.ts.
 */

import { REP_SALE_CONDITIONS } from "../constants/index.js";
import {
  ExonerationType,
  IvaRateCode,
  PaymentMethod,
  SaleCondition,
  TaxCode,
} from "../generated/index.js";
import {
  TaxCodeSchema,
  IvaRateCodeSchema,
  ExonerationTypeSchema,
  PaymentMethodSchema,
  SaleConditionSchema,
  MoneyInputSchema,
  MontoSchema,
  MontoPositiveSchema,
} from "./common.js";
import { Money } from "../types/money.js";
import { ImpuestoSchema, DescuentoSchema } from "./linea-detalle.js";

describe("Catalog schemas", () => {
  it("should accept exactly the full TaxCode catalog", () => {
    expect([...TaxCodeSchema.options].sort()).toEqual(Object.values(TaxCode).sort());
  });

  it("should accept exactly the full IvaRateCode catalog", () => {
    expect([...IvaRateCodeSchema.options].sort()).toEqual(Object.values(IvaRateCode).sort());
  });

  it("should accept exactly the full ExonerationType catalog", () => {
    expect([...ExonerationTypeSchema.options].sort()).toEqual(
      Object.values(ExonerationType).sort(),
    );
  });

  it("should accept exactly the full PaymentMethod catalog", () => {
    expect([...PaymentMethodSchema.options].sort()).toEqual(Object.values(PaymentMethod).sort());
  });

  it("should exclude exactly the REP-only sale conditions", () => {
    for (const code of REP_SALE_CONDITIONS) {
      expect(SaleConditionSchema.options).not.toContain(code);
    }
    // Lockstep guarantee: schema options plus the REP-only codes must
    // partition the full SaleCondition catalog, so a new REP-only code
    // added to the constants fails here until the exclusion is updated.
    expect([...SaleConditionSchema.options, ...REP_SALE_CONDITIONS].sort()).toEqual(
      Object.values(SaleCondition).sort(),
    );
  });
});

describe("Monetary input boundary", () => {
  it("should accept a Money amount and normalize it to its decimal number", () => {
    const parsed = MontoSchema.parse(Money.fromString("113.45"));
    expect(parsed).toBe(113.45);
    expect(typeof parsed).toBe("number");
  });

  it("should accept the same document with numbers or Money and produce the same result", () => {
    const asNumber = ImpuestoSchema.parse({
      codigo: "01",
      codigoTarifaIVA: "08",
      tarifa: 13,
      monto: 113.45,
    });
    const asMoney = ImpuestoSchema.parse({
      codigo: "01",
      codigoTarifaIVA: "08",
      tarifa: 13,
      monto: Money.fromString("113.45"),
    });
    expect(asMoney).toEqual(asNumber);
    expect(asNumber.monto).toBe(113.45);
  });

  it("should still enforce the non-negative restriction for both inputs", () => {
    expect(MontoSchema.safeParse(-1).success).toBe(false);
    expect(MontoSchema.safeParse(Money.fromString("-1")).success).toBe(false);
    expect(MontoSchema.safeParse(Money.fromString("0")).success).toBe(true);
  });

  it("should require strictly positive amounts where the schema says so", () => {
    expect(MontoPositiveSchema.safeParse(0).success).toBe(false);
    expect(MontoPositiveSchema.safeParse(Money.fromString("0")).success).toBe(false);
    expect(
      DescuentoSchema.safeParse({ montoDescuento: Money.fromString("0"), codigoDescuento: "01" })
        .success,
    ).toBe(false);
    expect(
      DescuentoSchema.safeParse({
        montoDescuento: Money.fromString("0.00001"),
        codigoDescuento: "01",
      }).success,
    ).toBe(true);
  });

  it("should reject non-monetary values without throwing an uncontrolled exception", () => {
    for (const value of ["113.45", null, undefined, {}, { toNumber: 1 }, [], true]) {
      expect(() => MoneyInputSchema.safeParse(value)).not.toThrow();
      expect(MoneyInputSchema.safeParse(value).success).toBe(false);
    }
  });
});
