/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-dynamic-delete */
/**
 * fast-check arbitrary for structurally valid v4.4 documents.
 *
 * Generates documents across all seven comprobante types with coherent
 * totals (via the tax calculation layer), suitable for the three A4
 * properties: XSD conformance, build→parse→build fixed point and
 * clave round-trip (caller supplies clave).
 */
import fc from "fast-check";
import type { DocumentoElectronico, ResumenFactura } from "@dojocoding/hacienda-shared";
import { Money } from "@dojocoding/hacienda-shared";
import type { LineItemInput } from "../tax/calculator.js";
import { calculateLineItemTotals, calculateInvoiceSummary } from "../tax/calculator.js";

const EMISOR = {
  nombre: "Empresa Test S.A.",
  identificacion: { tipo: "02" as const, numero: "3101234567" },
  ubicacion: {
    provincia: "1",
    canton: "01",
    distrito: "01",
    otrasSenas: "100m norte del parque central",
  },
  correoElectronico: "facturacion@testcorp.cr",
};

const RECEPTOR = {
  nombre: "Cliente Ejemplo S.R.L.",
  identificacion: { tipo: "02" as const, numero: "3109876543" },
  correoElectronico: "compras@clienteejemplo.cr",
};

const PROVEEDOR = "3101234567";
const CLAVE = "50601072500031012345670010000101000000000119999999";
const NUMERO_CONSECUTIVO = "00100001010000000001";

const REF = [
  {
    tipoDoc: "01" as any,
    numero: CLAVE,
    fechaEmision: "2025-07-27T10:30:00-06:00",
    codigo: "01" as any,
    razon: "Referencia",
  },
];

interface RawLine {
  cantidad: number;
  precioUnitario: number;
  tarifa: number;
  esServicio: boolean;
  codigoCabys: string;
  withDiscount: boolean;
  descuentoAmount: number;
  withExoneracion: boolean;
}

const rawLineArbitrary = fc.record({
  cantidad: fc.integer({ min: 1, max: 4 }),
  precioUnitario: fc.constantFrom(100, 500, 1000, 1234),
  tarifa: fc.constantFrom(0, 4, 13),
  esServicio: fc.boolean(),
  codigoCabys: fc.constantFrom("4321000000000", "1234500000000"),
  withDiscount: fc.boolean(),
  descuentoAmount: fc.constantFrom(0, 50, 100),
  withExoneracion: fc.constant(false),
});

function buildLines(rawLines: RawLine[]) {
  return rawLines.map((r, i) => {
    const pu = Money.fromNumber(r.precioUnitario);
    const total = r.precioUnitario * r.cantidad;
    const discountAmt = r.withDiscount ? Math.min(r.descuentoAmount, total - 1) : 0;
    const descuentos =
      discountAmt > 0
        ? [
            {
              montoDescuento: Money.fromNumber(discountAmt),
              codigoDescuento: "01" as any,
              naturalezaDescuento: "Descuento por pronto pago",
            },
          ]
        : undefined;

    const impuesto = [
      {
        codigo: "01" as any,
        codigoTarifaIVA: r.tarifa === 13 ? "08" : r.tarifa === 4 ? "04" : "01" /* 0% exento */,
        tarifa: r.tarifa,
      },
    ];

    const input: LineItemInput = {
      numeroLinea: i + 1,
      codigoCabys: r.codigoCabys,
      cantidad: r.cantidad,
      unidadMedida: r.esServicio ? "Sp" : "Unid",
      detalle: "Servicio de consultoria en TI",
      precioUnitario: pu,
      esServicio: r.esServicio,
      impuesto,
      ...(descuentos ? { descuento: descuentos } : {}),
    };
    return calculateLineItemTotals(input);
  });
}

function makeResumen(items: any[], foreign: boolean, medios: number) {
  const resumen = calculateInvoiceSummary(items as any, undefined) as unknown as ResumenFactura;
  if (foreign) resumen.codigoTipoMoneda = { codigoMoneda: "USD" as any, tipoCambio: 530.5 };
  const payments = Math.min(medios, 4);
  const chunks: any[] = [];
  const total = resumen.totalComprobante;
  if (payments <= 1) {
    chunks.push({ tipoMedioPago: "01", totalMedioPago: total });
  } else {
    // split naively; totalMedioPago must sum — use full amount in first
    chunks.push({ tipoMedioPago: "01", totalMedioPago: total });
  }
  resumen.medioPago = chunks as any;
  return resumen;
}

function commonDoc(items: any[], resumen: ResumenFactura) {
  return {
    clave: CLAVE,
    proveedorSistemas: PROVEEDOR,
    codigoActividadEmisor: "620100",
    numeroConsecutivo: NUMERO_CONSECUTIVO,
    fechaEmision: "2025-07-27T10:30:00-06:00",
    emisor: EMISOR,
    condicionVenta: "01",
    detalleServicio: items as any,
    resumenFactura: resumen,
  };
}

