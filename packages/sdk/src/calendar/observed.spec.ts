import { describe, it, expect } from "vitest";
import { getObservedHolidaysForYear, loadHolidaysData } from "./holidays.js";
import { isBusinessDay, addBusinessDays, checkBusinessDayDeadline } from "./business-days.js";
describe("official bounded 2026 civil calendar", () => {
  it("preserves every official date without Monday transfers", () => {
    const dates = [
      "2026-01-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-11",
      "2026-05-01",
      "2026-07-25",
      "2026-08-02",
      "2026-08-15",
      "2026-08-31",
      "2026-09-15",
      "2026-12-01",
      "2026-12-25",
    ];
    expect(
      getObservedHolidaysForYear(2026)
        .map((h) => h.observed)
        .sort(),
    ).toEqual(dates.sort());
    for (const date of dates) expect(isBusinessDay(date)).toBe(false);
    expect(isBusinessDay("2026-01-05")).toBe(true);
  });
  it("converts instants into the Costa Rica civil day", () => {
    expect(isBusinessDay("2026-10-23T23:30:00-06:00")).toBe(true);
    expect(isBusinessDay(new Date("2026-10-24T05:30:00Z"))).toBe(true);
    expect(isBusinessDay("2026-10-24T00:30:00-06:00")).toBe(false);
  });
  it("rejects invalid dates, unknown years and invalid counts, including zero-day shortcut", () => {
    for (const date of [
      "2026-02-30",
      "2026-02-30T12:00:00-06:00",
      "2026-10-21T24:00:00-06:00",
      "2031-01-01",
      "2025-12-31",
      "bad",
      "2026-01-01T00:00:00",
    ])
      expect(() => addBusinessDays(date, 0)).toThrow();
    for (const count of [NaN, Infinity, 0.5, -1])
      expect(() => addBusinessDays("2026-10-21", count)).toThrow();
  });
  it("keeps the deadline day available and skips official holidays", () => {
    expect(addBusinessDays("2026-04-01", 1).toISOString()).toBe("2026-04-06T12:00:00.000Z");
    expect(
      checkBusinessDayDeadline({
        startDate: "2026-10-19",
        referenceDate: "2026-10-20",
        businessDays: 1,
      }).expired,
    ).toBe(false);
    expect(
      checkBusinessDayDeadline({
        startDate: "2026-10-19",
        referenceDate: "2026-10-21",
        businessDays: 1,
      }).expired,
    ).toBe(true);
  });
  it("does not expose mutable calendar state", () => {
    loadHolidaysData().holidays.length = 0;
    expect(getObservedHolidaysForYear(2026)).toHaveLength(12);
  });
});

it("reports zero remaining on a Monday deadline after a weekend start", () => {
  expect(
    checkBusinessDayDeadline({
      startDate: "2026-10-24",
      referenceDate: "2026-10-26",
      businessDays: 1,
    }),
  ).toMatchObject({ expired: false, remainingBusinessDays: 0 });
});
