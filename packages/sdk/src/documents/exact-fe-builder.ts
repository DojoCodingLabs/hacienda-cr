import {
  ExactFeInputSchema,
  type ExactFeInput,
  type ExactFeCalculated,
} from "@dojocoding/hacienda-shared";
import { calculateExactFe } from "../tax/exact-fe.js";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { buildXml } from "../xml/builder.js";
import { buildEmisorXml, buildReceptorXml } from "./shared-xml-helpers.js";

/** Canonical decimal strings are passed directly to the escaping XML builder.
 * Source-only API recalculates all derived fields, never trusting supplied totals.
 * Canonical here means stable SDK field/decimal serialization, not XMLDSig C14N. */
export function buildExactFacturaXml(source: ExactFeInput): string {
  const input = ExactFeInputSchema.parse(source);
  assertDocumentIdentity(input, "01");
  return buildXml("FacturaElectronica", buildExactOrdinaryFields(input, calculateExactFe(input)));
}

/** Internal exact projection shared with full NC; not a public calculated-input API. */
export function buildExactOrdinaryFields(input: ExactFeInput, calculated: ExactFeCalculated) {
  const summary = calculated.resumenFactura;
  return {
    Clave: input.clave,
    ProveedorSistemas: input.proveedorSistemas,
    CodigoActividadEmisor: input.codigoActividadEmisor,
    ...(input.codigoActividadReceptor
      ? { CodigoActividadReceptor: input.codigoActividadReceptor }
      : {}),
    NumeroConsecutivo: input.numeroConsecutivo,
    FechaEmision: input.fechaEmision,
    Emisor: buildEmisorXml(input.emisor),
    Receptor: buildReceptorXml(input.receptor),
    CondicionVenta: input.condicionVenta,
    ...(input.condicionVentaOtros ? { CondicionVentaOtros: input.condicionVentaOtros } : {}),
    ...(input.plazoCredito ? { PlazoCredito: input.plazoCredito } : {}),
    DetalleServicio: {
      LineaDetalle: calculated.detalleServicio.map((line) => ({
        NumeroLinea: line.numeroLinea,
        CodigoCABYS: line.codigoCabys,
        ...(line.codigoComercial
          ? {
              CodigoComercial: line.codigoComercial.map((c) => ({
                Tipo: c.tipo,
                Codigo: c.codigo,
              })),
            }
          : {}),
        Cantidad: line.cantidad,
        UnidadMedida: line.unidadMedida,
        ...(line.tipoTransaccion ? { TipoTransaccion: line.tipoTransaccion } : {}),
        ...(line.unidadMedidaComercial
          ? { UnidadMedidaComercial: line.unidadMedidaComercial }
          : {}),
        Detalle: line.detalle,
        PrecioUnitario: line.precioUnitario,
        MontoTotal: line.montoTotal,
        ...(line.descuento
          ? {
              Descuento: line.descuento.map((d) => ({
                MontoDescuento: d.montoDescuento,
                CodigoDescuento: d.codigoDescuento,
                ...(d.codigoDescuentoOtros ? { CodigoDescuentoOTRO: d.codigoDescuentoOtros } : {}),
                ...(d.naturalezaDescuento ? { NaturalezaDescuento: d.naturalezaDescuento } : {}),
              })),
            }
          : {}),
        SubTotal: line.subTotal,
        BaseImponible: line.baseImponible,
        Impuesto: line.impuesto.map((t) => ({
          Codigo: t.codigo,
          CodigoTarifaIVA: t.codigoTarifaIVA,
          Tarifa: t.tarifa,
          Monto: t.monto,
        })),
        ImpuestoAsumidoEmisorFabrica: "0.00000",
        ImpuestoNeto: line.impuestoNeto,
        MontoTotalLinea: line.montoTotalLinea,
      })),
    },
    ResumenFactura: {
      CodigoTipoMoneda: {
        CodigoMoneda: summary.codigoTipoMoneda.codigoMoneda,
        TipoCambio: summary.codigoTipoMoneda.tipoCambio,
      },
      TotalServGravados: summary.totalServGravados,
      TotalMercanciasGravadas: summary.totalMercanciasGravadas,
      TotalGravado: summary.totalGravado,
      TotalVenta: summary.totalVenta,
      TotalDescuentos: summary.totalDescuentos,
      TotalVentaNeta: summary.totalVentaNeta,
      TotalDesgloseImpuesto: summary.totalDesgloseImpuesto.map((t) => ({
        Codigo: t.codigo,
        CodigoTarifaIVA: t.codigoTarifaIVA,
        TotalMontoImpuesto: t.totalMontoImpuesto,
      })),
      TotalImpuesto: summary.totalImpuesto,
      MedioPago: summary.medioPago.map((p) => ({
        TipoMedioPago: p.tipoMedioPago,
        ...(p.medioPagoOtros ? { MedioPagoOtros: p.medioPagoOtros } : {}),
        TotalMedioPago: p.totalMedioPago,
      })),
      TotalComprobante: summary.totalComprobante,
    },
  };
}
