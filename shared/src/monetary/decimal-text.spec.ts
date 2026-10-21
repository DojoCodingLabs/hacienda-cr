import { describe, expect, it } from "vitest";
import {
  MAX_MONEY_SCALED,
  MONEY_SCALE,
  MONETARY_TEXT_PATTERN,
  MonetaryValueError,
  formatScaledDecimal,
  normalizeMonetaryInput,
  parseMonetaryText,
  scaledFromNumber,
  scaledFromPlainDecimal,
} from "./decimal-text.js";
import { MoneyInputSchema, MontoPositiveSchema } from "../schemas/common.js";

describe("parseMonetaryText", () => {
  it("scales a bounded decimal text exactly", () => {
    expect(parseMonetaryText("0")).toBe(0n);
    expect(parseMonetaryText("1")).toBe(100000n);
    expect(parseMonetaryText("0.1")).toBe(10000n);
    expect(parseMonetaryText("113000")).toBe(11300000000n);
    expect(parseMonetaryText("0.00001")).toBe(1n);
    expect(parseMonetaryText("9999999999999.99999")).toBe(MAX_MONEY_SCALED);
  });

  it("rejects text outside the bounded domain", () => {
    expect(() => parseMonetaryText("1e5")).toThrow(/notación exponencial/);
    expect(() => parseMonetaryText("-1")).toThrow(/negativo/);
    expect(() => parseMonetaryText("1.123456")).toThrow(/más de 5 decimales/);
    expect(() => parseMonetaryText("0100")).toThrow(/fuera del dominio/);
    expect(() => parseMonetaryText("abc")).toThrow(/no numérico/);
    expect(() => parseMonetaryText("10000000000000")).toThrow(/fuera de cota/);
  });
});

describe("normalizeMonetaryInput", () => {
  it("keeps a bounded text canonical", () => {
    expect(normalizeMonetaryInput("113000")).toBe("113000");
    expect(normalizeMonetaryInput("0.1")).toBe("0.1");
    expect(normalizeMonetaryInput("0.10")).toBe("0.1");
    expect(normalizeMonetaryInput("1.00000")).toBe("1");
  });

  it("reads a legacy number through its shortest representation", () => {
    expect(normalizeMonetaryInput(0)).toBe("0");
    expect(normalizeMonetaryInput(100)).toBe("100");
    expect(normalizeMonetaryInput(0.1)).toBe("0.1");
    expect(normalizeMonetaryInput(1.5)).toBe("1.5");
    expect(normalizeMonetaryInput(113000)).toBe("113000");
  });

  it("rounds a legacy number HALF_UP at five decimals", () => {
    expect(normalizeMonetaryInput(1.000005)).toBe("1.00001");
    expect(normalizeMonetaryInput(0.30000000000000004)).toBe("0.3");
    expect(normalizeMonetaryInput(0.000001)).toBe("0");
    expect(normalizeMonetaryInput(0.000005)).toBe("0.00001");
  });

  it("rejects non-finite, negative and out-of-bound numbers", () => {
    expect(() => normalizeMonetaryInput(Number.POSITIVE_INFINITY)).toThrow(/no finito/);
    expect(() => normalizeMonetaryInput(Number.NaN)).toThrow(/no finito/);
    expect(() => normalizeMonetaryInput(-1)).toThrow(/negativo/);
    expect(() => normalizeMonetaryInput(1e14)).toThrow(/fuera de cota/);
  });

  it("surfaces the cause as a MonetaryValueError", () => {
    expect(() => normalizeMonetaryInput("1e5")).toThrow(MonetaryValueError);
  });
});

describe("scaledFromNumber", () => {
  it("scales a finite number at the requested scale", () => {
    expect(scaledFromNumber(13, MONEY_SCALE)).toBe(1300000n);
    expect(scaledFromNumber(12.5, MONEY_SCALE)).toBe(1250000n);
    expect(scaledFromNumber(0.1, 3)).toBe(100n);
    expect(scaledFromNumber(1e-7, 5)).toBe(0n);
    expect(scaledFromNumber(-2.5, 5)).toBe(-250000n);
  });

  it("rejects non-finite numbers", () => {
    expect(() => scaledFromNumber(Number.POSITIVE_INFINITY, 5)).toThrow(/no finito/);
  });
});

describe("scaledFromPlainDecimal / formatScaledDecimal", () => {
  it("rounds HALF_UP at the target scale", () => {
    expect(scaledFromPlainDecimal("1.123456789", 5)).toBe(112346n);
    expect(scaledFromPlainDecimal("1.000005", 5)).toBe(100001n);
    expect(scaledFromPlainDecimal("1.000004", 5)).toBe(100000n);
  });

  it("renders plain text without forced zeros", () => {
    expect(formatScaledDecimal(11300000000n, 5)).toBe("113000");
    expect(formatScaledDecimal(10000n, 5)).toBe("0.1");
    expect(formatScaledDecimal(0n, 5)).toBe("0");
    expect(formatScaledDecimal(1n, 5)).toBe("0.00001");
  });
});

describe("equivalencia entre number y texto", () => {
  it("produce el mismo texto desde un number y desde su texto", () => {
    for (const value of [0, 1, 0.1, 1.5, 113000, 0.00001, 12345.67891]) {
      expect(MoneyInputSchema.parse(value)).toBe(MoneyInputSchema.parse(String(value)));
    }
  });

  it("no arrastra ruido binario", () => {
    expect(MoneyInputSchema.parse(0.1 + 0.2)).toBe("0.3");
  });

  it("el resultado es siempre texto decimal acotado", () => {
    const parsed = MoneyInputSchema.parse(1);
    expect(typeof parsed).toBe("string");
    expect(parsed).toMatch(MONETARY_TEXT_PATTERN);
  });
});

describe("MoneyInputSchema", () => {
  it("normalizes a legacy number into bounded decimal text", () => {
    const parsed = MoneyInputSchema.parse(113000);
    expect(parsed).toBe("113000");
    expect(typeof parsed).toBe("string");
  });

  it("normalizes a decimal text without losing digits", () => {
    expect(MoneyInputSchema.parse("0.00001")).toBe("0.00001");
  });

  it("rejects non-finite numbers naming the cause", () => {
    const result = MoneyInputSchema.safeParse(Number.POSITIVE_INFINITY);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/no finito/);
  });

  it("rejects exponential text naming the cause", () => {
    const result = MoneyInputSchema.safeParse("1e5");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/notación exponencial/);
  });

  it("rejects text above the bound naming the bound", () => {
    const result = MoneyInputSchema.safeParse("10000000000000");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/fuera de cota/);
  });

  it("rejects zero on a positive amount", () => {
    expect(MontoPositiveSchema.safeParse(0).success).toBe(false);
    expect(MontoPositiveSchema.safeParse(0.00001).success).toBe(true);
  });
});