function buildFactura(rawLines: RawLine[], foreign: boolean, medios: number) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, foreign, medios);
  const doc: any = {
    ...commonDoc(items, resumen),
    receptor: RECEPTOR,
  };
  return doc as DocumentoElectronico;
}
function buildTiquete(
  rawLines: RawLine[],
  foreign: boolean,
  medios: number,
  withReceptor: boolean,
) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, false, medios);
  const doc: any = { ...commonDoc(items, resumen) };
  if (withReceptor) doc.receptor = RECEPTOR;
  return doc as DocumentoElectronico;
}
function buildNotaCredito(rawLines: RawLine[], foreign: boolean, medios: number) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, foreign, medios);
  const doc: any = {
    ...commonDoc(items, resumen),
    receptor: RECEPTOR,
    informacionReferencia: REF as any,
  };
  return doc as DocumentoElectronico;
}
function buildNotaDebito(rawLines: RawLine[], foreign: boolean, medios: number) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, foreign, medios);
  const doc: any = {
    ...commonDoc(items, resumen),
    receptor: RECEPTOR,
    informacionReferencia: REF as any,
  };
  return doc as DocumentoElectronico;
}
function buildCompra(rawLines: RawLine[], medios: number) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, false, medios);
  const doc: any = {
    ...commonDoc(items, resumen),
    codigoActividadReceptor: "620100",
    receptor: {
      ...RECEPTOR,
      nombre: "Proveedor No Registrado",
      identificacion: { tipo: "01" as any, numero: "123456789" },
    },
    informacionReferencia: [
      {
        tipoDoc: "99" as any,
        tipoDocOtros: "Comprobante de proveedor no registrado",
        fechaEmision: "2025-08-03T09:00:00-06:00",
        codigo: "04" as any,
        razon: "Respaldo de compra",
      },
    ],
  };
  return doc as DocumentoElectronico;
}
function buildExportacion(rawLines: RawLine[], medios: number) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, true, medios) as any;
  for (const k of [
    "totalServExonerado",
    "totalServNoSujeto",
    "totalMercExonerada",
    "totalMercNoSujeta",
    "totalExonerado",
    "totalNoSujeto",
    "totalImpAsumEmisorFabrica",
    "totalIVADevuelto",
  ])
    delete resumen[k];
  const doc: any = {
    ...commonDoc(items, resumen),
    receptor: {
      nombre: "Acme Corp USA",
      identificacion: { tipo: "05" as any, numero: "US-EIN-12-3456789" },
      otrasSenasExtranjero: "350 Fifth Avenue, New York",
      correoElectronico: "ap@acmecorp.com",
    },
  };
  return doc as DocumentoElectronico;
}
function buildRecibo(rawLines: RawLine[], medios: number) {
  const items = buildLines(rawLines);
  const resumen = makeResumen(items, false, medios) as any;
  const keep = new Set([
    "totalVenta",
    "totalVentaNeta",
    "totalImpuesto",
    "totalDesgloseImpuesto",
    "totalComprobante",
    "medioPago",
    "codigoTipoMoneda",
  ]);
  for (const k of Object.keys(resumen)) {
    if (!keep.has(k)) delete resumen[k];
  }
  const doc: any = {
    ...commonDoc(items, resumen),
    receptor: RECEPTOR,
    informacionReferencia: REF as any,
  };
  doc.condicionVenta = "11";
  return doc as DocumentoElectronico;
}

export interface GeneratedDocument {
  typeIdx: number;
  document: DocumentoElectronico;
}

const BUILDERS_BY_TYPE = [
  (lines: RawLine[]) => buildFactura(lines, false, 1),
  (lines: RawLine[]) => buildTiquete(lines, false, 1, true),
  (lines: RawLine[]) => buildNotaCredito(lines, false, 1),
  (lines: RawLine[]) => buildNotaDebito(lines, false, 1),
  (lines: RawLine[]) => buildCompra(lines, 1),
  (lines: RawLine[]) => buildExportacion(lines, 1),
  (lines: RawLine[]) => buildRecibo(lines, 1),
];

export function arbitraryDocumentWithType(): fc.Arbitrary<GeneratedDocument> {
  return fc
    .record({
      typeIdx: fc.integer({ min: 0, max: 6 }),
      rawLines: fc.array(rawLineArbitrary, { minLength: 1, maxLength: 3 }),
    })
    .map(({ typeIdx, rawLines }) => ({
      typeIdx,
      document: BUILDERS_BY_TYPE[typeIdx]!(rawLines),
    }));
}

export function arbitraryDocument(): fc.Arbitrary<DocumentoElectronico> {
  return arbitraryDocumentWithType().map((g) => g.document);
}

export const ROOT_NAMES = [
  "FacturaElectronica",
  "TiqueteElectronico",
  "NotaCreditoElectronica",
  "NotaDebitoElectronica",
  "FacturaElectronicaCompra",
  "FacturaElectronicaExportacion",
  "ReciboElectronicoPago",
];

export const ROOT_NAMES_BY_INDEX = ROOT_NAMES;
