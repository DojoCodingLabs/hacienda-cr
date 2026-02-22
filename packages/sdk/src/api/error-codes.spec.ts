/**
 * Tests for the Hacienda error code registry.
 */

import { describe, it, expect } from "vitest";
import {
  getRejectionDescription,
  getHttpStatusDescription,
  isRetryableStatus,
  HaciendaRejectionCode,
  REJECTION_CODE_DESCRIPTIONS,
  HTTP_STATUS_DESCRIPTIONS,
} from "./error-codes.js";

// ---------------------------------------------------------------------------
// getRejectionDescription
// ---------------------------------------------------------------------------

describe("getRejectionDescription", () => {
  it("returns description for known rejection codes", () => {
    expect(getRejectionDescription("01")).toContain("XML schema validation");
    expect(getRejectionDescription("02")).toContain("Digital signature");
    expect(getRejectionDescription("05")).toContain("Duplicate clave");
  });

  it("returns a generic message for unknown codes", () => {
    const desc = getRejectionDescription("99");

    expect(desc).toContain("Unknown");
    expect(desc).toContain("99");
  });

  it("covers all defined rejection codes", () => {
    for (const code of Object.values(HaciendaRejectionCode)) {
      const desc = getRejectionDescription(code);
      expect(desc).not.toContain("Unknown");
    }
  });
});

// ---------------------------------------------------------------------------
// getHttpStatusDescription
// ---------------------------------------------------------------------------

describe("getHttpStatusDescription", () => {
  it("returns description for known HTTP status codes", () => {
    expect(getHttpStatusDescription(201)).toContain("accepted");
    expect(getHttpStatusDescription(400)).toContain("Bad request");
    expect(getHttpStatusDescription(401)).toContain("Unauthorized");
    expect(getHttpStatusDescription(409)).toContain("Conflict");
    expect(getHttpStatusDescription(500)).toContain("Internal server error");
  });

  it("returns a generic message for unknown status codes", () => {
    const desc = getHttpStatusDescription(418);

    expect(desc).toContain("HTTP");
    expect(desc).toContain("418");
  });
});

// ---------------------------------------------------------------------------
// isRetryableStatus
// ---------------------------------------------------------------------------

describe("isRetryableStatus", () => {
  it("returns true for 5xx server errors", () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
  });

  it("returns false for 4xx client errors", () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(409)).toBe(false);
  });

  it("returns false for 2xx success codes", () => {
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(201)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("REJECTION_CODE_DESCRIPTIONS", () => {
  it("has entries for all defined HaciendaRejectionCode values", () => {
    for (const code of Object.values(HaciendaRejectionCode)) {
      expect(REJECTION_CODE_DESCRIPTIONS[code]).toBeDefined();
      expect(typeof REJECTION_CODE_DESCRIPTIONS[code]).toBe("string");
    }
  });
});

describe("HTTP_STATUS_DESCRIPTIONS", () => {
  it("has entries for common Hacienda HTTP status codes", () => {
    const expectedCodes = [201, 202, 400, 401, 403, 404, 409, 500, 502, 503];
    for (const code of expectedCodes) {
      expect(HTTP_STATUS_DESCRIPTIONS[code]).toBeDefined();
    }
  });
});
