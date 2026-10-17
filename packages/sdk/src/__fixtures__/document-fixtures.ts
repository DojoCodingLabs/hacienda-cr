/**
 * Test fixtures for all document type builders (v4.4 structure).
 *
 * Provides sample data for each of the 7 document types + Mensaje Receptor
 * to test XML generation. Amounts are internally consistent so fixtures
 * also pass business-rule validation and XSD conformance checks.
 */

import type {
  FacturaElectronica,
  TiqueteElectronico,
  NotaCreditoElectronica,
  NotaDebitoElectronica,
  FacturaElectronicaCompra,
  FacturaElectronicaExportacion,
  ReciboElectronicoPago,
  MensajeReceptor,
  LineaDetalle,
  ResumenFactura,
} from "@dojocoding/hacienda-shared";
import { Money } from "@dojocoding/hacienda-shared";

const m = (value: number): Money => Money.fromNumber(value);

// ---------------------------------------------------------------------------
// Shared emisor / receptor used across fixtures
// ---------------------------------------------------------------------------

const PROVEEDOR_SISTEMAS_DEFAULT = "3101234567";

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

const SIMPLE_LINE_ITEM: LineaDetalle = {
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
};

const SIMPLE_RESUMEN: ResumenFactura = {
  totalServGravados: m(100000),
  totalServExentos: m(0),
  totalMercanciasGravadas: m(0),
  totalMercanciasExentas: m(0),
  totalGravado: m(100000),
  totalExento: m(0),
  totalVenta: m(100000),
  totalDescuentos: m(0),
  totalVentaNeta: m(100000),
  totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m(13000) }],
  totalImpuesto: m(13000),
  medioPago: [{ tipoMedioPago: "01", totalMedioPago: m(113000) }],
  totalComprobante: m(113000),
};

// ---------------------------------------------------------------------------
// Fixture: Factura Electronica (doc type 01)
// ---------------------------------------------------------------------------

/** Full invoice with receiver. */
export const SIMPLE_FACTURA: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [SIMPLE_LINE_ITEM],
  resumenFactura: SIMPLE_RESUMEN,
};

// ---------------------------------------------------------------------------
// Fixture: Tiquete Electronico (doc type 04, simplified receipt)
// ---------------------------------------------------------------------------

/** Tiquete without receiver (most common case). */
export const SIMPLE_TIQUETE: TiqueteElectronico = {
  clave: "50601072500031012345670010000401000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001040000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: EMISOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [SIMPLE_LINE_ITEM],
  resumenFactura: SIMPLE_RESUMEN,
};

/** Tiquete with optional receiver. */
export const TIQUETE_WITH_RECEPTOR: TiqueteElectronico = {
  ...SIMPLE_TIQUETE,
  clave: "50601072500031012345670010000401000000000219999999",
  numeroConsecutivo: "00100001040000000002",
  receptor: {
    nombre: "Juan Perez",
    identificacion: {
      tipo: "01",
      numero: "123456789",
    },
  },
};

// ---------------------------------------------------------------------------
// Fixture: Nota de Credito Electronica (doc type 03, credit note)
// ---------------------------------------------------------------------------

