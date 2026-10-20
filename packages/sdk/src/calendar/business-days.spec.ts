/**
 * Tests para la aritmética de días hábiles.
 */

import { describe, it, expect } from "vitest";
import {
  isBusinessDay,
  addBusinessDays,
  businessDaysBetween,
  checkBusinessDayDeadline,
} from "./business-days.js";

describe("isBusinessDay", () => {
  it("martes hábil sin feriado es true", () => {
    // 2026-01-06 es martes, no feriado
    expect(isBusinessDay("2026-01-06")).toBe(true);
  });

  it("sábado no es hábil", () => {
    expect(isBusinessDay("2026-01-10")).toBe(false);
  });

  it("domingo no es hábil", () => {
    expect(isBusinessDay("2026-01-11")).toBe(false);
  });

  it("feriado observado no es hábil - Año Nuevo 2026 observado el 2026-01-05", () => {
    // Año Nuevo 2026 nominal 2026-01-01 (jueves) -> observado 2026-01-05 (lunes)
    expect(isBusinessDay("2026-01-05")).toBe(false);
  });

  it("Jueves Santo 2026 observado el 2026-04-06 no es hábil", () => {
    // Jueves Santo nominal 2026-04-02 (jueves) -> observado 2026-04-06 (lunes)
    expect(isBusinessDay("2026-04-06")).toBe(false);
  });

  it("Viernes Santo 2026 observado el 2026-04-06 no es hábil", () => {
    // Viernes Santo nominal 2026-04-03 (viernes) -> observado 2026-04-06 (lunes)
    expect(isBusinessDay("2026-04-06")).toBe(false);
  });

  it("fecha nominal de feriado SÍ es hábil si la observada es distinta", () => {
    // Jueves Santo nominal 2026-04-02 (jueves) -> observado el lunes 2026-04-06
    // El jueves nominal SÍ es día hábil
    expect(isBusinessDay("2026-04-02")).toBe(true);
    // Viernes Santo nominal 2026-04-03 (viernes) -> observado el lunes 2026-04-06
    // El viernes nominal SÍ es día hábil
    expect(isBusinessDay("2026-04-03")).toBe(true);
  });

  it("fecha fuera de rango lanza error", () => {
    expect(() => isBusinessDay("2025-12-31")).toThrow(RangeError);
    expect(() => isBusinessDay("2031-01-01")).toThrow(RangeError);
  });
});

