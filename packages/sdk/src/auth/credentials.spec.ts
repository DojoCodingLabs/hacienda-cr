import { describe, it, expect } from "vitest";
import { buildUsername, loadCredentials } from "./credentials.js";
import { AuthError, AuthErrorCode, IdType } from "./types.js";

// ---------------------------------------------------------------------------
// buildUsername
// ---------------------------------------------------------------------------

describe("buildUsername", () => {
  it("builds username for persona fisica", () => {
    expect(buildUsername(IdType.PersonaFisica, "0123456789")).toBe("cpf-01-0123456789");
  });

  it("builds username for persona juridica", () => {
    expect(buildUsername(IdType.PersonaJuridica, "3101234567")).toBe("cpj-02-3101234567");
  });

  it("builds username for DIMEX", () => {
    expect(buildUsername(IdType.DIMEX, "123456789012")).toBe("cpf-03-123456789012");
  });

  it("builds username for NITE", () => {
    expect(buildUsername(IdType.NITE, "1234567890")).toBe("cpf-04-1234567890");
  });
});

// ---------------------------------------------------------------------------
// loadCredentials
// ---------------------------------------------------------------------------

describe("loadCredentials", () => {
  it("loads valid credentials and builds the username", () => {
    const creds = loadCredentials({
      idType: IdType.PersonaJuridica,
      idNumber: "3101234567",
      password: "test-password",
    });

    expect(creds.username).toBe("cpj-02-3101234567");
    expect(creds.password).toBe("test-password");
  });

  it("loads valid credentials for persona fisica", () => {
    const creds = loadCredentials({
      idType: IdType.PersonaFisica,
      idNumber: "012345678",
      password: "my-secret",
    });

    expect(creds.username).toBe("cpf-01-012345678");
    expect(creds.password).toBe("my-secret");
  });

  it("throws AuthError on missing password", () => {
    expect(() =>
      loadCredentials({
        idType: IdType.PersonaFisica,
        idNumber: "012345678",
        password: "",
      }),
    ).toThrow(AuthError);

    try {
      loadCredentials({
        idType: IdType.PersonaFisica,
        idNumber: "012345678",
        password: "",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    }
  });

  it("throws AuthError on too-short identification number", () => {
    expect(() =>
      loadCredentials({
        idType: IdType.PersonaFisica,
        idNumber: "12345678", // 8 digits — minimum is 9
        password: "pass",
      }),
    ).toThrow(AuthError);
  });

  it("throws AuthError on too-long identification number", () => {
    expect(() =>
      loadCredentials({
        idType: IdType.PersonaFisica,
        idNumber: "1234567890123", // 13 digits — max is 12
        password: "pass",
      }),
    ).toThrow(AuthError);
  });

  it("throws AuthError on non-numeric identification number", () => {
    expect(() =>
      loadCredentials({
        idType: IdType.PersonaFisica,
        idNumber: "01234abcd",
        password: "pass",
      }),
    ).toThrow(AuthError);
  });

  it("throws AuthError when .p12 file does not exist", () => {
    expect(() =>
      loadCredentials({
        idType: IdType.PersonaJuridica,
        idNumber: "3101234567",
        password: "pass",
        p12Path: "/nonexistent/path/cert.p12",
      }),
    ).toThrow(AuthError);

    try {
      loadCredentials({
        idType: IdType.PersonaJuridica,
        idNumber: "3101234567",
        password: "pass",
        p12Path: "/nonexistent/path/cert.p12",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe(AuthErrorCode.P12_FILE_NOT_FOUND);
    }
  });

  it("does not throw when .p12 path is not provided", () => {
    const creds = loadCredentials({
      idType: IdType.PersonaJuridica,
      idNumber: "3101234567",
      password: "pass",
    });

    expect(creds.username).toBe("cpj-02-3101234567");
  });

  it("throws on invalid idType", () => {
    expect(() =>
      loadCredentials({
        idType: "99" as IdType,
        idNumber: "012345678",
        password: "pass",
      }),
    ).toThrow(AuthError);
  });
});
