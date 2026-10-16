/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
import type { DocumentoElectronico } from "@dojocoding/hacienda-shared";
import { Money } from "@dojocoding/hacienda-shared";
import * as D from "../documents/index.js";

const m = (v: string) => Money.fromString(v);
const EMISOR = {
  nombre: "Empresa Test S.A.",
  identificacion: { tipo: "02" as const, numero: "3101234567" },
  ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "100m norte" },
  correoElectronico: "facturacion@testcorp.cr",
};
const RECEPTOR = {
  nombre: "Cliente Ejemplo S.R.L.",
  identificacion: { tipo: "02" as const, numero: "3109876543" },
  correoElectronico: "compras@clienteejemplo.cr",
};

const line = {
  numeroLinea: 1,
  codigoCabys: "4321000000000",
  cantidad: 1,
  unidadMedida: "Sp" as any,
  detalle: "Servicio de consultoria en TI",
  precioUnitario: m("100000"),
  montoTotal: m("100000"),
  subTotal: m("100000"),
  baseImponible: m("100000"),
  impuesto: [{ codigo: "01" as any, codigoTarifaIVA: "08", tarifa: 13, monto: m("13000") }],
  impuestoNeto: m("13000"),
  montoTotalLinea: m("113000"),
};
const resumen = {
  totalServGravados: m("100000"),
  totalServExentos: m("0"),
  totalMercanciasGravadas: m("0"),
  totalMercanciasExentas: m("0"),
  totalGravado: m("100000"),
  totalExento: m("0"),
  totalVenta: m("100000"),
  totalDescuentos: m("0"),
  totalVentaNeta: m("100000"),
  totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m("13000") }],
  totalImpuesto: m("13000"),
  medioPago: [{ tipoMedioPago: "01" as any, totalMedioPago: m("113000") }],
  totalComprobante: m("113000"),
};

export const GOLDEN_CORPUS = [
  {
    slug: "factura-electronica",
    root: "FacturaElectronica",
    build: D.buildFacturaXml,
    input: {
      clave: "50601072500031012345670010000101000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001010000000001",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "tiquete-electronico",
    root: "TiqueteElectronico",
    build: D.buildTiqueteXml,
    input: {
      clave: "50601072500031012345670010000401000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001040000000001",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      emisor: EMISOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "nota-credito-electronica",
    root: "NotaCreditoElectronica",
    build: D.buildNotaCreditoXml,
    input: {
      clave: "50601072500031012345670010000301000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001030000000001",
      fechaEmision: "2025-08-01T10:00:00-06:00",
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: "50601072500031012345670010000101000000000119999999",
          fechaEmision: "2025-07-27T10:30:00-06:00",
          codigo: "01",
          razon: "Ajuste",
        },
      ],
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "nota-debito-electronica",
    root: "NotaDebitoElectronica",
    build: D.buildNotaDebitoXml,
    input: {
      clave: "50601072500031012345670010000201000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001020000000001",
      fechaEmision: "2025-08-02T14:00:00-06:00",
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: "50601072500031012345670010000101000000000119999999",
          fechaEmision: "2025-07-27T10:30:00-06:00",
          codigo: "01",
          razon: "Ajuste",
        },
      ],
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "factura-electronica-compra",
    root: "FacturaElectronicaCompra",
    build: D.buildFacturaCompraXml,
    input: {
      clave: "50601072500031012345670010000501000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      codigoActividadReceptor: "620100",
      numeroConsecutivo: "00100001050000000001",
      fechaEmision: "2025-08-03T09:00:00-06:00",
      emisor: EMISOR,
      receptor: { nombre: "Proveedor", identificacion: { tipo: "01", numero: "123456789" } },
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
      informacionReferencia: [
        {
          tipoDoc: "99",
          tipoDocOtros: "Comprobante",
          fechaEmision: "2025-08-03T09:00:00-06:00",
          codigo: "04",
          razon: "Respaldo",
        },
      ],
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "factura-electronica-exportacion",
    root: "FacturaElectronicaExportacion",
    build: D.buildFacturaExportacionXml,
    input: {
      clave: "50601072500031012345670010000601000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001060000000001",
      fechaEmision: "2025-08-04T08:00:00-06:00",
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: {
        ...resumen,
        codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: 530.5 },
        totalServGravados: m("0"),
        totalServExentos: m("100000"),
        totalGravado: m("0"),
        totalExento: m("100000"),
      },
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "recibo-electronico-pago",
    root: "ReciboElectronicoPago",
    build: D.buildReciboPagoXml,
    input: {
      clave: "50601072500031012345670010000701000000000119999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001070000000001",
      fechaEmision: "2025-08-05T11:00:00-06:00",
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "11",
      detalleServicio: [line],
      resumenFactura: {
        totalVenta: m("100000"),
        totalVentaNeta: m("100000"),
        totalDesgloseImpuesto: [
          { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m("13000") },
        ],
        totalImpuesto: m("13000"),
        medioPago: [{ tipoMedioPago: "04" as any, totalMedioPago: m("113000") }],
        totalComprobante: m("113000"),
      },
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: "50601072500031012345670010000101000000000119999999",
          fechaEmision: "2025-07-27T10:30:00-06:00",
          codigo: "04",
          razon: "Pago",
        },
      ],
    } as unknown as DocumentoElectronico,
  },
];

export function goldenRoot(entry: { root: string }) {
  return entry.root;
}
