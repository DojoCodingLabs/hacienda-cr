import {
  ExactFecInputSchema,
  type ExactFecInput,
  type ExactFecCalculated,
} from "@dojocoding/hacienda-shared";
import { calculateExactFec } from "../tax/exact-fec.js";
import { buildXml } from "../xml/builder.js";
import { buildEmisorXml, buildReceptorXml } from "./shared-xml-helpers.js";
/** Genuine FEC projection: actual supplier/buyer, no FE-only assumed-tax line field. */
export function buildExactFacturaCompraXml(source: ExactFecInput): string {
  const input = ExactFecInputSchema.parse(source);
  return buildXml("FacturaElectronicaCompra", fields(input, calculateExactFec(input)));
}
function fields(input: ExactFecInput, calculated: ExactFecCalculated) {
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
    ...(input.receptor ? { Receptor: buildReceptorXml(input.receptor) } : {}),
    CondicionVenta: input.condicionVenta,
    ...(input.plazoCredito ? { PlazoCredito: input.plazoCredito } : {}),
    ...buildExactFecMonetaryFields(calculated),
    InformacionReferencia: input.informacionReferencia.map((r) => ({
      TipoDocIR: r.tipoDoc,
      ...(r.tipoDocOtros ? { TipoDocRefOTRO: r.tipoDocOtros } : {}),
      Numero: r.numero,
      FechaEmisionIR: r.fechaEmision,
      Codigo: r.codigo,
      Razon: r.razon,
    })),
  };
}

/** Internal unchanged FEC monetary XML projection shared by explicit source cases. */
export function buildExactFecMonetaryFields(calculated: ExactFecCalculated) {
  const summary = calculated.resumenFactura;
  return {
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
