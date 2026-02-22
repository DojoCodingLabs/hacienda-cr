/**
 * Test fixtures for all document type builders.
 *
 * Provides sample data for each of the 7 document types + Mensaje Receptor
 * to test XML generation.
 */

import type {
  TiqueteElectronico,
  NotaCreditoElectronica,
  NotaDebitoElectronica,
  FacturaElectronicaCompra,
  FacturaElectronicaExportacion,
  ReciboElectronicoPago,
  MensajeReceptor,
} from "@dojocoding/hacienda-shared";

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

const SIMPLE_LINE_ITEM = {
  numeroLinea: 1,
  codigoCabys: "4321000000000",
  cantidad: 1,
  unidadMedida: "Sp" as const,
  detalle: "Servicio de consultoria en TI",
  precioUnitario: 100000,
  montoTotal: 100000,
  subTotal: 100000,
  baseImponible: 100000,
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
};

const SIMPLE_RESUMEN = {
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
};

// ---------------------------------------------------------------------------
// Fixture: Tiquete Electronico (doc type 04, simplified receipt)
// ---------------------------------------------------------------------------

/** Tiquete without receiver (most common case). */
export const SIMPLE_TIQUETE: TiqueteElectronico = {
  clave: "50601072500031012345670010000401000000000119999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001040000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: EMISOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["01"],
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
  codigoActividad: "620100",
  numeroConsecutivo: "00100001030000000001",
  fechaEmision: "2025-08-01T10:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["01"],
  detalleServicio: [
    {
      ...SIMPLE_LINE_ITEM,
      detalle: "Devolucion parcial servicio consultoria",
      precioUnitario: 50000,
      montoTotal: 50000,
      subTotal: 50000,
      baseImponible: 50000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 6500,
        },
      ],
      impuestoNeto: 6500,
      montoTotalLinea: 56500,
    },
  ],
  resumenFactura: {
    totalServGravados: 50000,
    totalServExentos: 0,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 50000,
    totalExento: 0,
    totalVenta: 50000,
    totalDescuentos: 0,
    totalVentaNeta: 50000,
    totalImpuesto: 6500,
    totalComprobante: 56500,
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
  codigoActividad: "620100",
  numeroConsecutivo: "00100001020000000001",
  fechaEmision: "2025-08-02T14:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["04"],
  detalleServicio: [
    {
      ...SIMPLE_LINE_ITEM,
      detalle: "Ajuste adicional por horas extras",
      precioUnitario: 25000,
      montoTotal: 25000,
      subTotal: 25000,
      baseImponible: 25000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 3250,
        },
      ],
      impuestoNeto: 3250,
      montoTotalLinea: 28250,
    },
  ],
  resumenFactura: {
    totalServGravados: 25000,
    totalServExentos: 0,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 25000,
    totalExento: 0,
    totalVenta: 25000,
    totalDescuentos: 0,
    totalVentaNeta: 25000,
    totalImpuesto: 3250,
    totalComprobante: 28250,
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
  codigoActividad: "620100",
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
  medioPago: ["01"],
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "1234500000000",
      cantidad: 100,
      unidadMedida: "Unid",
      detalle: "Materia prima agricola",
      precioUnitario: 500,
      montoTotal: 50000,
      subTotal: 50000,
      baseImponible: 50000,
      impuesto: [
        {
          codigo: "01",
          codigoTarifa: "08",
          tarifa: 13,
          monto: 6500,
        },
      ],
      impuestoNeto: 6500,
      montoTotalLinea: 56500,
    },
  ],
  resumenFactura: {
    totalServGravados: 0,
    totalServExentos: 0,
    totalMercanciasGravadas: 50000,
    totalMercanciasExentas: 0,
    totalGravado: 50000,
    totalExento: 0,
    totalVenta: 50000,
    totalDescuentos: 0,
    totalVentaNeta: 50000,
    totalImpuesto: 6500,
    totalComprobante: 56500,
  },
};

// ---------------------------------------------------------------------------
// Fixture: Factura Electronica de Exportacion (doc type 06, export invoice)
// ---------------------------------------------------------------------------

/** Export invoice with foreign buyer. */
export const SIMPLE_FACTURA_EXPORTACION: FacturaElectronicaExportacion = {
  clave: "50601072500031012345670010000601000000000119999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001060000000001",
  fechaEmision: "2025-08-04T08:00:00-06:00",
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
// Fixture: Recibo Electronico de Pago (doc type 07, payment receipt)
// ---------------------------------------------------------------------------

/** Payment receipt. */
export const SIMPLE_RECIBO_PAGO: ReciboElectronicoPago = {
  clave: "50601072500031012345670010000701000000000119999999",
  codigoActividad: "620100",
  numeroConsecutivo: "00100001070000000001",
  fechaEmision: "2025-08-05T11:00:00-06:00",
  emisor: EMISOR_DEFAULT,
  receptor: RECEPTOR_DEFAULT,
  condicionVenta: "01",
  medioPago: ["04"],
  detalleServicio: [SIMPLE_LINE_ITEM],
  resumenFactura: SIMPLE_RESUMEN,
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
  montoTotalImpuesto: 13000,
  codigoActividad: "620100",
  condicionImpuesto: "01",
  totalFactura: 113000,
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
  montoTotalImpuesto: 6500,
  totalFactura: 56500,
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
  totalFactura: 113000,
  numeroCedulaReceptor: "3109876543",
  numeroConsecutivoReceptor: "00100001070000000001",
};

/** Minimal acceptance message (no optional fields). */
export const MENSAJE_MINIMAL: MensajeReceptor = {
  clave: "50601072500031012345670010000101000000000419999999",
  numeroCedulaEmisor: "3101234567",
  fechaEmisionDoc: "2025-08-01T10:00:00-06:00",
  mensaje: "1",
  totalFactura: 200000,
  numeroCedulaReceptor: "3109876543",
  numeroConsecutivoReceptor: "00100001050000000002",
};
