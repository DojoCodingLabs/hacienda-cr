/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
import type { DocumentoElectronico } from "@dojocoding/hacienda-shared";
import * as D from "../documents/index.js";
import { fixtureClave } from "../__fixtures__/identity.js";

/**
 * Golden corpus: one known-good document and its expected XML per comprobante
 * type. The entries are synthetic — no taxpayer or provider data is real.
 *
 * The identity of each document (clave + consecutive) is **derived**, never
 * written by hand: `fixtureClave` builds a clave that satisfies the layout the
 * builders validate, and the consecutive is the slice of that clave. A
 * hand-written clave would silently drift from the official codes (FEC `08`,
 * FEE `09`, REP `10`) and from the identity rules the builders enforce.
 */

/** Monetary value helper: the corpus documents carry the constructor's type. */
const m = (v: string) => Number(v);

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

/** Proveedor (unregistered supplier) of the purchase invoice. */
const PROVEEDOR = {
  nombre: "Proveedor Ejemplo S.A.",
  identificacion: { tipo: "01" as const, numero: "123456789" },
  correoElectronico: "facturacion@proveedor.cr",
};

/**
 * Derive the identity of a synthetic document: the clave and the consecutive
 * that the builders validate against each other.
 */
function identity(
  fechaEmision: string,
  documentType: string,
  sequence: number,
  taxpayerId = EMISOR.identificacion.numero,
): { clave: string; numeroConsecutivo: string } {
  const clave = fixtureClave(fechaEmision, documentType, sequence, taxpayerId);
  return { clave, numeroConsecutivo: clave.slice(21, 41) };
}

const FECHA_FE = "2025-07-27T10:30:00-06:00";
const FECHA_NC = "2025-08-01T10:00:00-06:00";
const FECHA_ND = "2025-08-02T14:00:00-06:00";
const FECHA_FEC = "2025-08-03T09:00:00-06:00";
const FECHA_FEE = "2025-08-04T08:00:00-06:00";
const FECHA_REP = "2025-08-05T11:00:00-06:00";

const FE = identity(FECHA_FE, "01", 1);
const TE = identity(FECHA_FE, "04", 1);
const NC = identity(FECHA_NC, "03", 1);
const ND = identity(FECHA_ND, "02", 1);
/** The purchase invoice is issued and signed by the buyer: the clave's owner is the receptor. */
const FEC = identity(FECHA_FEC, "08", 1, PROVEEDOR.identificacion.numero);
const FEE = identity(FECHA_FEE, "09", 1);
const REP = identity(FECHA_REP, "10", 1);

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
  totalExonerado: m("0"),
  totalVenta: m("100000"),
  totalDescuentos: m("0"),
  totalVentaNeta: m("100000"),
  totalDesgloseImpuesto: [
    { codigo: "01" as any, codigoTarifaIVA: "08", totalMontoImpuesto: m("13000") },
  ],
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
      clave: FE.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: FE.numeroConsecutivo,
      fechaEmision: FECHA_FE,
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
      clave: TE.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: TE.numeroConsecutivo,
      fechaEmision: FECHA_FE,
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
      clave: NC.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: NC.numeroConsecutivo,
      fechaEmision: FECHA_NC,
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: FE.clave,
          fechaEmision: FECHA_FE,
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
      clave: ND.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: ND.numeroConsecutivo,
      fechaEmision: FECHA_ND,
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: FE.clave,
          fechaEmision: FECHA_FE,
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
      clave: FEC.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      codigoActividadReceptor: "620100",
      numeroConsecutivo: FEC.numeroConsecutivo,
      fechaEmision: FECHA_FEC,
      emisor: EMISOR,
      receptor: PROVEEDOR,
      condicionVenta: "01",
      detalleServicio: [line],
      resumenFactura: resumen,
      informacionReferencia: [
        {
          tipoDoc: "99",
          tipoDocOtros: "Comprobante",
          fechaEmision: FECHA_FEC,
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
      clave: FEE.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: FEE.numeroConsecutivo,
      fechaEmision: FECHA_FEE,
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "01",
      detalleServicio: [line],
      // El XSD de exportación no admite TotalExonerado: el resumen de esta
      // familia se declara aparte, no por omisión.
      resumenFactura: {
        totalServGravados: m("0"),
        totalServExentos: m("100000"),
        totalMercanciasGravadas: m("0"),
        totalMercanciasExentas: m("0"),
        totalGravado: m("0"),
        totalExento: m("100000"),
        totalVenta: m("100000"),
        totalDescuentos: m("0"),
        totalVentaNeta: m("100000"),
        totalDesgloseImpuesto: [
          { codigo: "01" as any, codigoTarifaIVA: "08", totalMontoImpuesto: m("13000") },
        ],
        totalImpuesto: m("13000"),
        medioPago: [{ tipoMedioPago: "01" as any, totalMedioPago: m("113000") }],
        totalComprobante: m("113000"),
        codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: 530.5 },
      },
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: FE.clave,
          fechaEmision: FECHA_FE,
          codigo: "01",
          razon: "Factura de exportación",
        },
      ],
    } as unknown as DocumentoElectronico,
  },
  {
    slug: "recibo-electronico-pago",
    root: "ReciboElectronicoPago",
    build: D.buildReciboPagoXml,
    input: {
      clave: REP.clave,
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: REP.numeroConsecutivo,
      fechaEmision: FECHA_REP,
      emisor: EMISOR,
      receptor: RECEPTOR,
      condicionVenta: "11",
      detalleServicio: [line],
      resumenFactura: {
        totalVenta: m("100000"),
        totalVentaNeta: m("100000"),
        totalDesgloseImpuesto: [
          { codigo: "01" as any, codigoTarifaIVA: "08", totalMontoImpuesto: m("13000") },
        ],
        totalImpuesto: m("13000"),
        medioPago: [{ tipoMedioPago: "04" as any, totalMedioPago: m("113000") }],
        totalComprobante: m("113000"),
      },
      informacionReferencia: [
        {
          tipoDoc: "01",
          numero: FE.clave,
          fechaEmision: FECHA_FE,
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
