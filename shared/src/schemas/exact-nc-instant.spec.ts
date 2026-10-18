import { compareNcInstants } from "./exact-nc-instant.js";
it("compares all fractional digits without millisecond truncation and treats equivalent offsets equally", () => {
  expect(
    compareNcInstants("2026-10-18T12:00:00.0009-06:00", "2026-10-18T12:00:00.0001-06:00"),
  ).toBe(1);
  expect(compareNcInstants("2026-10-18T12:00:00.0009-06:00", "2026-10-18T18:00:00.000900Z")).toBe(
    0,
  );
  expect(
    compareNcInstants(
      "2026-10-18T12:00:00.999999999999999999-06:00",
      "2026-10-18T18:00:00.999999999999999998Z",
    ),
  ).toBe(1);
  expect(
    compareNcInstants("2026-10-18T23:59:59.999999999999999999-06:00", "2026-10-19T06:00:00Z"),
  ).toBe(-1);
  expect(compareNcInstants("2026-10-19T00:00:00.0009+02:00", "2026-10-18T22:00:00.000900Z")).toBe(
    0,
  );
  expect(compareNcInstants("1960-01-01T00:00:00.0009Z", "1960-01-01T00:00:00.0001Z")).toBe(1);
  expect(compareNcInstants("not-an-instant", "2026-10-18T22:00:00Z")).toBeNull();
});
