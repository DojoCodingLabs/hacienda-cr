/**
 * Regression: `loadP12` must fail closed when the optional PKCS#12 parser is
 * not installed, with an actionable `SigningError` and no credential leakage.
 *
 * The parser is a build-time independent module; the mock below rejects its
 * resolution to reproduce an installed consumer that did not opt in.
 */

import { describe, it, expect, vi } from "vitest";

import { SigningError } from "../errors.js";

vi.mock("node-forge", () => {
  throw Object.assign(new Error("Cannot find package 'node-forge'"), {
    code: "ERR_MODULE_NOT_FOUND",
  });
});

describe("loadP12 – missing optional parser", () => {
  it("rejects with an actionable SigningError that never echoes the PIN", async () => {
    const { loadP12 } = await import("./p12-loader.js");
    const pin = "secret-pin-1234";

    const failure = await loadP12(Buffer.from("not a valid p12"), pin).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(SigningError);
    const message = (failure as Error).message;
    expect(message).toContain("node-forge");
    expect(message).toContain("npm install");
    expect(message).not.toContain(pin);
  });
});
