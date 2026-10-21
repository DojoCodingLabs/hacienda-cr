/**
 * Tipos para el calendario de feriados y aritmética de días hábiles.
 */

export interface HolidayEntry {
  name: string;
  dates: Record<string, string>; // year -> YYYY-MM-DD (nominal)
}

export interface HolidaysData {
  $schema: string;
  description: string;
  version: string;
  yearRange: [number, number];
  source: {
    name: string;
    url: string;
    type: "official";
    disclaimer: string;
  };
  holidays: HolidayEntry[];
}

export interface ObservedHoliday {
  name: string;
  nominal: string; // YYYY-MM-DD
  observed: string; // YYYY-MM-DD
  year: number;
}

export interface BusinessDayOptions {
  /** Número de días hábiles para el plazo (ej. 2 para el reglamento) */
  businessDays: number;
  /** Fecha de referencia (instante con zona) */
  referenceDate: Date | string;
}

export interface BusinessDayResult {
  /** Si el plazo venció a la fecha de referencia */
  expired: boolean;
  /** Día hábil en que venció el plazo (si expired=true) */
  expiredOnBusinessDay?: number;
  /** Días hábiles que faltan (si expired=false) */
  remainingBusinessDays?: number;
  /** Civil deadline date represented at noon UTC; not a legal expiry instant. */
  deadline: Date;
}

export interface CalendarRange {
  minYear: number;
  maxYear: number;
}

export const CALENDAR_RANGE: CalendarRange = {
  minYear: 2026,
  maxYear: 2026,
};

export const TIMEZONE = "America/Costa_Rica" as const;
