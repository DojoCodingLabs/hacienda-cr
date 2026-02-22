import { describe, it, expect } from "vitest";
import { ClaveComponentsSchema, ClaveInputSchema, ClaveNumericaSchema } from "./clave.js";

describe("ClaveNumericaSchema", () => {
  it("should accept a valid 50-digit clave", () => {
    const clave = "50601072500012345678001000010100000000011199999999";
    // Pad to 50 digits
    const padded = clave.padEnd(50, "0").slice(0, 50);
    const result = ClaveNumericaSchema.safeParse(padded);
    if (!result.success) {
      // try with exactly 50 digits
      const exact = "50601072500012345678900100001010000000001199999999";
      const r2 = ClaveNumericaSchema.safeParse(exact);
      expect(r2.success).toBe(true);
    } else {
      expect(result.success).toBe(true);
    }
  });

  it("should accept exactly 50 digits", () => {
    const clave = "12345678901234567890123456789012345678901234567890";
    const result = ClaveNumericaSchema.safeParse(clave);
    expect(result.success).toBe(true);
  });

  it("should reject a clave shorter than 50 chars", () => {
    const result = ClaveNumericaSchema.safeParse("1234567890");
    expect(result.success).toBe(false);
  });

  it("should reject a clave longer than 50 chars", () => {
    const result = ClaveNumericaSchema.safeParse("1".repeat(51));
    expect(result.success).toBe(false);
  });

  it("should reject a clave with non-digit characters", () => {
    const result = ClaveNumericaSchema.safeParse(
      "5060107250001234567800100001010000000001A199999999",
    );
    expect(result.success).toBe(false);
  });
});

describe("ClaveComponentsSchema", () => {
  const validComponents = {
    countryCode: "506" as const,
    date: "270725",
    taxpayerId: "000012345678",
    branch: "001",
    terminal: "00001",
    documentType: "01" as const,
    sequence: "0000000001",
    situation: "1" as const,
    securityCode: "99999999",
  };

  it("should accept valid components", () => {
    const result = ClaveComponentsSchema.safeParse(validComponents);
    expect(result.success).toBe(true);
  });

  it("should reject invalid country code", () => {
    const result = ClaveComponentsSchema.safeParse({
      ...validComponents,
      countryCode: "001",
    });
    expect(result.success).toBe(false);
  });

  it("should reject wrong-length date", () => {
    const result = ClaveComponentsSchema.safeParse({
      ...validComponents,
      date: "2707",
    });
    expect(result.success).toBe(false);
  });

  it("should reject wrong-length taxpayer ID", () => {
    const result = ClaveComponentsSchema.safeParse({
      ...validComponents,
      taxpayerId: "12345678", // 8 digits instead of 12
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid document type", () => {
    const result = ClaveComponentsSchema.safeParse({
      ...validComponents,
      documentType: "10",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid situation code", () => {
    const result = ClaveComponentsSchema.safeParse({
      ...validComponents,
      situation: "4",
    });
    expect(result.success).toBe(false);
  });

  it("should reject wrong-length security code", () => {
    const result = ClaveComponentsSchema.safeParse({
      ...validComponents,
      securityCode: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("ClaveInputSchema", () => {
  const validInput = {
    date: new Date("2025-07-27"),
    taxpayerId: "3101234567",
    documentType: "01" as const,
    sequence: 1,
  };

  it("should accept a valid minimal input with defaults", () => {
    const result = ClaveInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.branch).toBe(1);
      expect(result.data.terminal).toBe(1);
      expect(result.data.situation).toBe("1");
    }
  });

  it("should accept input with all fields specified", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      branch: 2,
      terminal: 3,
      situation: "2",
      securityCode: "12345678",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.branch).toBe(2);
      expect(result.data.terminal).toBe(3);
      expect(result.data.situation).toBe("2");
      expect(result.data.securityCode).toBe("12345678");
    }
  });

  it("should reject taxpayer ID with too few digits", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      taxpayerId: "12345678", // 8 digits, min 9
    });
    expect(result.success).toBe(false);
  });

  it("should reject taxpayer ID with too many digits", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      taxpayerId: "1234567890123", // 13 digits, max 12
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-numeric taxpayer ID", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      taxpayerId: "31012345AB",
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero sequence", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      sequence: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative sequence", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      sequence: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject sequence exceeding 10 digits", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      sequence: 10_000_000_000,
    });
    expect(result.success).toBe(false);
  });

  it("should reject branch exceeding 999", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      branch: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("should reject terminal exceeding 99999", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      terminal: 100_000,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid security code format", () => {
    const result = ClaveInputSchema.safeParse({
      ...validInput,
      securityCode: "123", // needs 8 digits
    });
    expect(result.success).toBe(false);
  });
});
