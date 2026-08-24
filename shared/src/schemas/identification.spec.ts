import { describe, it, expect } from "vitest";
import { IdentificacionSchema } from "./identification.js";

describe("IdentificacionSchema", () => {
  describe("domestic registry types (01-04)", () => {
    it("should accept a valid cedula fisica (9 digits)", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "01",
        numero: "123456789",
      });
      expect(result.success).toBe(true);
    });

    it("should accept a valid cedula juridica (10 digits)", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "02",
        numero: "3101234567",
      });
      expect(result.success).toBe(true);
    });

    it("should accept a valid DIMEX (11 digits)", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "03",
        numero: "12345678901",
      });
      expect(result.success).toBe(true);
    });

    it("should accept a valid DIMEX (12 digits)", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "03",
        numero: "123456789012",
      });
      expect(result.success).toBe(true);
    });

    it("should accept a valid NITE (10 digits)", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "04",
        numero: "1234567890",
      });
      expect(result.success).toBe(true);
    });

    it("should reject cedula fisica with wrong length", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "01",
        numero: "12345678", // 8 digits, needs 9
      });
      expect(result.success).toBe(false);
    });

    it("should reject cedula juridica with wrong length", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "02",
        numero: "123456789", // 9 digits, needs 10
      });
      expect(result.success).toBe(false);
    });

    it("should reject DIMEX with wrong length", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "03",
        numero: "1234567890", // 10 digits, needs 11-12
      });
      expect(result.success).toBe(false);
    });

    it("should reject NITE with wrong length", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "04",
        numero: "123456789", // 9 digits, needs 10
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric identification numbers", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "01",
        numero: "12345678A",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("free-form types (05/06, new in v4.4)", () => {
    it("should accept an extranjero no domiciliado (05) with free-form value", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "05",
        numero: "PASS-X123456",
      });
      expect(result.success).toBe(true);
    });

    it("should accept a no contribuyente (06) with free-form value", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "06",
        numero: "N/A-0001",
      });
      expect(result.success).toBe(true);
    });

    it("should accept type 05 with exactly 20 characters", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "05",
        numero: "A".repeat(20),
      });
      expect(result.success).toBe(true);
    });

    it("should not apply digit or length checks to type 05", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "05",
        numero: "abc", // 3 chars, non-digits: fine for 05
      });
      expect(result.success).toBe(true);
    });

    it("should reject type 05 numero exceeding 20 characters", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "05",
        numero: "A".repeat(21),
      });
      expect(result.success).toBe(false);
    });

    it("should reject type 06 numero exceeding 20 characters", () => {
      const result = IdentificacionSchema.safeParse({
        tipo: "06",
        numero: "1".repeat(21),
      });
      expect(result.success).toBe(false);
    });
  });

  it("should reject an unknown identification type", () => {
    const result = IdentificacionSchema.safeParse({
      tipo: "07",
      numero: "123456789",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty numero", () => {
    const result = IdentificacionSchema.safeParse({
      tipo: "01",
      numero: "",
    });
    expect(result.success).toBe(false);
  });
});
