import { it, expect } from "vitest";
import { parse } from "./exact-decimal.js";
it("validates grammar, field bounds and scale for every supported scale", () => {
  for (const scale of [0, 1, 2, 3, 4, 5])
    for (const value of ["-1", "1.2.3", "1000000000000000", "1e2", "+1"])
      expect(() => parse(value, scale)).toThrow();
  for (const scale of [-1, 0.5, 6, Infinity, NaN]) expect(() => parse("1", scale)).toThrow();
  expect(parse("9999999999999.99", 2)).toBe(999999999999999n);
});
