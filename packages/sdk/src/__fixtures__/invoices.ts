/**
 * Test fixtures for Factura Electronica.
 *
 * Provides sample invoice data for testing XML generation,
 * tax calculation, and validation.
 *
 * Each fixture includes a descriptive name and a complete
 * FacturaElectronica object ready for XML generation.
 */

import type { FacturaElectronica } from "@dojocoding/hacienda-shared";
import { Money } from "@dojocoding/hacienda-shared";

const m = (value: number): Money => Money.fromNumber(value);

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
    barrio: "Barrio El Carmen",
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
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio de consultoria en TI",
      precioUnitario: m(100000),
      montoTotal: m(100000),
      subTotal: m(100000),
      baseImponible: m(100000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(13000),
        },
      ],
      impuestoNeto: m(13000),
      montoTotalLinea: m(113000),
    },
  ],
  resumenFactura: {
    totalServGravados: m(100000),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(100000),
    totalExento: m(0),
    totalVenta: m(100000),
    totalDescuentos: m(0),
    totalVentaNeta: m(100000),
    totalImpuesto: m(13000),
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: m(113000) }],
    totalComprobante: m(113000),
  },
};

// ---------------------------------------------------------------------------
// Fixture 2: Multi-item invoice — 3 items, mixed tax rates
// ---------------------------------------------------------------------------

export const MULTI_ITEM_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000219999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000002",
  fechaEmision: "2025-07-27T14:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [
    {
      // Service at 13% IVA
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 2,
      unidadMedida: "Sp",
      detalle: "Horas de consultoria",
      precioUnitario: m(50000),
      montoTotal: m(100000),
      subTotal: m(100000),
      baseImponible: m(100000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(13000),
        },
      ],
      impuestoNeto: m(13000),
      montoTotalLinea: m(113000),
    },
    {
      // Merchandise at 4% reduced IVA
      numeroLinea: 2,
      codigoCabys: "1234500000000",
      codigoComercial: [{ tipo: "01", codigo: "PROD-001" }],
      cantidad: 5,
      unidadMedida: "Unid",
      detalle: "Producto canasta basica",
      precioUnitario: m(2000),
      montoTotal: m(10000),
      subTotal: m(10000),
      baseImponible: m(10000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "04",
          tarifa: 4,
          monto: m(400),
        },
      ],
      impuestoNeto: m(400),
      montoTotalLinea: m(10400),
    },
    {
      // Merchandise at 1% reduced IVA
      numeroLinea: 3,
      codigoCabys: "6789000000000",
      cantidad: 1,
      unidadMedida: "Unid",
      detalle: "Medicamento especial",
      precioUnitario: m(15000),
      montoTotal: m(15000),
      subTotal: m(15000),
      baseImponible: m(15000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "02",
          tarifa: 1,
          monto: m(150),
        },
      ],
      impuestoNeto: m(150),
      montoTotalLinea: m(15150),
    },
  ],
  resumenFactura: {
    totalServGravados: m(100000),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(25000),
    totalMercanciasExentas: m(0),
    totalGravado: m(125000),
    totalExento: m(0),
    totalVenta: m(125000),
    totalDescuentos: m(0),
    totalVentaNeta: m(125000),
    totalImpuesto: m(13550),
    medioPago: [{ tipoMedioPago: "02", totalMedioPago: m(138550) }],
    totalComprobante: m(138550),
  },
};

// ---------------------------------------------------------------------------
// Fixture 3: Invoice with discounts
// ---------------------------------------------------------------------------

export const DISCOUNT_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000319999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000003",
  fechaEmision: "2025-07-28T09:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 10,
      unidadMedida: "Unid",
      detalle: "Producto con descuento por volumen",
      precioUnitario: m(5000),
      montoTotal: m(50000),
      descuento: [
        {
          montoDescuento: m(5000),
          codigoDescuento: "01",
          naturalezaDescuento: "Descuento por volumen (10%)",
        },
      ],
      subTotal: m(45000),
      baseImponible: m(45000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(5850),
        },
      ],
      impuestoNeto: m(5850),
      montoTotalLinea: m(50850),
    },
  ],
  resumenFactura: {
    totalServGravados: m(0),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(50000),
    totalMercanciasExentas: m(0),
    totalGravado: m(50000),
    totalExento: m(0),
    totalVenta: m(50000),
    totalDescuentos: m(5000),
    totalVentaNeta: m(45000),
    totalImpuesto: m(5850),
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: m(50850) }],
    totalComprobante: m(50850),
  },
};

