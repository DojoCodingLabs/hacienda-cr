import { describe, it, expect } from "vitest";
import { FacturaElectronicaSchema, ResumenFacturaSchema } from "./factura.js";

const validFactura = {
  clave: "50601072500012345678900100001010000000001199999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: {
    nombre: "Empresa Test S.A.",
    identificacion: {
      tipo: "02" as const,
      numero: "3101234567",
    },
    correoElectronico: "emisor@test.cr",
  },
  receptor: {
    nombre: "Cliente Test",
    identificacion: {
      tipo: "01" as const,
      numero: "123456789",
    },
    correoElectronico: "receptor@test.cr",
  },
  condicionVenta: "01" as const,
  medioPago: ["01" as const],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio de consultoría",
      precioUnitario: 100000,
      montoTotal: 100000,
      subTotal: 100000,
      impuesto: [
        {
          codigo: "01" as const,
          codigoTarifa: "08" as const,
          tarifa: 13,
          monto: 13000,
        },
      ],
      impuestoNeto: 13000,
      montoTotalLinea: 113000,
    },
  ],
  resumenFactura: {
    totalServGravados: 100000,
    totalServExentos: 0,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 100000,
    totalExento: 0,
    totalVenta: 100000,
    totalDescuentos: 0,
    totalVentaNeta: 100000,
    totalImpuesto: 13000,
    totalComprobante: 113000,
  },
};

describe("FacturaElectronicaSchema", () => {
  it("should accept a valid factura electronica", () => {
    const result = FacturaElectronicaSchema.safeParse(validFactura);
    expect(result.success).toBe(true);
  });

  it("should accept a factura with multiple line items", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      detalleServicio: [
        validFactura.detalleServicio[0],
        {
          ...validFactura.detalleServicio[0],
          numeroLinea: 2,
          detalle: "Segundo servicio",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a factura with multiple payment methods", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      medioPago: ["01", "02"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a factura with credit condition and term", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      condicionVenta: "02",
      plazoCredito: "30",
    });
    expect(result.success).toBe(true);
  });

  it("should accept a factura with reference information", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: "50601072500012345678900100001010000000001199999998",
          fechaEmision: "2025-07-20T10:30:00-06:00",
          codigo: "01",
          razon: "Corrección de monto",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a factura with foreign currency", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      resumenFactura: {
        ...validFactura.resumenFactura,
        codigoTipoMoneda: {
          codigoMoneda: "USD",
          tipoCambio: 530.5,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing receptor", () => {
    const { receptor: _, ...withoutReceptor } = validFactura;
    const result = FacturaElectronicaSchema.safeParse(withoutReceptor);
    expect(result.success).toBe(false);
  });

  it("should reject empty detalleServicio", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      detalleServicio: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty medioPago", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      medioPago: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid clave (not 50 digits)", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      clave: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid activity code (not 6 digits)", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      codigoActividad: "123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid consecutivo (not 20 digits)", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      numeroConsecutivo: "001",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid sale condition code", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      condicionVenta: "50",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid payment method code", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      medioPago: ["50"],
    });
    expect(result.success).toBe(false);
  });
});

describe("ResumenFacturaSchema", () => {
  it("should accept a valid summary", () => {
    const result = ResumenFacturaSchema.safeParse(validFactura.resumenFactura);
    expect(result.success).toBe(true);
  });

  it("should reject negative totalComprobante", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validFactura.resumenFactura,
      totalComprobante: -100,
    });
    expect(result.success).toBe(false);
  });

  it("should accept summary with exonerated totals", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validFactura.resumenFactura,
      totalServExonerado: 5000,
      totalMercExonerada: 3000,
      totalExonerado: 8000,
    });
    expect(result.success).toBe(true);
  });
});
