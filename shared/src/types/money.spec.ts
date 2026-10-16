import { describe, it, expect } from "vitest";
import { Money, ZERO } from "./money.js";

describe("Money", () => {
  describe("decimal arithmetic (no binary floating point)", () => {
    it("0.1 + 0.2 equals 0.3 exactly", () => {
      const sum = Money.fromNumber(0.1).plus(Money.fromNumber(0.2));
      expect(sum.equals(Money.fromNumber(0.3))).toBe(true);
    });

    it("0.3 - 0.1 equals 0.2 exactly", () => {
      const diff = Money.fromNumber(0.3).minus(Money.fromNumber(0.1));
      expect(diff.equals(Money.fromNumber(0.2))).toBe(true);
    });

    it("compounds a repeated decimal amount without drift", () => {
      let total = ZERO;
      for (let i = 0; i < 10; i += 1) {
        total = total.plus(Money.fromNumber(0.1));
      }
      expect(total.equals(Money.fromNumber(1))).toBe(true);
    });
  });

  describe("immutability", () => {
    it("plus returns a new instance and leaves the receiver unchanged", () => {
      const a = Money.fromNumber(1.5);
      const b = a.plus(Money.fromNumber(2.5));
      expect(a.equals(Money.fromNumber(1.5))).toBe(true);
      expect(b.equals(Money.fromNumber(4))).toBe(true);
    });
  });

  describe("fromString", () => {
    it("preserves exact decimal values", () => {
      expect(Money.fromString("123.45").equals(Money.fromNumber(123.45))).toBe(true);
    });
  });

  describe("round (ROUND_HALF_UP)", () => {
    it("rounds exact halves away from zero", () => {
      expect(Money.fromString("2.5").round(0).toXMLString()).toBe("3");
      expect(Money.fromString("3.5").round(0).toXMLString()).toBe("4");
      expect(Money.fromString("-2.5").round(0).toXMLString()).toBe("-3");
    });

    it("rounds the exact literal at the fifth decimal, not the binary double", () => {
      // 1.000005 as a double is 1.0000049999..., so Number.toFixed(5) yields
      // "1.00000"; Money preserves the literal and rounds half-up to "1.00001".
      expect(Money.fromString("1.000005").round(5).toXMLString()).toBe("1.00001");
    });
  });

  describe("toXMLString", () => {
    it("renders an integer amount without fractional digits", () => {
      expect(Money.fromNumber(113000).toXMLString()).toBe("113000");
    });

    it("renders an exact fraction without forcing trailing zeros", () => {
      expect(Money.fromString("0.1").toXMLString()).toBe("0.1");
    });

    it("never uses scientific notation for very small amounts", () => {
      expect(Money.fromString("0.00001").toXMLString()).toBe("0.00001");
    });

    it("never uses scientific notation for large amounts", () => {
      expect(Money.fromString("1000000000000000000000").toXMLString()).toBe(
        "1000000000000000000000",
      );
    });

    it("rounds half up beyond the fifth decimal place", () => {
      expect(Money.fromString("1.000005").toXMLString()).toBe("1.00001");
    });
  });
});
