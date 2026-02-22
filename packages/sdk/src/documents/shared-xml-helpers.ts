/**
 * Shared XML mapping helpers used by multiple document builders.
 *
 * Extracts common logic for building Emisor, Receptor, Impuesto,
 * Descuento, LineaDetalle, and ResumenFactura XML structures.
 */

import type {
  Emisor,
  Receptor,
  Impuesto,
  Descuento,
  LineaDetalle,
  CodigoComercial,
  ResumenFactura,
  OtroCargo,
  InformacionReferencia,
  OtroContenido,
} from "@hacienda-cr/shared";

/**
 * Build the Emisor XML structure.
 */
export function buildEmisorXml(emisor: Emisor): Record<string, unknown> {
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
export function buildReceptorXml(receptor: Receptor): Record<string, unknown> {
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
export function buildImpuestoXml(impuesto: Impuesto): Record<string, unknown> {
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
export function buildDescuentoXml(descuento: Descuento): Record<string, unknown> {
  return {
    MontoDescuento: descuento.montoDescuento,
    NaturalezaDescuento: descuento.naturalezaDescuento,
  };
}

/**
 * Build a single LineaDetalle XML structure.
 */
export function buildLineaDetalleXml(linea: LineaDetalle): Record<string, unknown> {
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
export function buildResumenFacturaXml(resumen: ResumenFactura): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (resumen.codigoTipoMoneda) {
    result.CodigoTipoMoneda = {
      CodigoMoneda: resumen.codigoTipoMoneda.codigoMoneda,
      TipoCambio: resumen.codigoTipoMoneda.tipoCambio,
    };
  }

  result.TotalServGravados = resumen.totalServGravados;
  result.TotalServExentos = resumen.totalServExentos;

  if (resumen.totalServExonerado !== undefined && resumen.totalServExonerado > 0) {
    result.TotalServExonerado = resumen.totalServExonerado;
  }

  result.TotalMercanciasGravadas = resumen.totalMercanciasGravadas;
  result.TotalMercanciasExentas = resumen.totalMercanciasExentas;

  if (resumen.totalMercExonerada !== undefined && resumen.totalMercExonerada > 0) {
    result.TotalMercExonerada = resumen.totalMercExonerada;
  }

  result.TotalGravado = resumen.totalGravado;
  result.TotalExento = resumen.totalExento;

  if (resumen.totalExonerado !== undefined && resumen.totalExonerado > 0) {
    result.TotalExonerado = resumen.totalExonerado;
  }

  result.TotalVenta = resumen.totalVenta;
  result.TotalDescuentos = resumen.totalDescuentos;
  result.TotalVentaNeta = resumen.totalVentaNeta;
  result.TotalImpuesto = resumen.totalImpuesto;

  if (resumen.totalIVADevuelto !== undefined && resumen.totalIVADevuelto > 0) {
    result.TotalIVADevuelto = resumen.totalIVADevuelto;
  }

  if (resumen.totalOtrosCargos !== undefined && resumen.totalOtrosCargos > 0) {
    result.TotalOtrosCargos = resumen.totalOtrosCargos;
  }

  result.TotalComprobante = resumen.totalComprobante;

  return result;
}

/**
 * Build OtrosCargos XML structure.
 */
export function buildOtrosCargosXml(otrosCargos: OtroCargo[]): Record<string, unknown> {
  return {
    OtroCargo: otrosCargos.map((c: OtroCargo) => ({
      TipoDocumento: c.tipoDocumento,
      ...(c.numeroIdentidadTercero ? { NumeroIdentidadTercero: c.numeroIdentidadTercero } : {}),
      ...(c.nombreTercero ? { NombreTercero: c.nombreTercero } : {}),
      Detalle: c.detalle,
      ...(c.porcentaje !== undefined ? { Porcentaje: c.porcentaje } : {}),
      MontoOtroCargo: c.montoOtroCargo,
    })),
  };
}

/**
 * Build InformacionReferencia XML array.
 */
export function buildInformacionReferenciaXml(
  refs: InformacionReferencia[],
): Record<string, unknown>[] {
  return refs.map((ref: InformacionReferencia) => ({
    TipoDoc: ref.tipoDoc,
    Numero: ref.numero,
    FechaEmision: ref.fechaEmision,
    Codigo: ref.codigo,
    Razon: ref.razon,
  }));
}

/**
 * Build Otros XML structure.
 */
export function buildOtrosXml(otros: OtroContenido[]): Record<string, unknown> {
  return {
    OtroContenido: otros.map((o: OtroContenido) => ({
      "#text": o.contenido,
    })),
  };
}

/**
 * Build the common document body (fields shared by most document types).
 * This builds everything after the header fields and before ResumenFactura.
 */
export interface CommonDocumentFields {
  clave: string;
  codigoActividad: string;
  numeroConsecutivo: string;
  fechaEmision: string;
  emisor: Emisor;
  receptor?: Receptor;
  condicionVenta: string;
  plazoCredito?: string;
  medioPago: string[];
  detalleServicio: LineaDetalle[];
  otrosCargos?: OtroCargo[];
  resumenFactura: ResumenFactura;
  informacionReferencia?: InformacionReferencia[];
  otros?: OtroContenido[];
}

/**
 * Build the standard document body shared by most document types
 * (Factura, Nota Credito, Nota Debito, Compra, Exportacion, Recibo, Tiquete).
 */
export function buildStandardDocumentBody(input: CommonDocumentFields): Record<string, unknown> {
  const data: Record<string, unknown> = {
    Clave: input.clave,
    CodigoActividad: input.codigoActividad,
    NumeroConsecutivo: input.numeroConsecutivo,
    FechaEmision: input.fechaEmision,
    Emisor: buildEmisorXml(input.emisor),
  };

  if (input.receptor) {
    data.Receptor = buildReceptorXml(input.receptor);
  }

  data.CondicionVenta = input.condicionVenta;

  if (input.plazoCredito) {
    data.PlazoCredito = input.plazoCredito;
  }

  data.MedioPago = input.medioPago;

  data.DetalleServicio = {
    LineaDetalle: input.detalleServicio.map((line: LineaDetalle) => buildLineaDetalleXml(line)),
  };

  if (input.otrosCargos && input.otrosCargos.length > 0) {
    data.OtrosCargos = buildOtrosCargosXml(input.otrosCargos);
  }

  data.ResumenFactura = buildResumenFacturaXml(input.resumenFactura);

  if (input.informacionReferencia && input.informacionReferencia.length > 0) {
    data.InformacionReferencia = buildInformacionReferenciaXml(input.informacionReferencia);
  }

  if (input.otros && input.otros.length > 0) {
    data.Otros = buildOtrosXml(input.otros);
  }

  return data;
}
