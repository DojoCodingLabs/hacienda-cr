import { describe, it, expect } from "vitest";
import { buildClave } from "./build-clave.js";
import { parseClave } from "./parse-clave.js";
import { COUNTRY_CODE, DocumentType, Situation, type ClaveInput } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base valid input for convenience. */
function validInput(overrides?: Partial<ClaveInput>): ClaveInput {
  return {
    date: new Date(2025, 6, 27), // July 27, 2025
    taxpayerId: "3101234567",
    documentType: DocumentType.FACTURA_ELECTRONICA,
    sequence: 1,
    situation: Situation.NORMAL,
    securityCode: "12345678",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildClave
// ---------------------------------------------------------------------------

describe("buildClave", () => {
  it("should generate a 50-digit string", () => {
    const clave = buildClave(validInput());
    expect(clave).toHaveLength(50);
    expect(clave).toMatch(/^\d{50}$/);
  });

  it("should start with country code 506", () => {
    const clave = buildClave(validInput());
    expect(clave.slice(0, 3)).toBe("506");
  });

  it("should encode the date in DDMMYY format", () => {
    const clave = buildClave(
      validInput({ date: new Date(2025, 6, 27) }), // July 27, 2025
    );
    // date portion is positions 3-9
    expect(clave.slice(3, 9)).toBe("270725");
  });

  it("should left-pad the taxpayer ID to 12 digits", () => {
    const clave = buildClave(validInput({ taxpayerId: "3101234567" }));
    expect(clave.slice(9, 21)).toBe("003101234567");
  });

  it("should handle a 12-digit taxpayer ID without padding", () => {
    const clave = buildClave(validInput({ taxpayerId: "310123456789" }));
    expect(clave.slice(9, 21)).toBe("310123456789");
  });

  it("should use default branch 001 when not specified", () => {
    const clave = buildClave(validInput({ branch: undefined }));
    expect(clave.slice(21, 24)).toBe("001");
  });

  it("should pad branch to 3 digits", () => {
    const clave = buildClave(validInput({ branch: "5" }));
    expect(clave.slice(21, 24)).toBe("005");
  });

  it("should accept 3-digit branch as-is", () => {
    const clave = buildClave(validInput({ branch: "123" }));
    expect(clave.slice(21, 24)).toBe("123");
  });

  it("should use default POS 00001 when not specified", () => {
    const clave = buildClave(validInput({ pos: undefined }));
    expect(clave.slice(24, 29)).toBe("00001");
  });

  it("should pad POS to 5 digits", () => {
    const clave = buildClave(validInput({ pos: "42" }));
    expect(clave.slice(24, 29)).toBe("00042");
  });

  it("should encode document type correctly", () => {
    const clave = buildClave(validInput({ documentType: DocumentType.FACTURA_ELECTRONICA }));
    expect(clave.slice(29, 31)).toBe("01");
  });

  it("should pad sequence to 10 digits", () => {
    const clave = buildClave(validInput({ sequence: 1 }));
    expect(clave.slice(31, 41)).toBe("0000000001");
  });

  it("should handle max sequence number", () => {
    const clave = buildClave(validInput({ sequence: 9_999_999_999 }));
    expect(clave.slice(31, 41)).toBe("9999999999");
  });

  it("should encode situation code", () => {
    const clave = buildClave(validInput({ situation: Situation.NORMAL }));
    expect(clave.slice(41, 42)).toBe("1");
  });

  it("should use the provided security code", () => {
    const clave = buildClave(validInput({ securityCode: "99887766" }));
    expect(clave.slice(42, 50)).toBe("99887766");
  });

  it("should pad security code to 8 digits", () => {
    const clave = buildClave(validInput({ securityCode: "123" }));
    expect(clave.slice(42, 50)).toBe("00000123");
  });

  it("should generate a random 8-digit security code when not provided", () => {
    const clave = buildClave(validInput({ securityCode: undefined }));
    const security = clave.slice(42, 50);
    expect(security).toHaveLength(8);
    expect(security).toMatch(/^\d{8}$/);
  });

  it("should generate different security codes on successive calls", () => {
    const input = validInput({ securityCode: undefined });
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const clave = buildClave({ ...input, sequence: i + 1 });
      codes.add(clave.slice(42, 50));
    }
    // With 20 random 8-digit codes, duplicates are astronomically unlikely
    expect(codes.size).toBeGreaterThan(1);
  });

  // ---- All document types ----

  it.each([
    ["FACTURA_ELECTRONICA", DocumentType.FACTURA_ELECTRONICA, "01"],
    ["NOTA_DEBITO", DocumentType.NOTA_DEBITO, "02"],
    ["NOTA_CREDITO", DocumentType.NOTA_CREDITO, "03"],
    ["TIQUETE_ELECTRONICO", DocumentType.TIQUETE_ELECTRONICO, "04"],
    ["CONFIRMACION_ACEPTACION", DocumentType.CONFIRMACION_ACEPTACION, "05"],
    ["CONFIRMACION_ACEPTACION_PARCIAL", DocumentType.CONFIRMACION_ACEPTACION_PARCIAL, "06"],
    ["CONFIRMACION_RECHAZO", DocumentType.CONFIRMACION_RECHAZO, "07"],
    ["FACTURA_COMPRA", DocumentType.FACTURA_COMPRA, "08"],
    ["FACTURA_EXPORTACION", DocumentType.FACTURA_EXPORTACION, "09"],
  ])("should encode document type %s as %s", (_name, docType, expected) => {
    const clave = buildClave(validInput({ documentType: docType }));
    expect(clave.slice(29, 31)).toBe(expected);
  });

  // ---- All situation codes ----

  it.each([
    ["NORMAL", Situation.NORMAL, "1"],
    ["CONTINGENCIA", Situation.CONTINGENCIA, "2"],
    ["SIN_INTERNET", Situation.SIN_INTERNET, "3"],
  ])("should encode situation %s as %s", (_name, situation, expected) => {
    const clave = buildClave(validInput({ situation }));
    expect(clave.slice(41, 42)).toBe(expected);
  });

  // ---- Date edge cases ----

  it("should handle January 1 correctly", () => {
    const clave = buildClave(validInput({ date: new Date(2025, 0, 1) }));
    expect(clave.slice(3, 9)).toBe("010125");
  });

  it("should handle December 31 correctly", () => {
    const clave = buildClave(validInput({ date: new Date(2025, 11, 31) }));
    expect(clave.slice(3, 9)).toBe("311225");
  });

  it("should handle year 2000", () => {
    const clave = buildClave(validInput({ date: new Date(2000, 0, 15) }));
    expect(clave.slice(3, 9)).toBe("150100");
  });

  it("should handle leap day Feb 29", () => {
    const clave = buildClave(validInput({ date: new Date(2024, 1, 29) }));
    expect(clave.slice(3, 9)).toBe("290224");
  });

  // ---- Validation errors ----

  it("should reject an empty taxpayer ID", () => {
    expect(() => buildClave(validInput({ taxpayerId: "" }))).toThrow();
  });

  it("should reject a taxpayer ID longer than 12 digits", () => {
    expect(() => buildClave(validInput({ taxpayerId: "1234567890123" }))).toThrow();
  });

  it("should reject a non-numeric taxpayer ID", () => {
    expect(() => buildClave(validInput({ taxpayerId: "ABC1234567" }))).toThrow();
  });

  it("should reject a branch longer than 3 digits", () => {
    expect(() => buildClave(validInput({ branch: "1234" }))).toThrow();
  });

  it("should reject a non-numeric branch", () => {
    expect(() => buildClave(validInput({ branch: "AB1" }))).toThrow();
  });

  it("should reject a POS longer than 5 digits", () => {
    expect(() => buildClave(validInput({ pos: "123456" }))).toThrow();
  });

  it("should reject sequence of 0", () => {
    expect(() => buildClave(validInput({ sequence: 0 }))).toThrow();
  });

  it("should reject negative sequence", () => {
    expect(() => buildClave(validInput({ sequence: -1 }))).toThrow();
  });

  it("should reject sequence exceeding 10 digits", () => {
    expect(() => buildClave(validInput({ sequence: 10_000_000_000 }))).toThrow();
  });

  it("should reject a non-integer sequence", () => {
    expect(() => buildClave(validInput({ sequence: 1.5 }))).toThrow();
  });

  it("should reject an invalid document type", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildClave(validInput({ documentType: "99" as any })),
    ).toThrow();
  });

  it("should reject an invalid situation code", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildClave(validInput({ situation: "9" as any })),
    ).toThrow();
  });

  it("should reject a security code longer than 8 digits", () => {
    expect(() => buildClave(validInput({ securityCode: "123456789" }))).toThrow();
  });

  it("should reject a non-numeric security code", () => {
    expect(() => buildClave(validInput({ securityCode: "ABCD1234" }))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseClave
// ---------------------------------------------------------------------------

describe("parseClave", () => {
  // Build a known clave for testing
  const knownInput = validInput();
  const knownClave = buildClave(knownInput);

  it("should parse a valid 50-digit clave", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.raw).toBe(knownClave);
    expect(parsed.countryCode).toBe("506");
  });

  it("should extract the country code", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.countryCode).toBe(COUNTRY_CODE);
  });

  it("should parse the date correctly", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.date.getFullYear()).toBe(2025);
    expect(parsed.date.getMonth()).toBe(6); // July = 6 (0-indexed)
    expect(parsed.date.getDate()).toBe(27);
  });

  it("should return the raw date string", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.dateRaw).toBe("270725");
  });

  it("should extract the taxpayer ID with padding", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.taxpayerId).toBe("003101234567");
  });

  it("should extract the branch", () => {
    const clave = buildClave(validInput({ branch: "5" }));
    const parsed = parseClave(clave);
    expect(parsed.branch).toBe("005");
  });

  it("should extract the POS", () => {
    const clave = buildClave(validInput({ pos: "42" }));
    const parsed = parseClave(clave);
    expect(parsed.pos).toBe("00042");
  });

  it("should extract the document type", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.documentType).toBe("01");
  });

  it("should extract the sequence number as a number", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.sequence).toBe(1);
  });

  it("should preserve the zero-padded sequence string", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.sequenceRaw).toBe("0000000001");
  });

  it("should extract the situation code", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.situation).toBe("1");
  });

  it("should extract the security code", () => {
    const parsed = parseClave(knownClave);
    expect(parsed.securityCode).toBe("12345678");
  });

  // ---- Validation errors ----

  it("should reject a clave shorter than 50 characters", () => {
    expect(() => parseClave("506270725003101234567001000010100000000011234567")).toThrow(
      /must be exactly 50 characters/,
    );
  });

  it("should reject a clave longer than 50 characters", () => {
    expect(() => parseClave(knownClave + "0")).toThrow(/must be exactly 50 characters/);
  });

  it("should reject an empty string", () => {
    expect(() => parseClave("")).toThrow(/must be exactly 50 characters/);
  });

  it("should reject a clave with non-digit characters", () => {
    const badClave = "A" + knownClave.slice(1);
    expect(() => parseClave(badClave)).toThrow(/must contain only digits/);
  });

  it("should reject a clave with spaces", () => {
    const badClave = " " + knownClave.slice(1);
    expect(() => parseClave(badClave)).toThrow(/must contain only digits/);
  });

  it("should reject an invalid country code", () => {
    const badClave = "123" + knownClave.slice(3);
    expect(() => parseClave(badClave)).toThrow(/Invalid country code/);
  });

  it("should reject an invalid date (month 13)", () => {
    // Replace date portion (positions 3-9) with invalid month
    const badClave = knownClave.slice(0, 3) + "011325" + knownClave.slice(9);
    expect(() => parseClave(badClave)).toThrow(/Invalid month/);
  });

  it("should reject an invalid date (month 00)", () => {
    const badClave = knownClave.slice(0, 3) + "010025" + knownClave.slice(9);
    expect(() => parseClave(badClave)).toThrow(/Invalid month/);
  });

  it("should reject an invalid date (day 00)", () => {
    const badClave = knownClave.slice(0, 3) + "000725" + knownClave.slice(9);
    expect(() => parseClave(badClave)).toThrow(/Invalid day/);
  });

  it("should reject an invalid date (day 32)", () => {
    const badClave = knownClave.slice(0, 3) + "320725" + knownClave.slice(9);
    expect(() => parseClave(badClave)).toThrow(/Invalid day/);
  });

  it("should reject Feb 30 (invalid calendar date)", () => {
    const badClave = knownClave.slice(0, 3) + "300225" + knownClave.slice(9);
    expect(() => parseClave(badClave)).toThrow(/valid calendar date/);
  });

  it("should reject Feb 29 in a non-leap year", () => {
    const badClave = knownClave.slice(0, 3) + "290225" + knownClave.slice(9);
    expect(() => parseClave(badClave)).toThrow(/valid calendar date/);
  });

  it("should accept Feb 29 in a leap year", () => {
    const badClave = knownClave.slice(0, 3) + "290224" + knownClave.slice(9);
    const parsed = parseClave(badClave);
    expect(parsed.date.getMonth()).toBe(1); // February
    expect(parsed.date.getDate()).toBe(29);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: build -> parse -> verify
// ---------------------------------------------------------------------------

describe("build + parse round-trip", () => {
  it("should round-trip a basic clave", () => {
    const input = validInput();
    const clave = buildClave(input);
    const parsed = parseClave(clave);

    expect(parsed.countryCode).toBe(COUNTRY_CODE);
    expect(parsed.date.getFullYear()).toBe(2025);
    expect(parsed.date.getMonth()).toBe(6);
    expect(parsed.date.getDate()).toBe(27);
    expect(parsed.taxpayerId).toBe("003101234567");
    expect(parsed.branch).toBe("001");
    expect(parsed.pos).toBe("00001");
    expect(parsed.documentType).toBe("01");
    expect(parsed.sequence).toBe(1);
    expect(parsed.situation).toBe("1");
    expect(parsed.securityCode).toBe("12345678");
  });

  it("should round-trip with all fields specified", () => {
    const input = validInput({
      date: new Date(2030, 11, 25), // Dec 25, 2030
      taxpayerId: "112233445566",
      branch: "123",
      pos: "54321",
      documentType: DocumentType.FACTURA_EXPORTACION,
      sequence: 5_000_000_000,
      situation: Situation.CONTINGENCIA,
      securityCode: "00000001",
    });
    const clave = buildClave(input);
    const parsed = parseClave(clave);

    expect(parsed.date.getFullYear()).toBe(2030);
    expect(parsed.date.getMonth()).toBe(11);
    expect(parsed.date.getDate()).toBe(25);
    expect(parsed.taxpayerId).toBe("112233445566");
    expect(parsed.branch).toBe("123");
    expect(parsed.pos).toBe("54321");
    expect(parsed.documentType).toBe("09");
    expect(parsed.sequence).toBe(5_000_000_000);
    expect(parsed.situation).toBe("2");
    expect(parsed.securityCode).toBe("00000001");
  });

  it("should round-trip with maximum sequence number", () => {
    const input = validInput({ sequence: 9_999_999_999 });
    const clave = buildClave(input);
    const parsed = parseClave(clave);
    expect(parsed.sequence).toBe(9_999_999_999);
    expect(parsed.sequenceRaw).toBe("9999999999");
  });

  it("should round-trip with single-digit taxpayer ID", () => {
    const input = validInput({ taxpayerId: "1" });
    const clave = buildClave(input);
    const parsed = parseClave(clave);
    expect(parsed.taxpayerId).toBe("000000000001");
  });

  it("should round-trip all document types", () => {
    for (const docType of Object.values(DocumentType)) {
      const input = validInput({ documentType: docType });
      const clave = buildClave(input);
      const parsed = parseClave(clave);
      expect(parsed.documentType).toBe(docType);
    }
  });

  it("should round-trip all situation codes", () => {
    for (const situation of Object.values(Situation)) {
      const input = validInput({ situation });
      const clave = buildClave(input);
      const parsed = parseClave(clave);
      expect(parsed.situation).toBe(situation);
    }
  });

  it("should round-trip with auto-generated security code", () => {
    const input = validInput({ securityCode: undefined });
    const clave = buildClave(input);
    const parsed = parseClave(clave);
    expect(parsed.securityCode).toMatch(/^\d{8}$/);
    // And the full clave should reconstruct correctly
    expect(parsed.raw).toBe(clave);
  });
});

// ---------------------------------------------------------------------------
// Constants / enums
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("COUNTRY_CODE should be 506", () => {
    expect(COUNTRY_CODE).toBe("506");
  });

  it("DocumentType should have 9 values", () => {
    expect(Object.values(DocumentType)).toHaveLength(9);
  });

  it("Situation should have 3 values", () => {
    expect(Object.values(Situation)).toHaveLength(3);
  });
});
