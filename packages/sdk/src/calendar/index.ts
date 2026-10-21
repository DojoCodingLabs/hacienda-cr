/**
 * Módulo de calendario de feriados y aritmética de días hábiles para Costa Rica.
 *
 * @module calendar
 */

export {
  loadHolidaysData,
  getHolidayEntries,
  getCalendarRange,
  calculateObservedDate,
  getObservedHolidaysForYear,
  getAllObservedHolidays,
  isObservedHoliday,
  clearCache,
} from "./holidays.js";

export {
  isBusinessDay,
  addBusinessDays,
  businessDaysBetween,
  checkBusinessDayDeadline,
  CALENDAR_RANGE,
  TIMEZONE,
} from "./business-days.js";

export type {
  HolidayEntry,
  HolidaysData,
  ObservedHoliday,
  BusinessDayOptions,
  BusinessDayResult,
  CalendarRange,
} from "./types.js";
