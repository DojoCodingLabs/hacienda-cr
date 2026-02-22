/**
 * Factura Electronica XML builder.
 *
 * Transforms a typed FacturaElectronica input into a Hacienda v4.4
 * compliant XML string using the XML builder core.
 */

import type {
  FacturaElectronica,
  Emisor,
  Receptor,
  LineaDetalle,
  Impuesto,
  Descuento,
  OtroCargo,
  InformacionReferencia,
  OtroContenido,
  CodigoComercial,
} from "@hacienda-cr/shared";
import { buildXml } from "../xml/builder.js";

// ---------------------------------------------------------------------------
// Internal mapping helpers — transform typed input objects into
// the XML element structure expected by Hacienda v4.4.
// ---------------------------------------------------------------------------

/**
 * Build the Emisor XML structure.
 */
function buildEmisorXml(emisor: Emisor): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Nombre: emisor.nombre,
    Identificacion: {
      Tipo: emisor.identificacion.tipo,
      Numero: emisor.identificacion.numero,
    },
  };

  if (emisor.nombreComercial) {
    result.NombreComercial = emisor.nombreComercial;
  }

  if (emisor.ubicacion) {
    result.Ubicacion = {
      Provincia: emisor.ubicacion.provincia,
      Canton: emisor.ubicacion.canton,
      Distrito: emisor.ubicacion.distrito,
      ...(emisor.ubicacion.barrio ? { Barrio: emisor.ubicacion.barrio } : {}),
      ...(emisor.ubicacion.otrasSenas ? { OtrasSenas: emisor.ubicacion.otrasSenas } : {}),
    };
  }

  if (emisor.telefono) {
    result.Telefono = {
      CodigoPais: emisor.telefono.codigoPais,
      NumTelefono: emisor.telefono.numTelefono,
    };
  }

  if (emisor.fax) {
    result.Fax = {
      CodigoPais: emisor.fax.codigoPais,
      NumTelefono: emisor.fax.numTelefono,
    };
  }

  result.CorreoElectronico = emisor.correoElectronico;

  return result;
}

/**
 * Build the Receptor XML structure.
 */
function buildReceptorXml(receptor: Receptor): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Nombre: receptor.nombre,
  };

  if (receptor.identificacion) {
    result.Identificacion = {
      Tipo: receptor.identificacion.tipo,
      Numero: receptor.identificacion.numero,
    };
  }

  if (receptor.identificacionExtranjero) {
    result.IdentificacionExtranjero = receptor.identificacionExtranjero;
  }

  if (receptor.nombreComercial) {
    result.NombreComercial = receptor.nombreComercial;
  }

  if (receptor.ubicacion) {
    result.Ubicacion = {
      Provincia: receptor.ubicacion.provincia,
      Canton: receptor.ubicacion.canton,
      Distrito: receptor.ubicacion.distrito,
      ...(receptor.ubicacion.barrio ? { Barrio: receptor.ubicacion.barrio } : {}),
      ...(receptor.ubicacion.otrasSenas ? { OtrasSenas: receptor.ubicacion.otrasSenas } : {}),
    };
  }

  if (receptor.telefono) {
    result.Telefono = {
      CodigoPais: receptor.telefono.codigoPais,
      NumTelefono: receptor.telefono.numTelefono,
    };
  }

  if (receptor.fax) {
    result.Fax = {
      CodigoPais: receptor.fax.codigoPais,
      NumTelefono: receptor.fax.numTelefono,
    };
  }

  if (receptor.correoElectronico) {
    result.CorreoElectronico = receptor.correoElectronico;
  }

  return result;
}

/**
 * Build the Impuesto (tax) XML structure for a line item.
 */
function buildImpuestoXml(impuesto: Impuesto): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Codigo: impuesto.codigo,
  };

  if (impuesto.codigoTarifa) {
    result.CodigoTarifa = impuesto.codigoTarifa;
  }

  result.Tarifa = impuesto.tarifa;
  result.Monto = impuesto.monto;

  if (impuesto.exoneracion) {
    result.Exoneracion = {
      TipoDocumento: impuesto.exoneracion.tipoDocumento,
      NumeroDocumento: impuesto.exoneracion.numeroDocumento,
      NombreInstitucion: impuesto.exoneracion.nombreInstitucion,
      FechaEmision: impuesto.exoneracion.fechaEmision,
      PorcentajeExoneracion: impuesto.exoneracion.porcentajeExoneracion,
      MontoExoneracion: impuesto.exoneracion.montoExoneracion,
    };
  }

  return result;
}

/**
 * Build the Descuento (discount) XML structure.
 */
function buildDescuentoXml(descuento: Descuento): Record<string, unknown> {
  return {
    MontoDescuento: descuento.montoDescuento,
    NaturalezaDescuento: descuento.naturalezaDescuento,
  };
}

/**
 * Build a single LineaDetalle XML structure.
 */
