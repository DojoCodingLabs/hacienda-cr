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
import type { LineItemInput } from "../tax/calculator.js";
import { fixtureClave } from "./identity.js";
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

/**
 * Derive the identity of a synthetic document. The builders validate the
 * clave against the consecutive, the date and the taxpayer, so the identity
 * is built, never written by hand: a hand-written clave would drift from the
 * official document type codes and fail the identity rules.
 */
function identity(
  fechaEmision: string,
  documentType: string,
  sequence: number,
  owner = EMISOR.identificacion.numero,
): { clave: string; numeroConsecutivo: string } {
  const clave = fixtureClave(fechaEmision, documentType, sequence, owner);
  return { clave, numeroConsecutivo: clave.slice(21, 41) };
}

const FECHA_FACTURA = "2025-07-27T10:30:00-06:00";
const FECHA_NOTA_CREDITO = "2025-08-01T10:00:00-06:00";
const FECHA_NOTA_DEBITO = "2025-08-02T14:00:00-06:00";
const FECHA_COMPRA = "2025-08-03T09:00:00-06:00";
const FECHA_EXPORTACION = "2025-08-04T08:00:00-06:00";
const FECHA_RECIBO = "2025-08-05T11:00:00-06:00";

/** Documento facturado al que apuntan las notas y el recibo. */
const REFERENCIADO = identity(FECHA_FACTURA, "01", 1);

