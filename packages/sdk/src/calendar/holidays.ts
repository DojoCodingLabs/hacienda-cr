/**
 * Carga y procesa el calendario de feriados vendorizado.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { HolidaysData, HolidayEntry, ObservedHoliday, CalendarRange } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FERIADOS_PATH = join(__dirname, "..", "..", "schemas", "feriados", "feriados-2026-2030.json");

let cachedData: HolidaysData | null = null;

export function loadHolidaysData(): HolidaysData {
  if (cachedData) return cachedData;
  const raw = readFileSync(FERIADOS_PATH, "utf8");
  cachedData = JSON.parse(raw) as HolidaysData;
  return cachedData;
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
  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
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
export function calculateObservedDate(nominalDate: string): string {
  const date = parseDateLocal(nominalDate);
  const dayOfWeek = getDayOfWeek(date); // 0=Sun, 1=Mon, ..., 6=Sat

  let observedDate: Date;

  if (dayOfWeek === 1) {
    // Lunes: se queda
    observedDate = date;
  } else if (dayOfWeek === 2 || dayOfWeek === 3) {
    // Martes o Miércoles: lunes anterior
    const daysBack = dayOfWeek - 1; // 1 para martes, 2 para miércoles
    observedDate = new Date(date.getTime() - daysBack * 24 * 60 * 60 * 1000);
  } else {
    // Jueves(4), Viernes(5), Sábado(6), Domingo(0): lunes siguiente
    const daysForward = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 1 para domingo, 4 para jueves, 3 para viernes, 2 para sábado
    observedDate = new Date(date.getTime() + daysForward * 24 * 60 * 60 * 1000);
  }

  return formatDateLocal(observedDate);
}

export function getObservedHolidaysForYear(year: number): ObservedHoliday[] {
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
  // date in YYYY-MM-DD format
  const observedHolidays = getAllObservedHolidays();
  return observedHolidays.some((h) => h.observed === date);
}

export function clearCache(): void {
  cachedData = null;
}
