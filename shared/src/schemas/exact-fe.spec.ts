import { ExactMoneySchema, ExactQuantitySchema, ExactDiscountInputSchema } from "./exact-fe.js";

describe("public exact ordinary FE decimal schemas", () => {
  it("accepts full supported maxima and rejects number coercion", () => {
    expect(ExactMoneySchema.parse("9999999999999.99999")).toBe("9999999999999.99999");
    expect(ExactQuantitySchema.parse("9999999999999999")).toBe("9999999999999999");
    expect(ExactQuantitySchema.parse("9999999999999.999")).toBe("9999999999999.999");
    expect(ExactMoneySchema.safeParse(1).success).toBe(false);
    expect(ExactQuantitySchema.safeParse(1).success).toBe(false);
  });
  it("safeParse remains bounded and returns failures for malformed decimal strings", () => {
    for (const value of [
      "",
      "NaN",
      "Infinity",
      "1e3",
      "-1",
      "+1",
      "01",
      "0.0001",
      "9".repeat(20000),
    ]) {
      expect(() => ExactQuantitySchema.safeParse(value)).not.toThrow();
      expect(ExactQuantitySchema.safeParse(value).success).toBe(false);
    }
    for (const value of [
      "",
      "NaN",
      "Infinity",
      "1e3",
      "-1",
      "+1",
      "01",
      "100.00001",
      "9".repeat(20000),
    ]) {
      const source = { codigoDescuento: "07", porcentaje: value };
      expect(() => ExactDiscountInputSchema.safeParse(source)).not.toThrow();
      expect(ExactDiscountInputSchema.safeParse(source).success).toBe(false);
    }
  });
  it("requires exclusive amount/percent facts and code99 companion without invented nature", () => {
    expect(
      ExactDiscountInputSchema.safeParse({ codigoDescuento: "07", montoDescuento: "0.00001" })
        .success,
    ).toBe(true);
    expect(
      ExactDiscountInputSchema.safeParse({ codigoDescuento: "07", porcentaje: "1.23456" }).success,
    ).toBe(true);
    expect(
      ExactDiscountInputSchema.safeParse({
        codigoDescuento: "07",
        montoDescuento: "1",
        porcentaje: "1",
      }).success,
    ).toBe(false);
    for (const code of ["01", "02", "03"])
      expect(
        ExactDiscountInputSchema.safeParse({ codigoDescuento: code, montoDescuento: "1" }).success,
      ).toBe(false);
    expect(
      ExactDiscountInputSchema.safeParse({ codigoDescuento: "99", montoDescuento: "1" }).success,
    ).toBe(false);
  });
});
