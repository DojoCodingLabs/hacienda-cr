import { describe, it, expect } from "vitest";
import {
  HaciendaError,
  HaciendaErrorCode,
  ValidationError,
  ApiError,
  AuthenticationError,
  SigningError,
} from "./errors.js";

// ---------------------------------------------------------------------------
// HaciendaError (base)
// ---------------------------------------------------------------------------

describe("HaciendaError", () => {
  it("sets name, code, and message", () => {
    const err = new HaciendaError(HaciendaErrorCode.INTERNAL_ERROR, "Something broke");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(HaciendaError);
    expect(err.name).toBe("HaciendaError");
    expect(err.code).toBe(HaciendaErrorCode.INTERNAL_ERROR);
    expect(err.message).toBe("Something broke");
  });

  it("preserves the cause when provided", () => {
    const cause = new TypeError("underlying issue");
    const err = new HaciendaError(HaciendaErrorCode.INTERNAL_ERROR, "Wrapped", cause);

    expect(err.cause).toBe(cause);
  });

  it("has undefined cause when not provided", () => {
    const err = new HaciendaError(HaciendaErrorCode.INTERNAL_ERROR, "No cause");

    expect(err.cause).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

describe("ValidationError", () => {
  it("is an instance of HaciendaError", () => {
    const err = new ValidationError("Bad input");

    expect(err).toBeInstanceOf(HaciendaError);
    expect(err).toBeInstanceOf(Error);
  });

  it("uses VALIDATION_FAILED code", () => {
    const err = new ValidationError("Bad input");

    expect(err.code).toBe(HaciendaErrorCode.VALIDATION_FAILED);
    expect(err.name).toBe("ValidationError");
  });

  it("carries structured details", () => {
    const details = [{ path: ["field"], message: "required" }];
    const err = new ValidationError("Validation failed", details);

    expect(err.details).toEqual(details);
  });

  it("has undefined details when not provided", () => {
    const err = new ValidationError("No details");

    expect(err.details).toBeUndefined();
  });

  it("preserves cause alongside details", () => {
    const cause = new Error("root cause");
    const err = new ValidationError("Failed", { field: "x" }, cause);

    expect(err.cause).toBe(cause);
    expect(err.details).toEqual({ field: "x" });
  });
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("is an instance of HaciendaError", () => {
    const err = new ApiError("Request failed");

    expect(err).toBeInstanceOf(HaciendaError);
  });

  it("uses API_ERROR code", () => {
    const err = new ApiError("Request failed");

    expect(err.code).toBe(HaciendaErrorCode.API_ERROR);
    expect(err.name).toBe("ApiError");
  });

  it("captures status code and response body", () => {
    const body = { error: "not_found" };
    const err = new ApiError("Not found", 404, body);

    expect(err.statusCode).toBe(404);
    expect(err.responseBody).toEqual(body);
  });

  it("has undefined status/body for network-level failures", () => {
    const err = new ApiError("Network error");

    expect(err.statusCode).toBeUndefined();
    expect(err.responseBody).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AuthenticationError
// ---------------------------------------------------------------------------

describe("AuthenticationError", () => {
  it("is an instance of HaciendaError", () => {
    const err = new AuthenticationError("Auth failed");

    expect(err).toBeInstanceOf(HaciendaError);
  });

  it("uses AUTHENTICATION_FAILED code", () => {
    const err = new AuthenticationError("Auth failed");

    expect(err.code).toBe(HaciendaErrorCode.AUTHENTICATION_FAILED);
    expect(err.name).toBe("AuthenticationError");
  });

  it("wraps a cause", () => {
    const cause = new Error("token expired");
    const err = new AuthenticationError("Auth failed", cause);

    expect(err.cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// SigningError
// ---------------------------------------------------------------------------

describe("SigningError", () => {
  it("is an instance of HaciendaError", () => {
    const err = new SigningError("Signing failed");

    expect(err).toBeInstanceOf(HaciendaError);
  });

  it("uses SIGNING_FAILED code", () => {
    const err = new SigningError("Signing failed");

    expect(err.code).toBe(HaciendaErrorCode.SIGNING_FAILED);
    expect(err.name).toBe("SigningError");
  });

  it("wraps a cause", () => {
    const cause = new Error("bad certificate");
    const err = new SigningError("Sign error", cause);

    expect(err.cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// HaciendaErrorCode enum values
// ---------------------------------------------------------------------------

describe("HaciendaErrorCode", () => {
  it("has all expected values", () => {
    expect(HaciendaErrorCode.VALIDATION_FAILED).toBe("VALIDATION_FAILED");
    expect(HaciendaErrorCode.API_ERROR).toBe("API_ERROR");
    expect(HaciendaErrorCode.AUTHENTICATION_FAILED).toBe("AUTHENTICATION_FAILED");
    expect(HaciendaErrorCode.SIGNING_FAILED).toBe("SIGNING_FAILED");
    expect(HaciendaErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });
});
