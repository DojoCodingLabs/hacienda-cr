/**
 * Tests para la regla de traslado de feriados (fecha observada).
 */

import { describe, it, expect } from "vitest";
import { calculateObservedDate } from "./holidays.js";

describe("calculateObservedDate - regla de traslado (7 casos)", () => {
  // Lunes: se queda
  it("lunes se queda en el mismo lunes", () => {
    // 2026-01-05 es lunes
    expect(calculateObservedDate("2026-01-05")).toBe("2026-01-05");
  });

  // Martes: lunes anterior
  it("martes se observa el lunes anterior", () => {
    // 2026-01-06 es martes -> lunes anterior 2026-01-05
    expect(calculateObservedDate("2026-01-06")).toBe("2026-01-05");
  });

  // Miércoles: lunes anterior
  it("miércoles se observa el lunes anterior", () => {
    // 2026-01-07 es miércoles -> lunes anterior 2026-01-05
    expect(calculateObservedDate("2026-01-07")).toBe("2026-01-05");
  });

  // Jueves: lunes siguiente
  it("jueves se observa el lunes siguiente", () => {
    // 2026-01-08 es jueves -> lunes siguiente 2026-01-12
    expect(calculateObservedDate("2026-01-08")).toBe("2026-01-12");
  });

  // Viernes: lunes siguiente
  it("viernes se observa el lunes siguiente", () => {
    // 2026-01-09 es viernes -> lunes siguiente 2026-01-12
    expect(calculateObservedDate("2026-01-09")).toBe("2026-01-12");
  });

  // Sábado: lunes siguiente
  it("sábado se observa el lunes siguiente", () => {
    // 2026-01-10 es sábado -> lunes siguiente 2026-01-12
    expect(calculateObservedDate("2026-01-10")).toBe("2026-01-12");
  });

  // Domingo: lunes siguiente
  it("domingo se observa el lunes siguiente", () => {
    // 2026-01-11 es domingo -> lunes siguiente 2026-01-12
    expect(calculateObservedDate("2026-01-11")).toBe("2026-01-12");
  });
});

describe("calculateObservedDate - casos reales del calendario vendorizado", () => {
  // Año Nuevo 2026: 2026-01-01 (jueves) -> lunes 2026-01-05
  it("Año Nuevo 2026 (jueves) -> lunes 2026-01-05", () => {
    expect(calculateObservedDate("2026-01-01")).toBe("2026-01-05");
  });

  // Día de la Independencia 2026: 2026-09-15 (martes) -> lunes 2026-09-14
  it("Independencia 2026 (martes) -> lunes 2026-09-14", () => {
    expect(calculateObservedDate("2026-09-15")).toBe("2026-09-14");
  });

  // Navidad 2026: 2026-12-25 (viernes) -> lunes 2026-12-28
  it("Navidad 2026 (viernes) -> lunes 2026-12-28", () => {
    expect(calculateObservedDate("2026-12-25")).toBe("2026-12-28");
  });

  // Año Nuevo 2029: 2029-01-01 (lunes) -> se queda
  it("Año Nuevo 2029 (lunes) -> se queda", () => {
    expect(calculateObservedDate("2029-01-01")).toBe("2029-01-01");
  });
});
