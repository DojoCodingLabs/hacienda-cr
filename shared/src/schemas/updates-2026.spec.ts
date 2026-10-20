import { describe, expect, it } from "vitest";
import { IdentificacionSchema } from "./identification.js";
import { TelefonoSchema } from "./common.js";
import { ImpuestoSchema } from "./linea-detalle.js";

const alcohol = {
  codigo: "04",
  monto: 82.26584,
  datosImpuestoEspecifico: {
    cantidadUnidadMedida: 333.33,
    porcentaje: 12.34,
    proporcion: 41.13292,
    impuestoUnidad: 1,
  },
};
describe("2026 v4.4 updates", () => {
  it("allows letters only in ten-character legal entity IDs", () => {
    expect(IdentificacionSchema.safeParse({ tipo: "02", numero: "310ABC1234" }).success).toBe(true);
    for (const tipo of ["01", "03", "04"])
      expect(IdentificacionSchema.safeParse({ tipo, numero: "310ABC1234" }).success).toBe(false);
    for (const numero of ["310-BC1234", "310ABC123", "310ABC12345", "310ÁBC1234"])
      expect(IdentificacionSchema.safeParse({ tipo: "02", numero }).success).toBe(false);
  });
  it.each(["911", "112", "22223333", "12345678901234567890"])("allows phone %s", (numTelefono) => {
    expect(TelefonoSchema.safeParse({ codigoPais: "506", numTelefono }).success).toBe(true);
  });
  it.each(["1", "12", "1234", "1234567", "123456789012345678901", "9A1", "000"])(
    "rejects phone %s",
    (numTelefono) => {
      expect(TelefonoSchema.safeParse({ codigoPais: "506", numTelefono }).success).toBe(false);
    },
  );
  it("allows ISC with only a monetary amount", () => {
    expect(ImpuestoSchema.safeParse({ codigo: "02", monto: 123.45 }).success).toBe(true);
  });
  it("preserves five proportion decimals and rejects excess precision or missing factors", () => {
    expect(ImpuestoSchema.parse(alcohol).datosImpuestoEspecifico?.proporcion).toBe(41.13292);
    expect(
      ImpuestoSchema.safeParse({
        ...alcohol,
        datosImpuestoEspecifico: {
          ...alcohol.datosImpuestoEspecifico,
          porcentaje: 100,
          proporcion: 333.33,
        },
      }).success,
    ).toBe(true);
    for (const proporcion of [41.132922, -1, Infinity])
      expect(
        ImpuestoSchema.safeParse({
          ...alcohol,
          datosImpuestoEspecifico: { ...alcohol.datosImpuestoEspecifico, proporcion },
        }).success,
      ).toBe(false);
    expect(ImpuestoSchema.safeParse({ codigo: "04", monto: 1 }).success).toBe(false);
  });
});
