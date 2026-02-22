import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "./index.js";

describe("@dojocoding/hacienda-sdk", () => {
  it("should export the package name", () => {
    expect(PACKAGE_NAME).toBe("@dojocoding/hacienda-sdk");
  });
});
