import {
  ExactFecUsedPersonalGoodsNonSubjectInputSchema,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
} from "@dojocoding/hacienda-shared";
import { calculateExactFecUsedPersonalGoodsNonSubject } from "../tax/exact-fec-used-personal.js";
import { buildXml } from "../xml/builder.js";
import { buildReceptorXml } from "./shared-xml-helpers.js";
import { buildExactFecLineFields } from "./exact-fec-builder.js";
/** Actual supplier06 remains Emisor; buyer owns08. No fabricated local facts. */
export function buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml(
  source: ExactFecUsedPersonalGoodsNonSubjectInput,
): string {
  const input = ExactFecUsedPersonalGoodsNonSubjectInputSchema.parse(source),
    supplier = input.emisor,
    calculated = calculateExactFecUsedPersonalGoodsNonSubject(input),
    summary = calculated.resumenFactura,
    u = supplier.ubicacion;
  return buildXml("FacturaElectronicaCompra", {
    Clave: input.clave,
    ProveedorSistemas: input.proveedorSistemas,
    CodigoActividadReceptor: input.codigoActividadReceptor,
    NumeroConsecutivo: input.numeroConsecutivo,
    FechaEmision: input.fechaEmision,
    Emisor: {
      Nombre: supplier.nombre,
      Identificacion: {
        Tipo: supplier.identificacion.tipo,
        Numero: supplier.identificacion.numero,
      },
      ...(supplier.nombreComercial ? { NombreComercial: supplier.nombreComercial } : {}),
      ...(u
        ? {
            Ubicacion: {
              Provincia: u.provincia,
              Canton: u.canton,
              Distrito: u.distrito,
              ...(u.barrio ? { Barrio: u.barrio } : {}),
              OtrasSenas: u.otrasSenas,
            },
          }
        : {}),
      ...(supplier.telefono
        ? {
            Telefono: {
              CodigoPais: supplier.telefono.codigoPais,
              NumTelefono: supplier.telefono.numTelefono,
            },
          }
        : {}),
      ...(supplier.correoElectronico ? { CorreoElectronico: supplier.correoElectronico } : {}),
    },
    Receptor: buildReceptorXml(input.receptor),
    CondicionVenta: input.condicionVenta,
    DetalleServicio: { LineaDetalle: buildExactFecLineFields(calculated.detalleServicio) },
    ResumenFactura: {
      CodigoTipoMoneda: {
        CodigoMoneda: summary.codigoTipoMoneda.codigoMoneda,
        TipoCambio: summary.codigoTipoMoneda.tipoCambio,
      },
      TotalMercNoSujeta: summary.totalMercNoSujeta,
      TotalNoSujeto: summary.totalNoSujeto,
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
    InformacionReferencia: input.informacionReferencia.map((r) => ({
      TipoDocIR: r.tipoDoc,
      ...(r.tipoDocOtros ? { TipoDocRefOTRO: r.tipoDocOtros } : {}),
      Numero: r.numero,
      FechaEmisionIR: r.fechaEmision,
      Codigo: r.codigo,
      Razon: r.razon,
    })),
  });
}
