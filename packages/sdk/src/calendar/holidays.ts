/**
 * Carga y procesa el calendario de feriados vendorizado.
 */

import data from "../../schemas/feriados/feriados-2026.json";
import type { HolidaysData, HolidayEntry, ObservedHoliday, CalendarRange } from "./types.js";

/** Returns a copy: callers cannot mutate the SDK's calendar. */
export function loadHolidaysData(): HolidaysData {
  return structuredClone(data) as unknown as HolidaysData;
}

export function getHolidayEntries(): HolidayEntry[] {
  return loadHolidaysData().holidays;
}

export function getCalendarRange(): CalendarRange {
  const data = loadHolidaysData();
  return {
    minYear: data.yearRange[0],
    maxYear: data.yearRange[1],
  };
}

/**
 * Parse YYYY-MM-DD as local date in Costa Rica timezone.
 * Creates a date at noon UTC to avoid DST edge cases at midnight.
 */
export function parseDateLocal(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new RangeError("Expected YYYY-MM-DD");
  const [year, month, day] = dateStr.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (formatDateLocal(date) !== dateStr) throw new RangeError("Invalid civil date");
  return date;
}

/**
 * Format a Date as YYYY-MM-DD in UTC (Costa Rica local date).
 */
export function formatDateLocal(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/**
 * Calcula la fecha observada a partir de la fecha nominal según la regla de traslado:
 * - Lunes: se queda
 * - Martes/Miércoles: lunes anterior
 * - Jueves/Viernes/Sábado/Domingo: lunes siguiente
 */
/** 2026 official dates are observed on their listed date; no inferred transfer. */
export function calculateObservedDate(nominalDate: string): string {
  return formatDateLocal(parseDateLocal(nominalDate));
}

export function getObservedHolidaysForYear(year: number): ObservedHoliday[] {
  const range = getCalendarRange();
  if (!Number.isInteger(year) || year < range.minYear || year > range.maxYear)
    throw new RangeError("Calendar year is not covered by reviewed data");
  const entries = getHolidayEntries();
  const result: ObservedHoliday[] = [];

  for (const entry of entries) {
    const nominal = entry.dates[String(year)];
    if (nominal) {
      const observed = calculateObservedDate(nominal);
      result.push({
        name: entry.name,
        nominal,
        observed,
        year,
      });
    }
  }

  return result;
}

export function getAllObservedHolidays(): ObservedHoliday[] {
  const range = getCalendarRange();
  const result: ObservedHoliday[] = [];

  for (let year = range.minYear; year <= range.maxYear; year++) {
    result.push(...getObservedHolidaysForYear(year));
  }

  return result;
}

export function isObservedHoliday(date: string): boolean {
  const year = parseDateLocal(date).getUTCFullYear();
  const range = getCalendarRange();
  if (year < range.minYear || year > range.maxYear)
    throw new RangeError("Calendar year is not covered");
  const observedHolidays = getAllObservedHolidays();
  return observedHolidays.some((h) => h.observed === date);
}

export function clearCache(): void {
  // Calendar is embedded and immutable; retained for source compatibility.
}
