/**
 * Test fixtures for Factura Electronica.
 *
 * Provides sample invoice data for testing XML generation,
 * tax calculation, and validation.
 *
 * Each fixture includes a descriptive name and a complete
 * FacturaElectronica object ready for XML generation.
 */

import type { FacturaElectronica } from "@hacienda-cr/shared";

// ---------------------------------------------------------------------------
// Shared emisor / receptor used across fixtures
// ---------------------------------------------------------------------------

const EMISOR_DEFAULT = {
  nombre: "Empresa Test S.A.",
  identificacion: {
    tipo: "02" as const,
    numero: "3101234567",
  },
  nombreComercial: "TestCorp",
  ubicacion: {
    provincia: "1",
    canton: "01",
    distrito: "01",
    barrio: "01",
    otrasSenas: "100m norte del parque central",
  },
  telefono: {
    codigoPais: "506",
    numTelefono: "22223333",
  },
  correoElectronico: "facturacion@testcorp.cr",
};

const RECEPTOR_DEFAULT = {
  nombre: "Cliente Ejemplo S.R.L.",
  identificacion: {
    tipo: "02" as const,
    numero: "3109876543",
  },
  correoElectronico: "compras@clienteejemplo.cr",
};

// ---------------------------------------------------------------------------
// Fixture 1: Simple invoice — 1 item, 13% IVA
// ---------------------------------------------------------------------------

export const SIMPLE_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000119999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["01"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio de consultoria en TI",
      precioUnitario: 100000,
      montoTotal: 100000,
      subTotal: 100000,
      baseImponible: 100000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
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

// ---------------------------------------------------------------------------
// Fixture 2: Multi-item invoice — 3 items, mixed tax rates
// ---------------------------------------------------------------------------

export const MULTI_ITEM_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000219999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000002",
  fechaEmision: "2025-07-27T14:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["02"],
  detalleServicio: [
    {
      // Service at 13% IVA
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 2,
      unidadMedida: "Sp",
      detalle: "Horas de consultoria",
      precioUnitario: 50000,
      montoTotal: 100000,
      subTotal: 100000,
      baseImponible: 100000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 13000,
        },
      ],
      impuestoNeto: 13000,
      montoTotalLinea: 113000,
    },
    {
      // Merchandise at 4% reduced IVA
      numeroLinea: 2,
      codigoCabys: "1234500000000",
      codigoComercial: [{ tipo: "01", codigo: "PROD-001" }],
      cantidad: 5,
      unidadMedida: "Unid",
      detalle: "Producto canasta basica",
      precioUnitario: 2000,
      montoTotal: 10000,
      subTotal: 10000,
      baseImponible: 10000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "04",
          tarifa: 4,
          monto: 400,
        },
      ],
      impuestoNeto: 400,
      montoTotalLinea: 10400,
    },
    {
      // Merchandise at 1% reduced IVA
      numeroLinea: 3,
      codigoCabys: "6789000000000",
      cantidad: 1,
      unidadMedida: "Unid",
      detalle: "Medicamento especial",
      precioUnitario: 15000,
      montoTotal: 15000,
      subTotal: 15000,
      baseImponible: 15000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "02",
          tarifa: 1,
          monto: 150,
        },
      ],
      impuestoNeto: 150,
      montoTotalLinea: 15150,
    },
  ],
  resumenFactura: {
    totalServGravados: 100000,
    totalServExentos: 0,
    totalMercanciasGravadas: 25000,
    totalMercanciasExentas: 0,
    totalGravado: 125000,
    totalExento: 0,
    totalVenta: 125000,
    totalDescuentos: 0,
    totalVentaNeta: 125000,
    totalImpuesto: 13550,
    totalComprobante: 138550,
  },
};

// ---------------------------------------------------------------------------
// Fixture 3: Invoice with discounts
// ---------------------------------------------------------------------------

export const DISCOUNT_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000319999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000003",
  fechaEmision: "2025-07-28T09:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["01"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 10,
      unidadMedida: "Unid",
      detalle: "Producto con descuento por volumen",
      precioUnitario: 5000,
      montoTotal: 50000,
      descuento: [
        {
          montoDescuento: 5000,
          naturalezaDescuento: "Descuento por volumen (10%)",
        },
      ],
      subTotal: 45000,
      baseImponible: 45000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 5850,
        },
      ],
      impuestoNeto: 5850,
      montoTotalLinea: 50850,
    },
  ],
  resumenFactura: {
    totalServGravados: 0,
    totalServExentos: 0,
    totalMercanciasGravadas: 45000,
    totalMercanciasExentas: 0,
    totalGravado: 45000,
    totalExento: 0,
    totalVenta: 45000,
    totalDescuentos: 5000,
    totalVentaNeta: 40000,
    totalImpuesto: 5850,
    totalComprobante: 45850,
  },
};