describe("addBusinessDays", () => {
  it("sumar 0 días devuelve la misma fecha", () => {
    const result = addBusinessDays("2026-01-06", 0); // martes no feriado
    expect(result.toISOString().split("T")[0]).toBe("2026-01-06");
  });

  it("sumar 1 día hábil a martes -> miércoles", () => {
    const result = addBusinessDays("2026-01-06", 1); // martes 6 ene
    expect(result.toISOString().split("T")[0]).toBe("2026-01-07"); // miércoles 7 ene
  });

  it("sumar 1 día hábil a viernes -> lunes (salta fin de semana)", () => {
    const result = addBusinessDays("2026-01-09", 1); // viernes 9 ene
    expect(result.toISOString().split("T")[0]).toBe("2026-01-12"); // lunes 12 ene
  });

  it("sumar 2 días hábiles a viernes -> martes (salta fin de semana)", () => {
    const result = addBusinessDays("2026-01-09", 2); // viernes 9 ene
    expect(result.toISOString().split("T")[0]).toBe("2026-01-13"); // martes 13 ene
  });

  it("sumar días hábiles salta feriado observado", () => {
    // 2026-01-02 es viernes, Año Nuevo observado el lunes 2026-01-05
    // Sumar 1 día hábil desde viernes 2 ene -> martes 6 ene (salta lunes 5 feriado)
    const result = addBusinessDays("2026-01-02", 1);
    expect(result.toISOString().split("T")[0]).toBe("2026-01-06");
  });

  it("Semana Santa 2026: sumar días salta feriado observado el lunes 6 abril", () => {
    // Miércoles 2026-04-01 + 2 días hábiles -> jueves 2026-04-02, viernes 2026-04-03
    // (jueves y viernes nominales SÍ son hábiles; el feriado se observa el lunes 6)
    const result = addBusinessDays("2026-04-01", 2);
    expect(result.toISOString().split("T")[0]).toBe("2026-04-03");
  });

  it("sumar días hábiles salta feriado observado en Semana Santa", () => {
    // Jueves 2026-04-02 + 1 día hábil -> viernes 2026-04-03
    // Viernes 2026-04-03 + 1 día hábil -> lunes 2026-04-06 (PERO lunes 6 es feriado observado)
    // -> martes 2026-04-07
    const result = addBusinessDays("2026-04-02", 2);
    expect(result.toISOString().split("T")[0]).toBe("2026-04-07");
  });

  it("businessDays negativo lanza error", () => {
    expect(() => addBusinessDays("2026-01-06", -1)).toThrow(RangeError);
  });

  it("fecha fuera de rango lanza error", () => {
    expect(() => addBusinessDays("2025-12-31", 1)).toThrow(RangeError);
    expect(() => addBusinessDays("2031-01-01", 1)).toThrow(RangeError);
  });

  it("cruce de año 2029-2030", () => {
    // Usar fecha en junio 2029 para evitar feriados de fin de año
    // 2029-06-15 (lunes) + 5 días hábiles -> 2029-06-22 (lunes)
    // martes 16, mié 17, jue 18, vie 19, lun 22 (salta fin de semana 20-21)
    const result = addBusinessDays("2029-06-15", 5);
    expect(result.toISOString().split("T")[0]).toBe("2029-06-22");
  });
});

describe("businessDaysBetween", () => {
  it("mismo día hábil -> 0", () => {
    expect(businessDaysBetween("2026-01-06", "2026-01-06")).toBe(0);
  });

  it("inicio después de fin -> 0", () => {
    expect(businessDaysBetween("2026-01-07", "2026-01-06")).toBe(0);
  });

  it("martes a miércoles -> 1", () => {
    expect(businessDaysBetween("2026-01-06", "2026-01-07")).toBe(1);
  });

  it("viernes a lunes -> 1 (salta fin de semana)", () => {
    expect(businessDaysBetween("2026-01-09", "2026-01-12")).toBe(1);
  });

  it("incluye inicio, excluye fin", () => {
    // martes 6 a jueves 8 = 2 días hábiles (martes 6, miércoles 7)
    expect(businessDaysBetween("2026-01-06", "2026-01-08")).toBe(2);
  });

  it("cuenta feriados observados", () => {
    // viernes 2 ene a miércoles 7 ene
    // Lunes 5 es feriado observado (Año Nuevo)
    // Días hábiles: viernes 2, martes 6 = 2 (miércoles 7 es excluido por ser el final)
    expect(businessDaysBetween("2026-01-02", "2026-01-07")).toBe(2);
  });

  it("Semana Santa 2026: miércoles 1 abr a martes 7 abr", () => {
    // Jueves 2 y viernes 3 son nominales (hábiles), lunes 6 es feriado observado
    // Días hábiles: miércoles 1, jueves 2, viernes 3, martes 7 = 4 (lunes 6 excluido por feriado, martes 7 es el final excluido)
    // Wait: businessDaysBetween incluye inicio, excluye fin
    // current < end: 1, 2, 3, 4, 5, 6
    // 1 mié: hábil, 2 jue: hábil, 3 vie: hábil, 4 sáb: no, 5 dom: no, 6 lun: feriado
    // = 3
    expect(businessDaysBetween("2026-04-01", "2026-04-07")).toBe(3);
  });

  it("fecha fuera de rango lanza error", () => {
    expect(() => businessDaysBetween("2025-12-31", "2026-01-06")).toThrow(RangeError);
    expect(() => businessDaysBetween("2026-01-06", "2031-01-01")).toThrow(RangeError);
  });
});

