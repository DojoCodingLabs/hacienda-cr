import { describe, it, expect } from "vitest";
import {
  FacturaElectronicaSchema,
  ResumenFacturaSchema,
  MedioPagoSchema,
  OtroCargoSchema,
  InformacionReferenciaSchema,
  TotalDesgloseImpuestoSchema,
} from "./factura.js";

const validLineItem = {
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
      codigoTarifaIVA: "08" as const,
      tarifa: 13,
      monto: 13000,
    },
  ],
  impuestoNeto: 13000,
  montoTotalLinea: 113000,
};

const validResumen = {
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
  medioPago: [{ tipoMedioPago: "01" as const, totalMedioPago: 113000 }],
  totalComprobante: 113000,
};

const validFactura = {
  clave: "50601072500012345678900100001010000000001199999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: {
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
  detalleServicio: [validLineItem],
  resumenFactura: validResumen,
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
        validLineItem,
        {
          ...validLineItem,
          numeroLinea: 2,
          detalle: "Segundo servicio",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a factura with codigoActividadReceptor", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      codigoActividadReceptor: "620200",
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

  it("should accept the v4.4 sale condition codes", () => {
    for (const condicionVenta of ["10", "12", "13", "14", "15"]) {
      const result = FacturaElectronicaSchema.safeParse({
        ...validFactura,
        condicionVenta,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept condicionVenta 99 with condicionVentaOtros", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      condicionVenta: "99",
      condicionVentaOtros: "Pago por adelantado parcial",
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

  it("should accept a factura with otros cargos", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      otrosCargos: [
        {
          tipoDocumento: "06",
          detalle: "Impuesto de servicio 10%",
          porcentaje: 10,
          montoCargo: 10000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing proveedorSistemas (required in v4.4)", () => {
    const { proveedorSistemas: _, ...withoutProveedor } = validFactura;
    const result = FacturaElectronicaSchema.safeParse(withoutProveedor);
    expect(result.success).toBe(false);
  });

  it("should reject proveedorSistemas exceeding 20 chars", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      proveedorSistemas: "A".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing codigoActividadEmisor", () => {
    const { codigoActividadEmisor: _, ...withoutActividad } = validFactura;
    const result = FacturaElectronicaSchema.safeParse(withoutActividad);
    expect(result.success).toBe(false);
  });

  it("should reject missing receptor", () => {
    const { receptor: _, ...withoutReceptor } = validFactura;
    const result = FacturaElectronicaSchema.safeParse(withoutReceptor);
    expect(result.success).toBe(false);
  });

  it("should reject receptor without identificacion", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      receptor: {
        nombre: "Cliente Test",
        correoElectronico: "receptor@test.cr",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty detalleServicio", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      detalleServicio: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject detalleServicio exceeding 1000 lines", () => {
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      detalleServicio: Array.from({ length: 1001 }, (_, i) => ({
        ...validLineItem,
        numeroLinea: i + 1,
      })),
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 15 otros cargos", () => {
    const cargo = {
      tipoDocumento: "04" as const,
      detalle: "Cobro de un tercero",
      montoCargo: 100,
    };
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      otrosCargos: Array.from({ length: 16 }, () => cargo),
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 10 informacionReferencia entries", () => {
    const referencia = {
      tipoDoc: "01" as const,
      fechaEmision: "2025-07-20T10:30:00-06:00",
    };
    const result = FacturaElectronicaSchema.safeParse({
      ...validFactura,
      informacionReferencia: Array.from({ length: 11 }, () => referencia),
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
      codigoActividadEmisor: "123",
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

  it("should reject sale condition codes removed in v4.4 (09, 11)", () => {
    for (const condicionVenta of ["09", "11"]) {
      const result = FacturaElectronicaSchema.safeParse({
        ...validFactura,
        condicionVenta,
      });
      expect(result.success).toBe(false);
    }
  });
});

describe("ResumenFacturaSchema", () => {
  it("should accept a valid summary", () => {
    const result = ResumenFacturaSchema.safeParse(validResumen);
    expect(result.success).toBe(true);
  });

  it("should accept a minimal summary (only required totals)", () => {
    const result = ResumenFacturaSchema.safeParse({
      totalVenta: 100000,
      totalVentaNeta: 100000,
      totalComprobante: 113000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept the new v4.4 totals", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      totalServNoSujeto: 1000,
      totalMercNoSujeta: 2000,
      totalNoSujeto: 3000,
      totalImpAsumEmisorFabrica: 0,
      totalDesgloseImpuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          totalMontoImpuesto: 13000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a summary with foreign currency", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      codigoTipoMoneda: {
        codigoMoneda: "USD",
        tipoCambio: 530.5,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept any ISO currency code from the official catalog", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      codigoTipoMoneda: {
        codigoMoneda: "JPY",
        tipoCambio: 3.6,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject a currency code outside the official catalog", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      codigoTipoMoneda: {
        codigoMoneda: "ZZZ",
        tipoCambio: 1,
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing totalVenta", () => {
    const { totalVenta: _, ...withoutTotalVenta } = validResumen;
    const result = ResumenFacturaSchema.safeParse(withoutTotalVenta);
    expect(result.success).toBe(false);
  });

  it("should reject missing totalVentaNeta", () => {
    const { totalVentaNeta: _, ...withoutVentaNeta } = validResumen;
    const result = ResumenFacturaSchema.safeParse(withoutVentaNeta);
    expect(result.success).toBe(false);
  });

  it("should reject negative totalComprobante", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      totalComprobante: -100,
    });
    expect(result.success).toBe(false);
  });

  it("should accept summary with exonerated totals", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      totalServExonerado: 5000,
      totalMercExonerada: 3000,
      totalExonerado: 8000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept up to 4 payment methods", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      medioPago: [
        { tipoMedioPago: "01", totalMedioPago: 50000 },
        { tipoMedioPago: "02", totalMedioPago: 30000 },
        { tipoMedioPago: "06", totalMedioPago: 20000 },
        { tipoMedioPago: "07", totalMedioPago: 13000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a summary without medioPago (optional overall)", () => {
    const { medioPago: _, ...withoutMedioPago } = validResumen;
    const result = ResumenFacturaSchema.safeParse(withoutMedioPago);
    expect(result.success).toBe(true);
  });

  it("should reject an empty medioPago array", () => {
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      medioPago: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 4 payment methods", () => {
    const entry = { tipoMedioPago: "01" as const, totalMedioPago: 100 };
    const result = ResumenFacturaSchema.safeParse({
      ...validResumen,
      medioPago: Array.from({ length: 5 }, () => entry),
    });
    expect(result.success).toBe(false);
  });
});

describe("MedioPagoSchema", () => {
  it("should accept the new v4.4 payment method codes (06, 07)", () => {
    for (const tipoMedioPago of ["06", "07"]) {
      const result = MedioPagoSchema.safeParse({
        tipoMedioPago,
        totalMedioPago: 1000,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept tipoMedioPago 99 with medioPagoOtros", () => {
    const result = MedioPagoSchema.safeParse({
      tipoMedioPago: "99",
      medioPagoOtros: "Criptomoneda",
      totalMedioPago: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("should reject an unknown payment method code", () => {
    const result = MedioPagoSchema.safeParse({
      tipoMedioPago: "50",
      totalMedioPago: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing totalMedioPago", () => {
    const result = MedioPagoSchema.safeParse({
      tipoMedioPago: "01",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative totalMedioPago", () => {
    const result = MedioPagoSchema.safeParse({
      tipoMedioPago: "01",
      totalMedioPago: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("TotalDesgloseImpuestoSchema", () => {
  it("should accept a valid breakdown entry", () => {
    const result = TotalDesgloseImpuestoSchema.safeParse({
      codigo: "01",
      codigoTarifaIVA: "08",
      totalMontoImpuesto: 13000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept a breakdown entry without codigoTarifaIVA", () => {
    const result = TotalDesgloseImpuestoSchema.safeParse({
      codigo: "02",
      totalMontoImpuesto: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should reject an unknown tax code", () => {
    const result = TotalDesgloseImpuestoSchema.safeParse({
      codigo: "15",
      totalMontoImpuesto: 5000,
    });
    expect(result.success).toBe(false);
  });
});

describe("OtroCargoSchema", () => {
  const validCargo = {
    tipoDocumento: "02",
    detalle: "Timbre de la Cruz Roja",
    montoCargo: 500,
  };

  it("should accept a valid charge", () => {
    const result = OtroCargoSchema.safeParse(validCargo);
    expect(result.success).toBe(true);
  });

  it("should accept a charge with third-party details", () => {
    const result = OtroCargoSchema.safeParse({
      tipoDocumento: "04",
      identificacionTercero: { tipo: "02", numero: "3101234567" },
      nombreTercero: "Tercero S.A.",
      detalle: "Cobro de un tercero",
      porcentaje: 5,
      montoCargo: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should accept tipoDocumento 99 with tipoDocumentoOtros", () => {
    const result = OtroCargoSchema.safeParse({
      ...validCargo,
      tipoDocumento: "99",
      tipoDocumentoOtros: "Cargo especial",
    });
    expect(result.success).toBe(true);
  });

  it("should reject an unknown charge type", () => {
    const result = OtroCargoSchema.safeParse({
      ...validCargo,
      tipoDocumento: "11",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid identificacionTercero", () => {
    const result = OtroCargoSchema.safeParse({
      ...validCargo,
      identificacionTercero: { tipo: "02", numero: "123" },
    });
    expect(result.success).toBe(false);
  });

  it("should reject nombreTercero shorter than 5 chars", () => {
    const result = OtroCargoSchema.safeParse({
      ...validCargo,
      nombreTercero: "ABC",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing montoCargo", () => {
    const { montoCargo: _, ...withoutMonto } = validCargo;
    const result = OtroCargoSchema.safeParse(withoutMonto);
    expect(result.success).toBe(false);
  });

  it("should reject porcentaje above 100", () => {
    const result = OtroCargoSchema.safeParse({
      ...validCargo,
      porcentaje: 101,
    });
    expect(result.success).toBe(false);
  });

  it("should reject detalle exceeding 160 chars", () => {
    const result = OtroCargoSchema.safeParse({
      ...validCargo,
      detalle: "A".repeat(161),
    });
    expect(result.success).toBe(false);
  });
});

describe("InformacionReferenciaSchema", () => {
  const validReferencia = {
    tipoDoc: "01",
    numero: "50601072500012345678900100001010000000001199999998",
    fechaEmision: "2025-07-20T10:30:00-06:00",
    codigo: "01",
    razon: "Anula documento",
  };

  it("should accept a valid reference", () => {
    const result = InformacionReferenciaSchema.safeParse(validReferencia);
    expect(result.success).toBe(true);
  });

  it("should accept a reference with only tipoDoc and fechaEmision", () => {
    const result = InformacionReferenciaSchema.safeParse({
      tipoDoc: "05",
      fechaEmision: "2025-07-20T10:30:00-06:00",
    });
    expect(result.success).toBe(true);
  });

  it("should accept the v4.4 referenced document types (13-18)", () => {
    for (const tipoDoc of ["13", "14", "15", "16", "17", "18"]) {
      const result = InformacionReferenciaSchema.safeParse({
        ...validReferencia,
        tipoDoc,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept tipoDoc 99 with tipoDocOtros", () => {
    const result = InformacionReferenciaSchema.safeParse({
      ...validReferencia,
      tipoDoc: "99",
      tipoDocOtros: "Documento interno",
    });
    expect(result.success).toBe(true);
  });

  it("should accept codigo 99 with codigoOtros", () => {
    const result = InformacionReferenciaSchema.safeParse({
      ...validReferencia,
      codigo: "99",
      codigoOtros: "Razon especial",
    });
    expect(result.success).toBe(true);
  });

  it("should reject an unknown tipoDoc", () => {
    const result = InformacionReferenciaSchema.safeParse({
      ...validReferencia,
      tipoDoc: "19",
    });
    expect(result.success).toBe(false);
  });

  it("should reject reference code 03 (not in the v4.4 catalog)", () => {
    const result = InformacionReferenciaSchema.safeParse({
      ...validReferencia,
      codigo: "03",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing fechaEmision", () => {
    const { fechaEmision: _, ...withoutFecha } = validReferencia;
    const result = InformacionReferenciaSchema.safeParse(withoutFecha);
    expect(result.success).toBe(false);
  });

  it("should reject numero exceeding 50 chars", () => {
    const result = InformacionReferenciaSchema.safeParse({
      ...validReferencia,
      numero: "1".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("should reject razon exceeding 180 chars", () => {
    const result = InformacionReferenciaSchema.safeParse({
      ...validReferencia,
      razon: "A".repeat(181),
    });
    expect(result.success).toBe(false);
  });
});