/** Credit note referencing an original invoice. */
export const SIMPLE_NOTA_CREDITO: NotaCreditoElectronica = {
  clave: "50601072500031012345670010000301000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001030000000001",
  fechaEmision: "2025-08-01T10:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [
    {
      ...SIMPLE_LINE_ITEM,
      detalle: "Devolucion parcial servicio consultoria",
      precioUnitario: m(50000),
      montoTotal: m(50000),
      subTotal: m(50000),
      baseImponible: m(50000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(6500),
        },
      ],
      impuestoNeto: m(6500),
      montoTotalLinea: m(56500),
    },
  ],
  resumenFactura: {
    totalServGravados: m(50000),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(50000),
    totalExento: m(0),
    totalVenta: m(50000),
    totalDescuentos: m(0),
    totalVentaNeta: m(50000),
    totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m(6500) }],
    totalImpuesto: m(6500),
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: m(56500) }],
    totalComprobante: m(56500),
  },
  informacionReferencia: [
    {
      tipoDoc: "01",
      numero: "50601072500031012345670010000101000000000119999999",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      codigo: "01",
      razon: "Devolucion parcial por servicio no completado",
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture: Nota de Debito Electronica (doc type 02, debit note)
// ---------------------------------------------------------------------------

/** Debit note referencing an original invoice. */
export const SIMPLE_NOTA_DEBITO: NotaDebitoElectronica = {
  clave: "50601072500031012345670010000201000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001020000000001",
  fechaEmision: "2025-08-02T14:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  detalleServicio: [
    {
      ...SIMPLE_LINE_ITEM,
      detalle: "Ajuste adicional por horas extras",
      precioUnitario: m(25000),
      montoTotal: m(25000),
      subTotal: m(25000),
      baseImponible: m(25000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(3250),
        },
      ],
      impuestoNeto: m(3250),
      montoTotalLinea: m(28250),
    },
  ],
  resumenFactura: {
    totalServGravados: m(25000),
    totalServExentos: m(0),
    totalMercanciasGravadas: m(0),
    totalMercanciasExentas: m(0),
    totalGravado: m(25000),
    totalExento: m(0),
    totalVenta: m(25000),
    totalDescuentos: m(0),
    totalVentaNeta: m(25000),
    totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m(3250) }],
    totalImpuesto: m(3250),
    medioPago: [{ tipoMedioPago: "04", totalMedioPago: m(28250) }],
    totalComprobante: m(28250),
  },
  informacionReferencia: [
    {
      tipoDoc: "01",
      numero: "50601072500031012345670010000101000000000119999999",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      codigo: "01",
      razon: "Ajuste por horas adicionales no contempladas en factura original",
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture: Factura Electronica de Compra (doc type 05, purchase invoice)
// ---------------------------------------------------------------------------

/** Purchase invoice (reverse charge). */
export const SIMPLE_FACTURA_COMPRA: FacturaElectronicaCompra = {
  clave: "50601072500031012345670010000501000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  codigoActividadReceptor: "620100",
  numeroConsecutivo: "00100001050000000001",
  fechaEmision: "2025-08-03T09:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: {
    nombre: "Proveedor No Registrado",
    identificacion: {
      tipo: "01",
      numero: "123456789",
    },
  },
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "1234500000000",
      cantidad: 100,
      unidadMedida: "Unid",
      detalle: "Materia prima agricola",
      precioUnitario: m(500),
      montoTotal: m(50000),
      subTotal: m(50000),
      baseImponible: m(50000),
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          monto: m(6500),
        },
      ],
      impuestoNeto: m(6500),
      montoTotalLinea: m(56500),
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
    totalDescuentos: m(0),
    totalVentaNeta: m(50000),
    totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m(6500) }],
    totalImpuesto: m(6500),
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: m(56500) }],
    totalComprobante: m(56500),
  },
  informacionReferencia: [
    {
      tipoDoc: "99",
      tipoDocOtros: "Comprobante de proveedor no registrado",
      fechaEmision: "2025-08-03T09:00:00-06:00",
      codigo: "04",
      razon: "Respaldo de compra a proveedor no inscrito",
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture: Factura Electronica de Exportacion (doc type 06, export invoice)
// ---------------------------------------------------------------------------

/** Export invoice with foreign buyer. */
export const SIMPLE_FACTURA_EXPORTACION: FacturaElectronicaExportacion = {
  clave: "50601072500031012345670010000601000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001060000000001",
  fechaEmision: "2025-08-04T08:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: {
    nombre: "Acme Corp USA",
    identificacion: {
      tipo: "05",
      numero: "US-EIN-12-3456789",
    },
    otrasSenasExtranjero: "350 Fifth Avenue, New York, NY, USA",
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
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "01",
          tarifa: 0,
          monto: m(0),
        },
      ],
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
// Fixture: Recibo Electronico de Pago (doc type 07, payment receipt)
// ---------------------------------------------------------------------------

/** Payment receipt for a credit invoice. */
export const SIMPLE_RECIBO_PAGO: ReciboElectronicoPago = {
  clave: "50601072500031012345670010000701000000000119999999",
  proveedorSistemas: PROVEEDOR_SISTEMAS_DEFAULT,
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001070000000001",
  fechaEmision: "2025-08-05T11:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "11",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Pago de factura de consultoria",
      precioUnitario: m(100000),
      montoTotal: m(100000),
      subTotal: m(100000),
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
    totalVenta: m(100000),
    totalVentaNeta: m(100000),
    totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m(13000) }],
    totalImpuesto: m(13000),
    medioPago: [{ tipoMedioPago: "04", totalMedioPago: m(113000) }],
    totalComprobante: m(113000),
  },
  informacionReferencia: [
    {
      tipoDoc: "01",
      numero: "50601072500031012345670010000101000000000119999999",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      codigo: "04",
      razon: "Pago de factura emitida a credito",
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture: Mensaje Receptor (receiver acknowledgment)
// ---------------------------------------------------------------------------

/** Full acceptance message. */
export const MENSAJE_ACEPTACION_TOTAL: MensajeReceptor = {
  clave: "50601072500031012345670010000101000000000119999999",
  numeroCedulaEmisor: "3101234567",
  fechaEmisionDoc: "2025-07-27T10:30:00-06:00",
  mensaje: "1",
  detalleMensaje: "Documento aceptado totalmente",
  montoTotalImpuesto: m(13000),
  codigoActividad: "620100",
  condicionImpuesto: "01",
  montoTotalImpuestoAcreditar: m(13000),
  totalFactura: m(113000),
  numeroCedulaReceptor: "3109876543",
  numeroConsecutivoReceptor: "00100001050000000001",
};

/** Partial acceptance message. */
export const MENSAJE_ACEPTACION_PARCIAL: MensajeReceptor = {
  clave: "50601072500031012345670010000101000000000219999999",
  numeroCedulaEmisor: "3101234567",
  fechaEmisionDoc: "2025-07-28T14:00:00-06:00",
  mensaje: "2",
  detalleMensaje: "Aceptado parcialmente — montos difieren",
  montoTotalImpuesto: m(6500),
  totalFactura: m(56500),
  numeroCedulaReceptor: "3109876543",
  numeroConsecutivoReceptor: "00100001060000000001",
};

/** Rejection message. */
export const MENSAJE_RECHAZO: MensajeReceptor = {
  clave: "50601072500031012345670010000101000000000319999999",
  numeroCedulaEmisor: "3101234567",
  fechaEmisionDoc: "2025-07-29T09:00:00-06:00",
  mensaje: "3",
  detalleMensaje: "Documento rechazado — datos incorrectos",
  totalFactura: m(113000),
  numeroCedulaReceptor: "3109876543",
  numeroConsecutivoReceptor: "00100001070000000001",
};

/** Minimal acceptance message (no optional fields). */
export const MENSAJE_MINIMAL: MensajeReceptor = {
  clave: "50601072500031012345670010000101000000000419999999",
  numeroCedulaEmisor: "3101234567",
  fechaEmisionDoc: "2025-08-01T10:00:00-06:00",
  mensaje: "1",
  totalFactura: m(200000),
  numeroCedulaReceptor: "3109876543",
  numeroConsecutivoReceptor: "00100001050000000002",
};