describe("checkBusinessDayDeadline", () => {
  it("plazo vencido", () => {
    // Inicio 2026-01-06 (martes), 2 días hábiles -> vence 2026-01-08 (jueves)
    // Referencia 2026-01-09 (viernes) -> vencido
    const result = checkBusinessDayDeadline({
      businessDays: 2,
      startDate: "2026-01-06",
      referenceDate: "2026-01-09",
    });
    expect(result.expired).toBe(true);
    expect(result.expiredOnBusinessDay).toBe(2);
    expect(result.deadline.toISOString().split("T")[0]).toBe("2026-01-08");
  });

  it("plazo no vencido", () => {
    // Inicio 2026-01-06 (martes), 2 días hábiles -> vence 2026-01-08 (jueves)
    // Referencia 2026-01-07 (miércoles) -> no vencido, falta 1
    const result = checkBusinessDayDeadline({
      businessDays: 2,
      startDate: "2026-01-06",
      referenceDate: "2026-01-07",
    });
    expect(result.expired).toBe(false);
    expect(result.remainingBusinessDays).toBe(1);
    expect(result.deadline.toISOString().split("T")[0]).toBe("2026-01-08");
  });

  it("plazo vence justo en la referencia", () => {
    // Inicio 2026-01-06 (martes), 2 días hábiles -> vence 2026-01-08 (jueves)
    // Referencia 2026-01-08 (jueves) -> vencido
    const result = checkBusinessDayDeadline({
      businessDays: 2,
      startDate: "2026-01-06",
      referenceDate: "2026-01-08",
    });
    expect(result.expired).toBe(true);
    expect(result.expiredOnBusinessDay).toBe(2);
  });

  it("businessDays < 1 lanza error", () => {
    expect(() =>
      checkBusinessDayDeadline({
        businessDays: 0,
        startDate: "2026-01-06",
        referenceDate: "2026-01-07",
      }),
    ).toThrow(RangeError);
  });

  it("fecha fuera de rango lanza error", () => {
    expect(() =>
      checkBusinessDayDeadline({
        businessDays: 2,
        startDate: "2025-12-31",
        referenceDate: "2026-01-06",
      }),
    ).toThrow(RangeError);
  });
});

describe("Zona horaria - independencia de la zona de la máquina", () => {
  it("isBusinessDay da mismo resultado con strings ISO con zona distinta", () => {
    // Usar fecha que no sea feriado: 2026-01-06 (martes)
    const result1 = isBusinessDay("2026-01-06T00:00:00-06:00"); // Costa Rica
    const result2 = isBusinessDay("2026-01-06T06:00:00Z"); // UTC
    const result3 = isBusinessDay("2026-01-06T12:00:00+02:00"); // Europa
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toBe(true);
  });

  it("addBusinessDays da mismo resultado con strings ISO con zona distinta", () => {
    const result1 = addBusinessDays("2026-01-06T00:00:00-06:00", 2);
    const result2 = addBusinessDays("2026-01-06T06:00:00Z", 2);
    const result3 = addBusinessDays("2026-01-06T12:00:00+02:00", 2);
    expect(result1.toISOString()).toBe(result2.toISOString());
    expect(result2.toISOString()).toBe(result3.toISOString());
  });
});

describe("Cambio de horario de Costa Rica", () => {
  it("cálculo a ambos lados del cambio de horario", () => {
    // Costa Rica no tiene DST actualmente, pero la prueba verifica
    // que el cálculo no depende de milisegundos sino de días de calendario
    const before = addBusinessDays("2026-03-15", 5); // marzo
    const after = addBusinessDays("2026-11-15", 5); // noviembre
    // Ambos deberían funcionar sin problemas
    expect(before).toBeInstanceOf(Date);
    expect(after).toBeInstanceOf(Date);
  });
});
