/**
 * Aritmética de días hábiles en zona America/Costa_Rica.
 *
 * Un día hábil es lunes a viernes que no sea feriado observado.
 * Los cálculos se hacen en días de calendario de la zona (no en milisegundos).
 */

import { parseDateLocal, formatDateLocal, getDayOfWeek, isObservedHoliday } from "./holidays.js";
import { CALENDAR_RANGE } from "./types.js";

/**
 * Convierte un Date o string a Date en UTC mediodía (para evitar problemas de DST).
 * Acepta strings ISO con zona o YYYY-MM-DD.
 */
function toUtcNoon(input: Date | string): Date {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return parseDateLocal(input);
  if (typeof input === "string" && !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input))
    throw new RangeError("Expected a civil date or ISO instant with timezone");
  if (typeof input === "string") {
    // Date.parse normalizes impossible civil dates such as February 30.
    parseDateLocal(input.slice(0, 10));
    if (/T24:/.test(input)) throw new RangeError("Expected an hour from 00 to 23");
  }
  const instant = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(instant.getTime())) throw new RangeError("Invalid date");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const field = (type: string) => parts.find((part) => part.type === type)?.value;
  return parseDateLocal(`${field("year")}-${field("month")}-${field("day")}`);
}

/**
 * Verifica si una fecha (YYYY-MM-DD) es día hábil.
 * Día hábil = lunes a viernes Y no feriado observado.
 */
export function isBusinessDay(date: Date | string): boolean {
  const utcNoon = toUtcNoon(date);
  assertInRange(utcNoon);
  const dateStr = formatDateLocal(utcNoon);
  const dayOfWeek = getDayOfWeek(utcNoon);

  // Lunes(1) a Viernes(5)
  if (dayOfWeek < 1 || dayOfWeek > 5) {
    return false;
  }

  // No feriado observado
  if (isObservedHoliday(dateStr)) {
    return false;
  }

  return true;
}

/**
 * Verifica que la fecha esté dentro del rango cubierto por el calendario.
 * Lanza error si está fuera de rango.
 */
function assertInRange(date: Date | string): void {
  const utcNoon = toUtcNoon(date);
  const year = utcNoon.getUTCFullYear();

  if (year < CALENDAR_RANGE.minYear || year > CALENDAR_RANGE.maxYear) {
    throw new RangeError(
      `Fecha ${formatDateLocal(utcNoon)} fuera del rango del calendario vendorizado (${CALENDAR_RANGE.minYear}–${CALENDAR_RANGE.maxYear}). ` +
        `El SDK no puede determinar días hábiles fuera de este rango.`,
    );
  }
}

/**
 * Suma días hábiles a una fecha, saltando fines de semana y feriados observados.
 * La fecha de inicio NO se cuenta; se cuenta a partir del siguiente día hábil.
 */
export function addBusinessDays(startDate: Date | string, businessDays: number): Date {
  if (!Number.isSafeInteger(businessDays) || businessDays < 0) {
    throw new RangeError("businessDays debe ser >= 0");
  }
  if (businessDays === 0) {
    assertInRange(startDate);
    return toUtcNoon(startDate);
  }

  const start = toUtcNoon(startDate);
  assertInRange(start);

  let current = new Date(start.getTime());
  let added = 0;

  while (added < businessDays) {
    // Avanzar un día calendario
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    assertInRange(current);

    if (isBusinessDay(current)) {
      added++;
    }
  }

  return current;
}

/**
 * Cuenta los días hábiles entre dos fechas.
 * Incluye el inicio, excluye el final.
 * Retorna 0 si ambas caen en el mismo día hábil.
 */
export function businessDaysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = toUtcNoon(startDate);
  const end = toUtcNoon(endDate);

  assertInRange(start);
  assertInRange(end);

  if (start.getTime() >= end.getTime()) {
    return 0;
  }

  let count = 0;
  let current = new Date(start.getTime());

  while (current.getTime() < end.getTime()) {
    if (isBusinessDay(current)) {
      count++;
    }
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return count;
}

/**
 * Calcula si un plazo en días hábiles ha vencido a una fecha de referencia.
 */
export function checkBusinessDayDeadline(options: {
  businessDays: number;
  referenceDate: Date | string;
  startDate: Date | string;
}): {
  expired: boolean;
  expiredOnBusinessDay?: number;
  remainingBusinessDays?: number;
  deadline: Date;
} {
  const { businessDays, referenceDate, startDate } = options;

  if (!Number.isSafeInteger(businessDays) || businessDays < 1) {
    throw new RangeError("businessDays debe ser >= 1");
  }

  const start = toUtcNoon(startDate);
  const reference = toUtcNoon(referenceDate);

  assertInRange(start);
  assertInRange(reference);

  // Calcular la fecha límite (deadline)
  const deadline = addBusinessDays(start, businessDays);

  // Contar días hábiles entre inicio y referencia
  const remaining =
    reference.getTime() >= deadline.getTime()
      ? 0
      : Math.min(
          businessDays,
          businessDaysBetween(reference, deadline) + 1 - (isBusinessDay(reference) ? 1 : 0),
        );

  if (reference.getTime() > deadline.getTime()) {
    return {
      expired: true,
      expiredOnBusinessDay: businessDays,
      deadline,
    };
  } else {
    return {
      expired: false,
      remainingBusinessDays: remaining,
      deadline,
    };
  }
}

export { CALENDAR_RANGE, TIMEZONE } from "./types.js";
export type { BusinessDayResult, CalendarRange } from "./types.js";
