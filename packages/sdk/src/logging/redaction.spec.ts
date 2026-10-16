import { afterEach, describe, expect, it, vi } from "vitest";
import { Logger } from "./logger.js";

afterEach(() => vi.unstubAllEnvs());

describe("logger secret boundaries", () => {
  it.each(["text", "json"] as const)(
    "redacts nested credentials, auth schemes and environment secrets in %s output",
    (format) => {
      vi.stubEnv("HACIENDA_PASSWORD", "fixture-password-never-log");
      vi.stubEnv("HACIENDA_P12_PIN", "9493");
      vi.stubEnv("HACIENDA_USERNAME", "fixture-user@stag.example");
      const writer = vi.fn();
      const logger = new Logger({ format, context: "fixture-password-never-log", writer });
      const original = {
        operation: "submit",
        nested: [
          {
            Authorization: "Bearer fixture.jwt.token",
            p12_pin: "9493",
            access_token: "fixture-access",
            deeper: { clientSecret: "fixture-client" },
          },
        ],
        requestError: "Basic Zml4dHVyZTpwYXNz",
        raw: "fixture-password-never-log fixture-user@stag.example 9493",
      };
      const copy = structuredClone(original);
      logger.error("server echoed fixture-password-never-log; bearer fixture.jwt.token", original);
      expect(writer).toHaveBeenCalledOnce();
      const output = String(writer.mock.calls[0]?.[0]);
      for (const secret of [
        "fixture-password-never-log",
        "9493",
        "fixture-user@stag.example",
        "fixture.jwt.token",
        "fixture-access",
        "fixture-client",
        "Zml4dHVyZTpwYXNz",
      ])
        expect(output).not.toContain(secret);
      expect(output).toContain("submit");
      expect(output).toContain("[REDACTED]");
      expect(original).toEqual(copy);
      if (format === "json") expect(JSON.parse(output).data.operation).toBe("submit");
    },
  );
  it("handles cyclic error causes, bigint and throwing accessors without invoking getters", () => {
    vi.stubEnv("HACIENDA_PASSWORD", "fixture-sensitive");
    const writer = vi.fn();
    const logger = new Logger({ format: "json", writer });
    const error = new Error("Failure: fixture-sensitive, Bearer fixture.token");
    error.cause = error;
    const data: Record<string, unknown> = { error, count: 12n };
    data.self = data;
    const getter = vi.fn(() => {
      throw new Error("must not run");
    });
    Object.defineProperty(data, "getter", { enumerable: true, get: getter });
    expect(() => logger.error("failed", data)).not.toThrow();
    expect(getter).not.toHaveBeenCalled();
    const output = String(writer.mock.calls[0]?.[0]);
    expect(output).not.toContain("fixture-sensitive");
    expect(output).not.toContain("fixture.token");
    expect(output).toContain("[Circular]");
    expect(JSON.parse(output).data.count).toBe("12");
  });
  it("uses current environment secrets for child loggers after rotation", () => {
    const writer = vi.fn();
    const child = new Logger({ writer }).child("auth");
    vi.stubEnv("HACIENDA_PASSWORD", "fixture-old-password");
    child.info("fixture-old-password");
    vi.stubEnv("HACIENDA_PASSWORD", "fixture-new-password");
    child.info("fixture-new-password");
    expect(writer.mock.calls.map((call) => call[0]).join("\n")).not.toMatch(
      /fixture-(?:old|new)-password/,
    );
  });
  it("removes labelled secrets even if they are not configured in the environment", () => {
    const writer = vi.fn();
    const logger = new Logger({ writer });
    logger.warn('password="fixture-unconfigured"; access_token=fixture-unconfigured-token', {
      hacienda_access_token: "fixture-prefixed-token",
      p12Buffer: Buffer.from("fixture-p12-bytes"),
    });
    const output = String(writer.mock.calls[0]?.[0]);
    expect(output).not.toContain("fixture-unconfigured");
    expect(output).not.toContain("fixture-prefixed-token");
    expect(output).not.toContain("fixture-p12-bytes");
    expect(output).toContain("[REDACTED]");
  });
});