const REF = [
  {
    tipoDoc: "01" as any,
    numero: REFERENCIADO.clave,
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
  discountAmount: number;
  /** Cuántos descuentos aplica la línea (1..3). */
  discountCount: number;
  withExoneracion: boolean;
}

const rawLineArbitrary = fc.record({
  cantidad: fc.integer({ min: 1, max: 4 }),
  precioUnitario: fc.constantFrom(100, 500, 1000, 1234),
  tarifa: fc.constantFrom(0, 4, 13),
  esServicio: fc.boolean(),
  codigoCabys: fc.constantFrom("4321000000000", "1234500000000"),
  withDiscount: fc.boolean(),
  discountAmount: fc.constantFrom(0, 50, 100),
  discountCount: fc.integer({ min: 1, max: 3 }),
  withExoneracion: fc.boolean(),
});

/**
 * La exoneración vive dentro del impuesto sólo en algunas familias: el XSD
 * de la factura, la de exportación y el del recibo no admiten el elemento
 * `Exoneracion` ahí (el de exportación lo lleva en otra sección y el del
 * recibo no lo tiene). El generador respeta esa diferencia en vez de
 * producir documentos que el XSD rechaza.
 */
function buildLines(rawLines: RawLine[], allowExoneracion: boolean) {
  return rawLines.map((r, i) => {
    const pu = r.precioUnitario;
    const total = r.precioUnitario * r.cantidad;
    // Cada descuento se descuenta una vez, del bruto y nunca de lo ya
    // descontado; la suma de todos deja la línea con un neto positivo.
    const discountAmt = r.withDiscount
      ? Math.min(r.discountAmount, Math.floor((total - 1) / r.discountCount))
      : 0;
    const descuentos =
      discountAmt > 0
        ? Array.from({ length: r.discountCount }, (_, d) => ({
            montoDescuento: discountAmt,
            codigoDescuento: ["01", "02", "03"][d % 3] as any,
            naturalezaDescuento: "Descuento por pronto pago",
          }))
        : undefined;

    const impuesto: any[] = [
      {
        codigo: "01" as any,
        codigoTarifaIVA: r.tarifa === 13 ? "08" : r.tarifa === 4 ? "04" : "01" /* 0% exento */,
        tarifa: r.tarifa,
      },
    ];
    // La exoneración sólo tiene sentido sobre una tarifa con impuesto: la
    // exoneración total deja el impuesto en cero y la línea en su neto.
    if (allowExoneracion && r.withExoneracion && r.tarifa > 0) {
      impuesto[0] = {
        ...impuesto[0],
        exoneracion: {
          tipoDocumento: "01" as any,
          numeroDocumento: `EXO-${i + 1}`,
          nombreInstitucion: "01" as any,
          fechaEmision: FECHA_FACTURA,
          tarifaExonerada: r.tarifa === 13 ? 5 : r.tarifa,
        },
      };
    }

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
  // Hasta cuatro medios de pago: el reparto suma exactamente el total (el
  // último absorbe el redondeo), de modo que la asignación es coherente.
  const payments = Math.max(1, Math.min(medios, 4));
  const total = resumen.totalComprobante;
  const chunks: any[] = [];
  let assigned = 0;
  for (let i = 0; i < payments - 1; i++) {
    const share = Math.round((total / payments) * 100) / 100;
    chunks.push({ tipoMedioPago: ["01", "02", "03", "04"][i % 4], totalMedioPago: share });
    assigned += share;
  }
  chunks.push({
    tipoMedioPago: ["01", "02", "03", "04"][(payments - 1) % 4],
    totalMedioPago: Math.round((total - assigned) * 100) / 100,
  });
  resumen.medioPago = chunks as any;
  return resumen;
}

function commonDoc(
  items: any[],
  resumen: ResumenFactura,
  doc: { clave: string; numeroConsecutivo: string },
  fechaEmision: string,
) {
  return {
    clave: doc.clave,
    proveedorSistemas: PROVEEDOR,
    codigoActividadEmisor: "620100",
    numeroConsecutivo: doc.numeroConsecutivo,
    fechaEmision,
    emisor: EMISOR,
    condicionVenta: "01",
    detalleServicio: items as any,
    resumenFactura: resumen,
  };
}

function buildFactura(rawLines: RawLine[], foreign: boolean, medios: number) {
  const items = buildLines(rawLines, false);
  const resumen = makeResumen(items, foreign, medios);
  const doc: any = {
    ...commonDoc(items, resumen, identity(FECHA_FACTURA, "01", 1), FECHA_FACTURA),
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
  const items = buildLines(rawLines, true);
  const resumen = makeResumen(items, false, medios);
  const doc: any = {
    ...commonDoc(items, resumen, identity(FECHA_FACTURA, "04", 1), FECHA_FACTURA),
  };
  if (withReceptor) doc.receptor = RECEPTOR;
  return doc as DocumentoElectronico;
}
function buildNotaCredito(rawLines: RawLine[], foreign: boolean, medios: number) {
  const items = buildLines(rawLines, true);
  const resumen = makeResumen(items, foreign, medios);
  const doc: any = {
    ...commonDoc(items, resumen, identity(FECHA_NOTA_CREDITO, "03", 1), FECHA_NOTA_CREDITO),
    receptor: RECEPTOR,
    informacionReferencia: REF as any,
  };
  return doc as DocumentoElectronico;
}
function buildNotaDebito(rawLines: RawLine[], foreign: boolean, medios: number) {
  const items = buildLines(rawLines, true);
  const resumen = makeResumen(items, foreign, medios);
  const doc: any = {
    ...commonDoc(items, resumen, identity(FECHA_NOTA_DEBITO, "02", 1), FECHA_NOTA_DEBITO),
    receptor: RECEPTOR,
    informacionReferencia: REF as any,
  };
  return doc as DocumentoElectronico;
}
function buildCompra(rawLines: RawLine[], medios: number) {
  const items = buildLines(rawLines, true);
  const resumen = makeResumen(items, false, medios);
  // La factura de compra la emite y firma el comprador: el dueño de la clave
  // es el receptor, no el emisor.
  const doc: any = {
    ...commonDoc(items, resumen, identity(FECHA_COMPRA, "08", 1, "123456789"), FECHA_COMPRA),
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
  const items = buildLines(rawLines, false);
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
    ...commonDoc(items, resumen, identity(FECHA_EXPORTACION, "09", 1), FECHA_EXPORTACION),
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
  const items = buildLines(rawLines, false);
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
    ...commonDoc(items, resumen, identity(FECHA_RECIBO, "10", 1), FECHA_RECIBO),
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
  (lines: RawLine[], medios: number) => buildFactura(lines, false, medios),
  (lines: RawLine[], medios: number) => buildTiquete(lines, false, medios, true),
  (lines: RawLine[], medios: number) => buildNotaCredito(lines, false, medios),
  (lines: RawLine[], medios: number) => buildNotaDebito(lines, false, medios),
  (lines: RawLine[], medios: number) => buildCompra(lines, medios),
  (lines: RawLine[], medios: number) => buildExportacion(lines, medios),
  (lines: RawLine[], medios: number) => buildRecibo(lines, medios),
];

export function arbitraryDocumentWithType(): fc.Arbitrary<GeneratedDocument> {
  return fc
    .record({
      typeIdx: fc.integer({ min: 0, max: 6 }),
      rawLines: fc.array(rawLineArbitrary, { minLength: 1, maxLength: 3 }),
      medios: fc.integer({ min: 1, max: 4 }),
    })
    .map(({ typeIdx, rawLines, medios }) => ({
      typeIdx,
      document: BUILDERS_BY_TYPE[typeIdx]!(rawLines, medios),
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
