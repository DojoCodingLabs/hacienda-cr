import { describe, it, expect } from "vitest";
import { LineaDetalleSchema, ImpuestoSchema, DescuentoSchema } from "./linea-detalle.js";

const validLineItem = {
  numeroLinea: 1,
  codigoCabys: "4321000000000",
  cantidad: 2,
  unidadMedida: "Unid",
  detalle: "Servicio de consultoría",
  precioUnitario: 50000,
  montoTotal: 100000,
  subTotal: 100000,
  montoTotalLinea: 113000,
  impuesto: [
    {
      codigo: "01",
      codigoTarifa: "08",
      tarifa: 13,
      monto: 13000,
    },
  ],
};

describe("LineaDetalleSchema", () => {
  it("should accept a valid line item", () => {
    const result = LineaDetalleSchema.safeParse(validLineItem);
    expect(result.success).toBe(true);
  });

  it("should accept a line item without taxes (exempt)", () => {
    const { impuesto: _, ...exempt } = validLineItem;
    const result = LineaDetalleSchema.safeParse({
      ...exempt,
      montoTotalLinea: 100000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a line item with discount", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      descuento: [
        {
          montoDescuento: 5000,
          naturalezaDescuento: "Descuento por volumen",
        },
      ],
      subTotal: 95000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a line item with commercial codes", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      codigoComercial: [
        { tipo: "01", codigo: "PROD-001" },
        { tipo: "04", codigo: "INT-123" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid CABYS code (not 13 digits)", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      codigoCabys: "12345", // too short
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-numeric CABYS code", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      codigoCabys: "432100000000A",
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero quantity", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      cantidad: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      cantidad: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty detalle", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      detalle: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject detalle exceeding 200 chars", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      detalle: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative precioUnitario", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      precioUnitario: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer numeroLinea", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      numeroLinea: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero numeroLinea", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      numeroLinea: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("ImpuestoSchema", () => {
  it("should accept a valid IVA tax", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "01",
      codigoTarifa: "08",
      tarifa: 13,
      monto: 13000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a tax without codigoTarifa (non-IVA)", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "02",
      tarifa: 10,
      monto: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a tax with exoneration", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "01",
      codigoTarifa: "08",
      tarifa: 13,
      monto: 6500,
      exoneracion: {
        tipoDocumento: "04",
        numeroDocumento: "AL-001-2024",
        nombreInstitucion: "Dirección General de Hacienda",
        fechaEmision: "2024-01-15T00:00:00-06:00",
        porcentajeExoneracion: 50,
        montoExoneracion: 6500,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid tax code", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "15",
      tarifa: 10,
      monto: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative monto", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "01",
      codigoTarifa: "08",
      tarifa: 13,
      monto: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("DescuentoSchema", () => {
  it("should accept a valid discount", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      naturalezaDescuento: "Descuento por volumen",
    });
    expect(result.success).toBe(true);
  });

  it("should reject zero discount amount", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 0,
      naturalezaDescuento: "Descuento",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative discount amount", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: -100,
      naturalezaDescuento: "Descuento",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty description", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      naturalezaDescuento: "",
    });
    expect(result.success).toBe(false);
  });
});
