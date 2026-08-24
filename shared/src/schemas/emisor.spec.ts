import { describe, it, expect } from "vitest";
import { EmisorSchema } from "./emisor.js";

const validEmisor = {
  nombre: "Empresa Test S.A.",
  identificacion: {
    tipo: "02" as const,
    numero: "3101234567",
  },
  ubicacion: {
    provincia: "1",
    canton: "01",
    distrito: "01",
    otrasSenas: "100 metros norte del parque",
  },
  correoElectronico: "test@empresa.cr",
};

describe("EmisorSchema", () => {
  it("should accept a valid emisor with minimal required fields", () => {
    const result = EmisorSchema.safeParse(validEmisor);
    expect(result.success).toBe(true);
  });

  it("should accept a valid emisor with all optional fields", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      nombreComercial: "Mi Tienda",
      registrofiscal8707: "870712345678",
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        barrio: "Barrio El Carmen",
        otrasSenas: "100 metros norte del parque",
      },
      telefono: {
        codigoPais: "506",
        numTelefono: "22223333",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept correoElectronico as an array of up to 4 emails", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      correoElectronico: [
        "uno@empresa.cr",
        "dos@empresa.cr",
        "tres@empresa.cr",
        "cuatro@empresa.cr",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject correoElectronico array with more than 4 emails", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      correoElectronico: [
        "uno@empresa.cr",
        "dos@empresa.cr",
        "tres@empresa.cr",
        "cuatro@empresa.cr",
        "cinco@empresa.cr",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject an empty correoElectronico array", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      correoElectronico: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject correoElectronico array containing an invalid email", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      correoElectronico: ["uno@empresa.cr", "not-an-email"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing ubicacion (required by v4.4)", () => {
    const { ubicacion: _, ...withoutUbicacion } = validEmisor;
    const result = EmisorSchema.safeParse(withoutUbicacion);
    expect(result.success).toBe(false);
  });

  it("should reject ubicacion without otrasSenas (required by v4.4)", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject registrofiscal8707 exceeding 12 chars", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      registrofiscal8707: "8707123456789",
    });
    expect(result.success).toBe(false);
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

  it("should reject nombre exceeding 100 chars", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      nombre: "A".repeat(101),
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

  it("should reject invalid province code", () => {
    const result = EmisorSchema.safeParse({
      ...validEmisor,
      ubicacion: {
        ...validEmisor.ubicacion,
        provincia: "8",
      },
    });
    expect(result.success).toBe(false);
  });
});