function buildLineaDetalleXml(linea: LineaDetalle): Record<string, unknown> {
  const result: Record<string, unknown> = {
    NumeroLinea: linea.numeroLinea,
    Codigo: linea.codigoCabys,
  };

  if (linea.codigoComercial && linea.codigoComercial.length > 0) {
    result.CodigoComercial = linea.codigoComercial.map((c: CodigoComercial) => ({
      Tipo: c.tipo,
      Codigo: c.codigo,
    }));
  }

  result.Cantidad = linea.cantidad;
  result.UnidadMedida = linea.unidadMedida;
  result.Detalle = linea.detalle;
  result.PrecioUnitario = linea.precioUnitario;
  result.MontoTotal = linea.montoTotal;

  if (linea.descuento && linea.descuento.length > 0) {
    result.Descuento = linea.descuento.map((d: Descuento) => buildDescuentoXml(d));
  }

  result.SubTotal = linea.subTotal;

  if (linea.baseImponible !== undefined) {
    result.BaseImponible = linea.baseImponible;
  }

  if (linea.impuesto && linea.impuesto.length > 0) {
    result.Impuesto = linea.impuesto.map((t: Impuesto) => buildImpuestoXml(t));
  }

  if (linea.impuestoNeto !== undefined) {
    result.ImpuestoNeto = linea.impuestoNeto;
  }

  result.MontoTotalLinea = linea.montoTotalLinea;

  return result;
}

/**
 * Build the ResumenFactura XML structure.
 */
function buildResumenFacturaXml(input: FacturaElectronica): Record<string, unknown> {
  const r = input.resumenFactura;
  const result: Record<string, unknown> = {};

  if (r.codigoTipoMoneda) {
    result.CodigoTipoMoneda = {
      CodigoMoneda: r.codigoTipoMoneda.codigoMoneda,
      TipoCambio: r.codigoTipoMoneda.tipoCambio,
    };
  }

  result.TotalServGravados = r.totalServGravados;
  result.TotalServExentos = r.totalServExentos;

  if (r.totalServExonerado !== undefined && r.totalServExonerado > 0) {
    result.TotalServExonerado = r.totalServExonerado;
  }

  result.TotalMercanciasGravadas = r.totalMercanciasGravadas;
  result.TotalMercanciasExentas = r.totalMercanciasExentas;

  if (r.totalMercExonerada !== undefined && r.totalMercExonerada > 0) {
    result.TotalMercExonerada = r.totalMercExonerada;
  }

  result.TotalGravado = r.totalGravado;
  result.TotalExento = r.totalExento;

  if (r.totalExonerado !== undefined && r.totalExonerado > 0) {
    result.TotalExonerado = r.totalExonerado;
  }

  result.TotalVenta = r.totalVenta;
  result.TotalDescuentos = r.totalDescuentos;
  result.TotalVentaNeta = r.totalVentaNeta;
  result.TotalImpuesto = r.totalImpuesto;

  if (r.totalIVADevuelto !== undefined && r.totalIVADevuelto > 0) {
    result.TotalIVADevuelto = r.totalIVADevuelto;
  }

  if (r.totalOtrosCargos !== undefined && r.totalOtrosCargos > 0) {
    result.TotalOtrosCargos = r.totalOtrosCargos;
  }

  result.TotalComprobante = r.totalComprobante;

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Factura Electronica XML string from a typed input object.
 *
 * The input must already have all computed fields (totals, taxes).
 * Use `calculateLineItemTotals` and `calculateInvoiceSummary` from
 * the tax module to compute those values before calling this function.
 *
 * @param input - A fully populated FacturaElectronica object.
 * @returns A well-formed XML string conforming to Hacienda v4.4.
 *
 * @example
 * ```ts
 * import { buildFacturaXml } from "@hacienda-cr/sdk";
 *
 * const xml = buildFacturaXml({
 *   clave: "506...",
 *   codigoActividad: "620100",
 *   // ... all required fields
 * });
 * ```
 */
export function buildFacturaXml(input: FacturaElectronica): string {
  const data: Record<string, unknown> = {
    Clave: input.clave,
    CodigoActividad: input.codigoActividad,
    NumeroConsecutivo: input.numeroConsecutivo,
    FechaEmision: input.fechaEmision,
    Emisor: buildEmisorXml(input.emisor),
    Receptor: buildReceptorXml(input.receptor),
    CondicionVenta: input.condicionVenta,
  };

  if (input.plazoCredito) {
    data.PlazoCredito = input.plazoCredito;
  }

  data.MedioPago = input.medioPago;

  data.DetalleServicio = {
    LineaDetalle: input.detalleServicio.map((line: LineaDetalle) => buildLineaDetalleXml(line)),
  };

  if (input.otrosCargos && input.otrosCargos.length > 0) {
    data.OtrosCargos = {
      OtroCargo: input.otrosCargos.map((c: OtroCargo) => ({
        TipoDocumento: c.tipoDocumento,
        ...(c.numeroIdentidadTercero ? { NumeroIdentidadTercero: c.numeroIdentidadTercero } : {}),
        ...(c.nombreTercero ? { NombreTercero: c.nombreTercero } : {}),
        Detalle: c.detalle,
        ...(c.porcentaje !== undefined ? { Porcentaje: c.porcentaje } : {}),
        MontoOtroCargo: c.montoOtroCargo,
      })),
    };
  }

  data.ResumenFactura = buildResumenFacturaXml(input);

  if (input.informacionReferencia && input.informacionReferencia.length > 0) {
    data.InformacionReferencia = input.informacionReferencia.map((ref: InformacionReferencia) => ({
      TipoDoc: ref.tipoDoc,
      Numero: ref.numero,
      FechaEmision: ref.fechaEmision,
      Codigo: ref.codigo,
      Razon: ref.razon,
    }));
  }

  if (input.otros && input.otros.length > 0) {
    data.Otros = {
      OtroContenido: input.otros.map((o: OtroContenido) => ({
        "#text": o.contenido,
      })),
    };
  }

  return buildXml("FacturaElectronica", data);
}
