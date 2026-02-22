import { describe, it, expect } from "vitest";
import { getEnvironmentConfig } from "./environment.js";
import { Environment } from "./types.js";

describe("getEnvironmentConfig", () => {
  it("returns sandbox configuration", () => {
    const config = getEnvironmentConfig(Environment.Sandbox);

    expect(config.name).toBe("Sandbox");
    expect(config.apiBaseUrl).toBe(
      "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1",
    );
    expect(config.idpTokenUrl).toBe(
      "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
    );
    expect(config.clientId).toBe("api-stag");
  });

  it("returns production configuration", () => {
    const config = getEnvironmentConfig(Environment.Production);

    expect(config.name).toBe("Production");
    expect(config.apiBaseUrl).toBe("https://api.comprobanteselectronicos.go.cr/recepcion/v1");
    expect(config.idpTokenUrl).toBe(
      "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token",
    );
    expect(config.clientId).toBe("api-prod");
  });

  it("sandbox and production configs have different URLs", () => {
    const sandbox = getEnvironmentConfig(Environment.Sandbox);
    const prod = getEnvironmentConfig(Environment.Production);

    expect(sandbox.apiBaseUrl).not.toBe(prod.apiBaseUrl);
    expect(sandbox.idpTokenUrl).not.toBe(prod.idpTokenUrl);
    expect(sandbox.clientId).not.toBe(prod.clientId);
  });

  it("sandbox config uses rut-stag realm", () => {
    const config = getEnvironmentConfig(Environment.Sandbox);
    expect(config.idpTokenUrl).toContain("rut-stag");
  });

  it("production config uses rut realm (without stag)", () => {
    const config = getEnvironmentConfig(Environment.Production);
    expect(config.idpTokenUrl).toContain("/rut/");
    expect(config.idpTokenUrl).not.toContain("rut-stag");
  });
});
