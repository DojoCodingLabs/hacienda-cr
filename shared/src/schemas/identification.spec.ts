import { describe, it, expect } from "vitest";
import { IdentificacionSchema } from "./identification.js";

describe("IdentificacionSchema", () => {
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

  it("should reject non-numeric identification numbers", () => {
    const result = IdentificacionSchema.safeParse({
      tipo: "01",
      numero: "12345678A",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid identification type", () => {
    const result = IdentificacionSchema.safeParse({
      tipo: "05",
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
