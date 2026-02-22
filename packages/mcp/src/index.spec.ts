import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "./index.js";

describe("@hacienda-cr/mcp", () => {
  it("should export the package name", () => {
    expect(PACKAGE_NAME).toBe("@hacienda-cr/mcp");
  });
});
