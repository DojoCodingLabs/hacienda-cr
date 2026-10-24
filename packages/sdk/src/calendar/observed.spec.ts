import { describe, it, expect } from "vitest";
import {
  calculateObservedDate,
  getAllObservedHolidays,
  getCalendarRange,
  getObservedHolidaysForYear,
  loadHolidaysData,
} from "./holidays.js";
import { CALENDAR_RANGE } from "./types.js";
import { isBusinessDay, addBusinessDays, checkBusinessDayDeadline } from "./business-days.js";

const GOLDEN_NOMINAL = [
  "2025-01-01",
  "2025-04-11",
  "2025-04-17",
  "2025-04-18",
  "2025-05-01",
  "2025-07-25",
  "2025-08-02",
  "2025-08-15",
  "2025-08-31",
  "2025-09-15",
  "2025-12-01",
  "2025-12-25",
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
].sort();

describe("official bounded 2025-2026 civil calendar", () => {
  it("keeps the 24 reviewed dates on their nominal day", () => {
    expect(
      getAllObservedHolidays()
        .map((holiday) => holiday.nominal)
        .sort(),
    ).toEqual(GOLDEN_NOMINAL);
    for (const year of [2025, 2026]) {
      for (const holiday of getObservedHolidaysForYear(year)) {
        expect(holiday.observed).toBe(holiday.nominal);
      }
    }
  });

  it("covers 2025 with twelve holidays and no Monday transfers", () => {
    const holidays = getObservedHolidaysForYear(2025);
    expect(holidays).toHaveLength(12);
    expect(holidays.map((holiday) => holiday.observed).sort()).toEqual(
      GOLDEN_NOMINAL.filter((date) => date.startsWith("2025")),
    );
    expect(isBusinessDay("2025-09-15")).toBe(false);
    expect(isBusinessDay("2025-09-16")).toBe(true);
  });

  it("observes 15 September and 25 December 2026 on their own day", () => {
    expect(isBusinessDay("2026-09-15")).toBe(false);
    expect(isBusinessDay("2026-09-14")).toBe(true);
    expect(isBusinessDay("2026-12-25")).toBe(false);
    expect(isBusinessDay("2026-12-28")).toBe(true);
  });

  it("skips Semana Santa in 2025 and 2026", () => {
    for (const date of ["2025-04-17", "2025-04-18", "2026-04-02", "2026-04-03"]) {
      expect(isBusinessDay(date)).toBe(false);
    }
  });

  it("derives the public range from the vendored JSON", () => {
    const data = loadHolidaysData();
    expect(getCalendarRange()).toEqual({ minYear: 2025, maxYear: 2026 });
    expect(CALENDAR_RANGE).toEqual({
      minYear: data.yearRange[0],
      maxYear: data.yearRange[1],
    });
  });

  it("returns the nominal date unless an explicit override exists", () => {
    expect(calculateObservedDate("2026-09-15")).toBe("2026-09-15");
    expect(calculateObservedDate("2026-09-15", "2026-09-14")).toBe("2026-09-14");
  });

  it("converts instants into the Costa Rica civil day", () => {
    expect(isBusinessDay("2026-10-23T23:30:00-06:00")).toBe(true);
    expect(isBusinessDay(new Date("2026-10-24T05:30:00Z"))).toBe(true);
    expect(isBusinessDay("2026-10-24T00:30:00-06:00")).toBe(false);
  });

  it("rejects invalid dates, out-of-range years and invalid counts", () => {
    for (const date of [
      "2026-02-30",
      "2026-02-30T12:00:00-06:00",
      "2026-10-21T24:00:00-06:00",
      "2031-01-01",
      "2027-01-01",
      "2024-12-31",
      "bad",
      "2026-01-01T00:00:00",
    ])
      expect(() => addBusinessDays(date, 0)).toThrow();
    for (const count of [NaN, Infinity, 0.5, -1])
      expect(() => addBusinessDays("2026-10-21", count)).toThrow();
  });

  it("names the covered range when a year falls outside it", () => {
    expect(() => addBusinessDays("2024-12-31", 0)).toThrow(/2025–2026/);
    expect(() => addBusinessDays("2027-01-01", 0)).toThrow(/2025–2026/);
    expect(() => getObservedHolidaysForYear(2024)).toThrow(/2025–2026/);
    expect(() => getObservedHolidaysForYear(2027)).toThrow(/2025–2026/);
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
