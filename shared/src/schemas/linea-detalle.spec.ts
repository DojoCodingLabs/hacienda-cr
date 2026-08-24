import { describe, it, expect } from "vitest";
import {
  LineaDetalleSchema,
  ImpuestoSchema,
  DescuentoSchema,
  ExoneracionSchema,
} from "./linea-detalle.js";

const validImpuesto = {
  codigo: "01",
  codigoTarifaIVA: "08",
  tarifa: 13,
  monto: 13000,
};

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
  impuesto: [validImpuesto],
};

describe("LineaDetalleSchema", () => {
  it("should accept a valid line item", () => {
    const result = LineaDetalleSchema.safeParse(validLineItem);
    expect(result.success).toBe(true);
  });

  it("should accept a line item with all optional v4.4 fields", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      partidaArancelaria: "8471300000",
      tipoTransaccion: "01",
      unidadMedidaComercial: "Caja",
      numeroVINoSerie: ["1HGBH41JXMN109186"],
      baseImponible: 100000,
      impuestoAsumidoEmisorFabrica: 0,
      impuestoNeto: 13000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a line item with discount", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      descuento: [
        {
          montoDescuento: 5000,
          codigoDescuento: "01",
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

  it("should reject a line item without impuesto (required min 1 in v4.4)", () => {
    const { impuesto: _, ...withoutTax } = validLineItem;
    const result = LineaDetalleSchema.safeParse(withoutTax);
    expect(result.success).toBe(false);
  });

  it("should reject a line item with empty impuesto array", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      impuesto: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject a unit of measure outside the official catalog", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      unidadMedida: "kg", // official catalog uses "Kg"
    });
    expect(result.success).toBe(false);
  });

  it("should accept official service unit codes", () => {
    for (const unidadMedida of ["Sp", "Os", "Spe", "h"]) {
      const result = LineaDetalleSchema.safeParse({
        ...validLineItem,
        unidadMedida,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject partidaArancelaria exceeding 15 chars", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      partidaArancelaria: "1".repeat(16),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid tipoTransaccion code", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      tipoTransaccion: "14",
    });
    expect(result.success).toBe(false);
  });

  it("should reject unidadMedidaComercial exceeding 20 chars", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      unidadMedidaComercial: "A".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("should reject numeroVINoSerie entries exceeding 17 chars", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      numeroVINoSerie: ["1".repeat(18)],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative impuestoAsumidoEmisorFabrica", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      impuestoAsumidoEmisorFabrica: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 5 discounts", () => {
    const discount = {
      montoDescuento: 100,
      codigoDescuento: "01" as const,
    };
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      descuento: Array.from({ length: 6 }, () => discount),
    });
    expect(result.success).toBe(false);
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

  it("should reject detalle shorter than 3 chars", () => {
    const result = LineaDetalleSchema.safeParse({
      ...validLineItem,
      detalle: "AB",
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
    const result = ImpuestoSchema.safeParse(validImpuesto);
    expect(result.success).toBe(true);
  });

  it("should accept the new v4.4 IVA rate codes (09-11)", () => {
    for (const codigoTarifaIVA of ["09", "10", "11"]) {
      const result = ImpuestoSchema.safeParse({
        ...validImpuesto,
        codigoTarifaIVA,
        tarifa: 0.5,
        monto: 500,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept a tax without codigoTarifaIVA (non-IVA)", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "02",
      tarifa: 10,
      monto: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a used-goods IVA tax with factorCalculoIVA", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "08",
      factorCalculoIVA: 1.5,
      monto: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should reject factorCalculoIVA above 9.9999", () => {
    const result = ImpuestoSchema.safeParse({
      codigo: "08",
      factorCalculoIVA: 10,
      monto: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("should accept a tax with exoneration", () => {
    const result = ImpuestoSchema.safeParse({
      ...validImpuesto,
      monto: 6500,
      exoneracion: {
        tipoDocumento: "04",
        numeroDocumento: "AL-001-2024",
        nombreInstitucion: "01",
        fechaEmision: "2024-01-15T00:00:00-06:00",
        tarifaExonerada: 13,
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

  it("should reject an invalid IVA rate code", () => {
    const result = ImpuestoSchema.safeParse({
      ...validImpuesto,
      codigoTarifaIVA: "12",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative monto", () => {
    const result = ImpuestoSchema.safeParse({
      ...validImpuesto,
      monto: -100,
    });
    expect(result.success).toBe(false);
  });

  it("should reject tarifa above 99.99", () => {
    const result = ImpuestoSchema.safeParse({
      ...validImpuesto,
      tarifa: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("ExoneracionSchema", () => {
  const validExoneracion = {
    tipoDocumento: "03",
    numeroDocumento: "AL-001-2024",
    nombreInstitucion: "02",
    fechaEmision: "2024-01-15T00:00:00-06:00",
    tarifaExonerada: 13,
    montoExoneracion: 6500,
  };

  it("should accept a valid exoneration", () => {
    const result = ExoneracionSchema.safeParse(validExoneracion);
    expect(result.success).toBe(true);
  });

  it("should accept the new v4.4 exoneration document types (08-12)", () => {
    for (const tipoDocumento of ["08", "09", "10", "11", "12"]) {
      const result = ExoneracionSchema.safeParse({
        ...validExoneracion,
        tipoDocumento,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept tipoDocumento 99 with free-text tipoDocumentoOtros", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      tipoDocumento: "99",
      tipoDocumentoOtros: "Convenio internacional",
    });
    expect(result.success).toBe(true);
  });

  it("should accept nombreInstitucion 99 with free-text nombreInstitucionOtros", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      nombreInstitucion: "99",
      nombreInstitucionOtros: "Institución especial",
    });
    expect(result.success).toBe(true);
  });

  it("should accept optional articulo and inciso integers", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      articulo: 11,
      inciso: 3,
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer articulo", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      articulo: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject an unknown exoneration document type", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      tipoDocumento: "13",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a free-text nombreInstitucion (must be a coded value in v4.4)", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      nombreInstitucion: "Dirección General de Hacienda",
    });
    expect(result.success).toBe(false);
  });

  it("should reject numeroDocumento shorter than 3 chars", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      numeroDocumento: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("should reject numeroDocumento exceeding 40 chars", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      numeroDocumento: "A".repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it("should reject tarifaExonerada above 100", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      tarifaExonerada: 101,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative montoExoneracion", () => {
    const result = ExoneracionSchema.safeParse({
      ...validExoneracion,
      montoExoneracion: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("DescuentoSchema", () => {
  it("should accept a valid discount with required codigoDescuento", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      codigoDescuento: "01",
      naturalezaDescuento: "Descuento por volumen",
    });
    expect(result.success).toBe(true);
  });

  it("should accept a discount without naturalezaDescuento (optional in v4.4)", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      codigoDescuento: "02",
    });
    expect(result.success).toBe(true);
  });

  it("should accept codigoDescuento 99 with free-text codigoDescuentoOtros", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      codigoDescuento: "99",
      codigoDescuentoOtros: "Descuento especial",
    });
    expect(result.success).toBe(true);
  });

  it("should reject a discount without codigoDescuento (required in v4.4)", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      naturalezaDescuento: "Descuento por volumen",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an unknown codigoDescuento", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      codigoDescuento: "10",
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero discount amount", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 0,
      codigoDescuento: "01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative discount amount", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: -100,
      codigoDescuento: "01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject naturalezaDescuento shorter than 3 chars", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      codigoDescuento: "01",
      naturalezaDescuento: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("should reject naturalezaDescuento exceeding 80 chars", () => {
    const result = DescuentoSchema.safeParse({
      montoDescuento: 5000,
      codigoDescuento: "01",
      naturalezaDescuento: "A".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});
