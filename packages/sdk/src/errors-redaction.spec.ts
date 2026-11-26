import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, HaciendaError, HaciendaErrorCode, ValidationError } from "./errors.js";
import { AuthError, AuthErrorCode } from "./auth/types.js";

afterEach(() => vi.unstubAllEnvs());

describe("construction-time error sanitization", () => {
  it("redacts environment secrets and credential syntax from hostile messages", () => {
    vi.stubEnv("HACIENDA_PASSWORD", "fixture-hostile-password");
    vi.stubEnv("HACIENDA_P12_PIN", "4821");
    const hostile =
      "upstream echoed fixture-hostile-password, pin 4821, Authorization: Bearer fixture.jwt.value, password=inline-secret";
    for (const error of [
      new HaciendaError(HaciendaErrorCode.API_ERROR, hostile),
      new ApiError(hostile, 500),
      new ValidationError(hostile),
      new AuthError(AuthErrorCode.TOKEN_REQUEST_FAILED, hostile),
    ]) {
      for (const secret of [
        "fixture-hostile-password",
        "4821",
        "fixture.jwt.value",
        "inline-secret",
      ])
        expect(error.message).not.toContain(secret);
      expect(error.message).toContain("[REDACTED]");
      expect(error.message).toContain("upstream echoed");
    }
  });

  it("redacts secrets in ApiError bodies and ValidationError details without mutating input", () => {
    vi.stubEnv("HACIENDA_PASSWORD", "fixture-body-password");
    const body = { error: "denied fixture-body-password", access_token: "fixture-token" };
    const copy = structuredClone(body);
    const api = new ApiError("failed", 401, body);
    expect(JSON.stringify(api.responseBody)).not.toMatch(/fixture-body-password|fixture-token/);
    expect(body).toEqual(copy);
    const validation = new ValidationError("invalid", [{ message: "fixture-body-password" }]);
    expect(JSON.stringify(validation.details)).not.toContain("fixture-body-password");
  });

  it("keeps digits intact when a secret-named variable holds a short value", () => {
    vi.stubEnv("COREPACK_ENABLE_AUTO_PIN", "0");
    const error = new ApiError("POST /recepcion failed (409): conflict at 10:00", 409);
    expect(error.message).toBe("POST /recepcion failed (409): conflict at 10:00");
    expect(new AuthError(AuthErrorCode.TOKEN_REQUEST_FAILED, "status 401").message).toBe(
      "status 401",
    );
  });
});