// ---------------------------------------------------------------------------
// Fixture 4: Invoice with exonerations
// ---------------------------------------------------------------------------

export const EXONERATED_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000419999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
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
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio educativo exonerado",
      precioUnitario: m(200000),
      montoTotal: m(200000),
      subTotal: m(200000),
      baseImponible: m(200000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(26000),
          exoneracion: {
            tipoDocumento: "03",
            numeroDocumento: "AL-001-2025",
            nombreInstitucion: "99",
            nombreInstitucionOtros: "Ministerio de Educacion Publica",
            fechaEmision: "2025-01-15T00:00:00-06:00",
            tarifaExonerada: 13,
            montoExoneracion: m(26000),
          },
        },
      ],
      impuestoNeto: m(0),
      montoTotalLinea: m(200000),
    },
  ],
  resumenFactura: {
    totalServGravados: m(0),
    totalServExentos: m(0),
    totalServExonerado: m(200000),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(0),
    totalExento: m(0),
    totalExonerado: m(200000),
    totalVenta: m(200000),
    totalDescuentos: m(0),
    totalVentaNeta: m(200000),
    totalImpuesto: m(0),
    medioPago: [{ tipoMedioPago: "04", totalMedioPago: m(200000) }],
    totalComprobante: m(200000),
  },
};

// ---------------------------------------------------------------------------
// Fixture 5: Export invoice (0% IVA, foreign receptor)
// ---------------------------------------------------------------------------

export const EXPORT_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000519999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000005",
  fechaEmision: "2025-07-29T08:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: {
    nombre: "Acme Corp USA",
    identificacion: {
      tipo: "05" as const,
      numero: "US-EIN-12-3456789",
    },
    correoElectronico: "ap@acmecorp.com",
  },
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 40,
      unidadMedida: "h",
      detalle: "Software development services",
      precioUnitario: m(75),
      montoTotal: m(3000),
      subTotal: m(3000),
      baseImponible: m(3000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "01",
          tarifa: 0,
          monto: m(0),
        },
      ],
      impuestoNeto: m(0),
      montoTotalLinea: m(3000),
    },
  ],
  resumenFactura: {
    codigoTipoMoneda: {
      codigoMoneda: "USD",
      tipoCambio: 530.5,
    },
    totalServGravados: m(0),
    totalServExentos: m(3000),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(0),
    totalExento: m(3000),
    totalVenta: m(3000),
    totalDescuentos: m(0),
    totalVentaNeta: m(3000),
    totalImpuesto: m(0),
    medioPago: [{ tipoMedioPago: "04", totalMedioPago: m(3000) }],
    totalComprobante: m(3000),
  },
};

// ---------------------------------------------------------------------------
// Fixture 6: Credit sale invoice (condicionVenta = 02)
// ---------------------------------------------------------------------------

export const CREDIT_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000619999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000006",
  fechaEmision: "2025-07-30T16:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "02",
  plazoCredito: "30",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Proyecto desarrollo web - fase 1",
      precioUnitario: m(500000),
      montoTotal: m(500000),
      subTotal: m(500000),
      baseImponible: m(500000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(65000),
        },
      ],
      impuestoNeto: m(65000),
      montoTotalLinea: m(565000),
    },
  ],
  resumenFactura: {
    totalServGravados: m(500000),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(500000),
    totalExento: m(0),
    totalVenta: m(500000),
    totalDescuentos: m(0),
    totalVentaNeta: m(500000),
    totalImpuesto: m(65000),
    medioPago: [{ tipoMedioPago: "04", totalMedioPago: m(565000) }],
    totalComprobante: m(565000),
  },
};

// ---------------------------------------------------------------------------
// Fixture 7: Invoice with reference information
// ---------------------------------------------------------------------------

export const REFERENCE_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000719999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000007",
  fechaEmision: "2025-08-01T10:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio corregido",
      precioUnitario: m(120000),
      montoTotal: m(120000),
      subTotal: m(120000),
      baseImponible: m(120000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(15600),
        },
      ],
      impuestoNeto: m(15600),
      montoTotalLinea: m(135600),
    },
  ],
  resumenFactura: {
    totalServGravados: m(120000),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(120000),
    totalExento: m(0),
    totalVenta: m(120000),
    totalDescuentos: m(0),
    totalVentaNeta: m(120000),
    totalImpuesto: m(15600),
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: m(135600) }],
    totalComprobante: m(135600),
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
