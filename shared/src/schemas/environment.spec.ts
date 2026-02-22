import { describe, it, expect } from "vitest";
import { EnvironmentSchema, CredentialConfigSchema, AppConfigSchema } from "./environment.js";

describe("EnvironmentSchema", () => {
  it("should accept 'sandbox'", () => {
    const result = EnvironmentSchema.safeParse("sandbox");
    expect(result.success).toBe(true);
  });

  it("should accept 'production'", () => {
    const result = EnvironmentSchema.safeParse("production");
    expect(result.success).toBe(true);
  });

  it("should reject invalid environment", () => {
    const result = EnvironmentSchema.safeParse("staging");
    expect(result.success).toBe(false);
  });

  it("should reject empty string", () => {
    const result = EnvironmentSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("CredentialConfigSchema", () => {
  it("should accept valid credentials", () => {
    const result = CredentialConfigSchema.safeParse({
      username: "cpj-3101234567@stag.comprobanteselectronicos.go.cr",
      p12Path: "~/.hacienda-cr/keys/company.p12",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty username", () => {
    const result = CredentialConfigSchema.safeParse({
      username: "",
      p12Path: "/path/to/file.p12",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty p12Path", () => {
    const result = CredentialConfigSchema.safeParse({
      username: "user@test.com",
      p12Path: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("AppConfigSchema", () => {
  it("should accept a valid config with sandbox", () => {
    const result = AppConfigSchema.safeParse({
      environment: "sandbox",
      credentials: {
        sandbox: {
          username: "cpj-3101234567@stag.comprobanteselectronicos.go.cr",
          p12Path: "~/.hacienda-cr/keys/company.p12",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept a minimal config without credentials", () => {
    const result = AppConfigSchema.safeParse({
      environment: "production",
    });
    expect(result.success).toBe(true);
  });

  it("should accept config with both environment credentials", () => {
    const result = AppConfigSchema.safeParse({
      environment: "sandbox",
      credentials: {
        sandbox: {
          username: "cpj-3101234567@stag.comprobanteselectronicos.go.cr",
          p12Path: "/path/to/stag.p12",
        },
        production: {
          username: "cpj-3101234567@prod.comprobanteselectronicos.go.cr",
          p12Path: "/path/to/prod.p12",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid environment", () => {
    const result = AppConfigSchema.safeParse({
      environment: "testing",
    });
    expect(result.success).toBe(false);
  });
});
