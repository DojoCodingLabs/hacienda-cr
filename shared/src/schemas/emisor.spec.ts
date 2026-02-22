import { describe, it, expect } from "vitest";
import { EmisorSchema } from "./emisor.js";

const validEmisor = {
  nombre: "Empresa Test S.A.",
  identificacion: {
    tipo: "02" as const,
    numero: "3101234567",
  },
  correoElectronico: "test@empresa.cr",
};

describe("EmisorSchema", () => {
  it("should accept a valid emisor with minimal fields", () => {
    const result = EmisorSchema.safeParse(validEmisor);
    expect(result.success).toBe(true);
  });

  it("should accept a valid emisor with all optional fields", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      nombreComercial: "Mi Tienda",
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        barrio: "01",
        otrasSenas: "100 metros norte del parque",
      },
      telefono: {
        codigoPais: "506",
        numTelefono: "22223333",
      },
      fax: {
        codigoPais: "506",
        numTelefono: "22224444",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing nombre", () => {
    const { nombre: _, ...withoutNombre } = validEmisor;
    const result = EmisorSchema.safeParse(withoutNombre);
    expect(result.success).toBe(false);
  });

  it("should reject empty nombre", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      nombre: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      correoElectronico: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing identificacion", () => {
    const { identificacion: _, ...withoutId } = validEmisor;
    const result = EmisorSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("should reject nombre exceeding 100 chars", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      nombre: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid province code", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      ubicacion: {
        provincia: "8",
        canton: "01",
        distrito: "01",
      },
    });
    expect(result.success).toBe(false);
  });
});