// ---------------------------------------------------------------------------
// Fixture 4: Invoice with exonerations
// ---------------------------------------------------------------------------

export const EXONERATED_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000419999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000004",
  fechaEmision: "2025-07-28T11:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: {
    nombre: "Fundacion Educativa CR",
    identificacion: {
      tipo: "02" as const,
      numero: "3002123456",
    },
    correoElectronico: "contabilidad@fundacion.cr",
  },
  condicionVenta: "01",
  medioPago: ["04"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio educativo exonerado",
      precioUnitario: 200000,
      montoTotal: 200000,
      subTotal: 200000,
      baseImponible: 200000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 26000,
          exoneracion: {
            tipoDocumento: "03",
            numeroDocumento: "AL-001-2025",
            nombreInstitucion: "Ministerio de Educacion",
            fechaEmision: "2025-01-15T00:00:00-06:00",
            porcentajeExoneracion: 100,
            montoExoneracion: 26000,
          },
        },
      ],
      impuestoNeto: 0,
      montoTotalLinea: 200000,
    },
  ],
  resumenFactura: {
    totalServGravados: 0,
    totalServExentos: 0,
    totalServExonerado: 200000,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 0,
    totalExento: 0,
    totalExonerado: 200000,
    totalVenta: 200000,
    totalDescuentos: 0,
    totalVentaNeta: 200000,
    totalImpuesto: 0,
    totalComprobante: 200000,
  },
};

// ---------------------------------------------------------------------------
// Fixture 5: Export invoice (0% IVA, foreign receptor)
// ---------------------------------------------------------------------------

export const EXPORT_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000519999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000005",
  fechaEmision: "2025-07-29T08:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: {
    nombre: "Acme Corp USA",
    identificacionExtranjero: "US-EIN-12-3456789",
    correoElectronico: "ap@acmecorp.com",
  },
  condicionVenta: "01",
  medioPago: ["04"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 40,
      unidadMedida: "h",
      detalle: "Software development services",
      precioUnitario: 75,
      montoTotal: 3000,
      subTotal: 3000,
      montoTotalLinea: 3000,
    },
  ],
  resumenFactura: {
    codigoTipoMoneda: {
      codigoMoneda: "USD",
      tipoCambio: 530.5,
    },
    totalServGravados: 0,
    totalServExentos: 3000,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 0,
    totalExento: 3000,
    totalVenta: 3000,
    totalDescuentos: 0,
    totalVentaNeta: 3000,
    totalImpuesto: 0,
    totalComprobante: 3000,
  },
};

// ---------------------------------------------------------------------------
// Fixture 6: Credit sale invoice (condicionVenta = 02)
// ---------------------------------------------------------------------------

export const CREDIT_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000619999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000006",
  fechaEmision: "2025-07-30T16:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "02",
  plazoCredito: "30",
  medioPago: ["04"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Proyecto desarrollo web - fase 1",
      precioUnitario: 500000,
      montoTotal: 500000,
      subTotal: 500000,
      baseImponible: 500000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 65000,
        },
      ],
      impuestoNeto: 65000,
      montoTotalLinea: 565000,
    },
  ],
  resumenFactura: {
    totalServGravados: 500000,
    totalServExentos: 0,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 500000,
    totalExento: 0,
    totalVenta: 500000,
    totalDescuentos: 0,
    totalVentaNeta: 500000,
    totalImpuesto: 65000,
    totalComprobante: 565000,
  },
};

// ---------------------------------------------------------------------------
// Fixture 7: Invoice with reference information
// ---------------------------------------------------------------------------

export const REFERENCE_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000719999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001010000000007",
  fechaEmision: "2025-08-01T10:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["01"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio corregido",
      precioUnitario: 120000,
      montoTotal: 120000,
      subTotal: 120000,
      baseImponible: 120000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 15600,
        },
      ],
      impuestoNeto: 15600,
      montoTotalLinea: 135600,
    },
  ],
  resumenFactura: {
    totalServGravados: 120000,
    totalServExentos: 0,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 120000,
    totalExento: 0,
    totalVenta: 120000,
    totalDescuentos: 0,
    totalVentaNeta: 120000,
    totalImpuesto: 15600,
    totalComprobante: 135600,
  },
  informacionReferencia: [
    {
      tipoDoc: "01",
      numero: "50601072500031012345670010000101000000000119999999",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      codigo: "01",
      razon: "Correccion del monto por error de digitacion",
    },
  ],
};

/**
 * All test fixtures as a named collection.
 */
export const ALL_FIXTURES = {
  SIMPLE_INVOICE,
  MULTI_ITEM_INVOICE,
  DISCOUNT_INVOICE,
  EXONERATED_INVOICE,
  EXPORT_INVOICE,
  CREDIT_INVOICE,
  REFERENCE_INVOICE,
} as const;
