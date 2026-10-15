/**
 * Tests for the shared catalog schemas in common.ts.
 */

import {
  TaxCode,
  IvaRateCode,
  ExonerationType,
  PaymentMethod,
  SaleCondition,
  REP_SALE_CONDITIONS,
} from "../constants/index.js";
import {
  TaxCodeSchema,
  IvaRateCodeSchema,
  ExonerationTypeSchema,
  PaymentMethodSchema,
  SaleConditionSchema,
} from "./common.js";

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
