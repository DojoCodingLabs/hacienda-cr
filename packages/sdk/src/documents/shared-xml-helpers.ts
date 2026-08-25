/**
 * Shared XML mapping helpers used by multiple document builders.
 *
 * Emits the Hacienda v4.4 document structure (verified against the official
 * XSDs vendored in packages/sdk/schemas/2024/v4.4). Element order follows
 * the schemas exactly; per-document differences are captured by
 * {@link DocumentVariant}.
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
  MedioPago,
  Identificacion,
} from "@dojocoding/hacienda-shared";

// ---------------------------------------------------------------------------
// Per-document structural variants (from the v4.4 XSDs)
// ---------------------------------------------------------------------------

/** Which document family the shared body is being built for. */
export interface DocumentVariant {
  /** Whether CodigoActividadEmisor is emitted ("none" only for REP). */
  codigoActividadEmisor: "required" | "optional" | "none";

  /** Whether CodigoActividadReceptor may be emitted. */
  codigoActividadReceptor: boolean;

  /** Whether lines carry CodigoCABYS (REP lines do not). */
  lineaConCabys: boolean;

  /** Whether lines carry BaseImponible / ImpuestoNeto (FEE and REP differ). */
  lineaConBaseImponible: boolean;
  lineaConImpuestoNeto: boolean;

  /**
   * ImpuestoAsumidoEmisorFabrica on each line: "required" (FE/TE — emitted
   * with a 0 default), "optional" (NC/ND/FEC — emitted when provided), or
   * "none" (FEE/REP — the XSD has no such element).
   */
  lineaConImpuestoAsumido: "required" | "optional" | "none";

  /** Whether lines may carry PartidaArancelaria (NC/ND/FEE). */
  lineaConPartidaArancelaria: boolean;

  /** Whether lines may carry Cantidad/UnidadMedida/PrecioUnitario (not REP). */
  lineaCompleta: boolean;

  /** Whether CondicionVentaOtros / PlazoCredito / OtrosCargos / Otros apply (not REP). */
  cuerpoCompleto: boolean;
}

/** Variant presets, one per document root (derived from the official XSDs). */
export const DOCUMENT_VARIANTS = {
  FacturaElectronica: {
    codigoActividadEmisor: "required",
    codigoActividadReceptor: true,
    lineaConCabys: true,
    lineaConBaseImponible: true,
    lineaConImpuestoNeto: true,
    lineaConImpuestoAsumido: "required",
    lineaConPartidaArancelaria: false,
    lineaCompleta: true,
    cuerpoCompleto: true,
  },
  TiqueteElectronico: {
    codigoActividadEmisor: "required",
    codigoActividadReceptor: false,
    lineaConCabys: true,
    lineaConBaseImponible: true,
    lineaConImpuestoNeto: true,
    lineaConImpuestoAsumido: "required",
    lineaConPartidaArancelaria: false,
    lineaCompleta: true,
    cuerpoCompleto: true,
  },
  NotaCreditoElectronica: {
    codigoActividadEmisor: "optional",
    codigoActividadReceptor: true,
    lineaConCabys: true,
    lineaConBaseImponible: true,
    lineaConImpuestoNeto: true,
    lineaConImpuestoAsumido: "optional",
    lineaConPartidaArancelaria: true,
    lineaCompleta: true,
    cuerpoCompleto: true,
  },
  NotaDebitoElectronica: {
    codigoActividadEmisor: "optional",
    codigoActividadReceptor: true,
    lineaConCabys: true,
    lineaConBaseImponible: true,
    lineaConImpuestoNeto: true,
    lineaConImpuestoAsumido: "optional",
    lineaConPartidaArancelaria: true,
    lineaCompleta: true,
    cuerpoCompleto: true,
  },
  FacturaElectronicaCompra: {
    codigoActividadEmisor: "optional",
    codigoActividadReceptor: true,
    lineaConCabys: true,
    lineaConBaseImponible: true,
    lineaConImpuestoNeto: true,
    lineaConImpuestoAsumido: "optional",
    lineaConPartidaArancelaria: false,
    lineaCompleta: true,
    cuerpoCompleto: true,
  },
  FacturaElectronicaExportacion: {
    codigoActividadEmisor: "required",
    codigoActividadReceptor: false,
    lineaConCabys: true,
    lineaConBaseImponible: false,
    lineaConImpuestoNeto: false,
    lineaConImpuestoAsumido: "none",
    lineaConPartidaArancelaria: true,
    lineaCompleta: true,
    cuerpoCompleto: true,
  },
  ReciboElectronicoPago: {
    codigoActividadEmisor: "none",
    codigoActividadReceptor: false,
    lineaConCabys: false,
    lineaConBaseImponible: false,
    lineaConImpuestoNeto: true,
    lineaConImpuestoAsumido: "none",
    lineaConPartidaArancelaria: false,
    lineaCompleta: false,
    cuerpoCompleto: false,
  },
} as const satisfies Record<string, DocumentVariant>;

// ---------------------------------------------------------------------------
// Sub-structure builders
// ---------------------------------------------------------------------------

function buildIdentificacionXml(identificacion: Identificacion): Record<string, unknown> {
  return {
    Tipo: identificacion.tipo,
    Numero: identificacion.numero,
  };
}

/**
 * Build the Emisor XML structure (v4.4 order:
 * Nombre, Identificacion, Registrofiscal8707?, NombreComercial?,
 * Ubicacion, Telefono?, CorreoElectronico).
 *
 * The REP schema only admits Nombre, Identificacion, CorreoElectronico.
 */
export function buildEmisorXml(emisor: Emisor, minimal = false): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Nombre: emisor.nombre,
    Identificacion: buildIdentificacionXml(emisor.identificacion),
  };

  if (!minimal) {
    if (emisor.registrofiscal8707) {
      result.Registrofiscal8707 = emisor.registrofiscal8707;
    }

    if (emisor.nombreComercial) {
      result.NombreComercial = emisor.nombreComercial;
    }

    if (!emisor.ubicacion) {
      throw new Error(
        "emisor.ubicacion is required by the v4.4 schemas (provincia, canton, distrito, otrasSenas)",
      );
    }

    result.Ubicacion = {
      Provincia: emisor.ubicacion.provincia,
      Canton: emisor.ubicacion.canton,
      Distrito: emisor.ubicacion.distrito,
      ...(emisor.ubicacion.barrio ? { Barrio: emisor.ubicacion.barrio } : {}),
      OtrasSenas: emisor.ubicacion.otrasSenas,
    };

    if (emisor.telefono) {
      result.Telefono = {
        CodigoPais: emisor.telefono.codigoPais,
        NumTelefono: emisor.telefono.numTelefono,
      };
    }
  }

  result.CorreoElectronico = emisor.correoElectronico;

  return result;
}

/**
 * Build the Receptor XML structure (v4.4 order:
 * Nombre, Identificacion?, NombreComercial?, Ubicacion?,
 * OtrasSenasExtranjero?, Telefono?, CorreoElectronico?).
 */
export function buildReceptorXml(receptor: Receptor, minimal = false): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Nombre: receptor.nombre,
  };

  if (receptor.identificacion) {
    result.Identificacion = buildIdentificacionXml(receptor.identificacion);
  }

  if (!minimal) {
    if (receptor.nombreComercial) {
      result.NombreComercial = receptor.nombreComercial;
    }

    if (receptor.ubicacion) {
      result.Ubicacion = {
        Provincia: receptor.ubicacion.provincia,
        Canton: receptor.ubicacion.canton,
        Distrito: receptor.ubicacion.distrito,
        ...(receptor.ubicacion.barrio ? { Barrio: receptor.ubicacion.barrio } : {}),
        OtrasSenas: receptor.ubicacion.otrasSenas,
      };
    }

    if (receptor.otrasSenasExtranjero) {
      result.OtrasSenasExtranjero = receptor.otrasSenasExtranjero;
    }

    if (receptor.telefono) {
      result.Telefono = {
        CodigoPais: receptor.telefono.codigoPais,
        NumTelefono: receptor.telefono.numTelefono,
      };
    }
  }

  if (receptor.correoElectronico) {
    result.CorreoElectronico = receptor.correoElectronico;
  }

  return result;
}

/**
 * Build the Impuesto (tax) XML structure for a line item (v4.4 order:
 * Codigo, CodigoImpuestoOTRO?, CodigoTarifaIVA?, Tarifa?,
 * FactorCalculoIVA?, Monto, Exoneracion?).
 */
export function buildImpuestoXml(impuesto: Impuesto): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Codigo: impuesto.codigo,
  };

  if (impuesto.codigoImpuestoOtros) {
    result.CodigoImpuestoOTRO = impuesto.codigoImpuestoOtros;
  }

  if (impuesto.codigoTarifaIVA) {
    result.CodigoTarifaIVA = impuesto.codigoTarifaIVA;
  }

  if (impuesto.tarifa !== undefined) {
    result.Tarifa = impuesto.tarifa;
  }

  if (impuesto.factorCalculoIVA !== undefined) {
    result.FactorCalculoIVA = impuesto.factorCalculoIVA;
  }

  result.Monto = impuesto.monto;

  if (impuesto.exoneracion) {
    const exo = impuesto.exoneracion;
    result.Exoneracion = {
      TipoDocumentoEX1: exo.tipoDocumento,
      ...(exo.tipoDocumentoOtros ? { TipoDocumentoOTRO: exo.tipoDocumentoOtros } : {}),
      NumeroDocumento: exo.numeroDocumento,
      ...(exo.articulo !== undefined ? { Articulo: exo.articulo } : {}),
      ...(exo.inciso !== undefined ? { Inciso: exo.inciso } : {}),
      NombreInstitucion: exo.nombreInstitucion,
      ...(exo.nombreInstitucionOtros ? { NombreInstitucionOtros: exo.nombreInstitucionOtros } : {}),
      FechaEmisionEX: exo.fechaEmision,
      TarifaExonerada: exo.tarifaExonerada,
      MontoExoneracion: exo.montoExoneracion,
    };
  }

  return result;
}

/**
 * Build the Descuento (discount) XML structure (v4.4 order:
 * MontoDescuento, CodigoDescuento, CodigoDescuentoOTRO?, NaturalezaDescuento?).
 */
export function buildDescuentoXml(descuento: Descuento): Record<string, unknown> {
  return {
    MontoDescuento: descuento.montoDescuento,
    CodigoDescuento: descuento.codigoDescuento,
    ...(descuento.codigoDescuentoOtros
      ? { CodigoDescuentoOTRO: descuento.codigoDescuentoOtros }
      : {}),
    ...(descuento.naturalezaDescuento
      ? { NaturalezaDescuento: descuento.naturalezaDescuento }
      : {}),
  };
}

/**
 * Build a single LineaDetalle XML structure per the v4.4 element order.
 */
export function buildLineaDetalleXml(
  linea: LineaDetalle,
  variant: DocumentVariant = DOCUMENT_VARIANTS.FacturaElectronica,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    NumeroLinea: linea.numeroLinea,
  };

  if (variant.lineaConPartidaArancelaria && linea.partidaArancelaria) {
    result.PartidaArancelaria = linea.partidaArancelaria;
  }

  if (variant.lineaConCabys) {
    result.CodigoCABYS = linea.codigoCabys;
  }

  if (variant.lineaCompleta) {
    if (linea.codigoComercial && linea.codigoComercial.length > 0) {
      result.CodigoComercial = linea.codigoComercial.map((c: CodigoComercial) => ({
        Tipo: c.tipo,
        Codigo: c.codigo,
      }));
    }

    result.Cantidad = linea.cantidad;
    result.UnidadMedida = linea.unidadMedida;

    if (linea.tipoTransaccion) {
      result.TipoTransaccion = linea.tipoTransaccion;
    }

    if (linea.unidadMedidaComercial) {
      result.UnidadMedidaComercial = linea.unidadMedidaComercial;
    }
  }

  result.Detalle = linea.detalle;

  if (variant.lineaCompleta) {
    if (linea.numeroVINoSerie && linea.numeroVINoSerie.length > 0) {
      result.NumeroVINoSerie = linea.numeroVINoSerie;
    }

    result.PrecioUnitario = linea.precioUnitario;
  }

  result.MontoTotal = linea.montoTotal;

  if (variant.lineaCompleta && linea.descuento && linea.descuento.length > 0) {
    result.Descuento = linea.descuento.map((d: Descuento) => buildDescuentoXml(d));
  }

  result.SubTotal = linea.subTotal;

  if (variant.lineaConBaseImponible) {
    result.BaseImponible = linea.baseImponible ?? linea.subTotal;
  }

  if (linea.impuesto && linea.impuesto.length > 0) {
    result.Impuesto = linea.impuesto.map((t: Impuesto) => buildImpuestoXml(t));
  }

  if (variant.lineaConImpuestoAsumido === "required") {
    result.ImpuestoAsumidoEmisorFabrica = linea.impuestoAsumidoEmisorFabrica ?? 0;
  } else if (
    variant.lineaConImpuestoAsumido === "optional" &&
    linea.impuestoAsumidoEmisorFabrica !== undefined
  ) {
    result.ImpuestoAsumidoEmisorFabrica = linea.impuestoAsumidoEmisorFabrica;
  }

  if (variant.lineaConImpuestoNeto) {
    result.ImpuestoNeto = linea.impuestoNeto ?? 0;
  }

  result.MontoTotalLinea = linea.montoTotalLinea;

  return result;
}

/**
 * Build the ResumenFactura XML structure per the v4.4 element order.
 *
 * CodigoTipoMoneda is required by the XSD; defaults to CRC / 1 when the
 * input omits it.
 */
export function buildResumenFacturaXml(resumen: ResumenFactura): Record<string, unknown> {
  const result: Record<string, unknown> = {
    CodigoTipoMoneda: {
      CodigoMoneda: resumen.codigoTipoMoneda?.codigoMoneda ?? "CRC",
      TipoCambio: resumen.codigoTipoMoneda?.tipoCambio ?? 1,
    },
  };

  const optionalTotal = (key: string, value: number | undefined): void => {
    if (value !== undefined) {
      result[key] = value;
    }
  };

  optionalTotal("TotalServGravados", resumen.totalServGravados);
  optionalTotal("TotalServExentos", resumen.totalServExentos);
  optionalTotal("TotalServExonerado", resumen.totalServExonerado);
  optionalTotal("TotalServNoSujeto", resumen.totalServNoSujeto);
  optionalTotal("TotalMercanciasGravadas", resumen.totalMercanciasGravadas);
  optionalTotal("TotalMercanciasExentas", resumen.totalMercanciasExentas);
  optionalTotal("TotalMercExonerada", resumen.totalMercExonerada);
  optionalTotal("TotalMercNoSujeta", resumen.totalMercNoSujeta);
  optionalTotal("TotalGravado", resumen.totalGravado);
  optionalTotal("TotalExento", resumen.totalExento);
  optionalTotal("TotalExonerado", resumen.totalExonerado);
  optionalTotal("TotalNoSujeto", resumen.totalNoSujeto);

  result.TotalVenta = resumen.totalVenta;
  optionalTotal("TotalDescuentos", resumen.totalDescuentos);
  result.TotalVentaNeta = resumen.totalVentaNeta;

  if (resumen.totalDesgloseImpuesto && resumen.totalDesgloseImpuesto.length > 0) {
    result.TotalDesgloseImpuesto = resumen.totalDesgloseImpuesto.map((d) => ({
      Codigo: d.codigo,
      ...(d.codigoTarifaIVA ? { CodigoTarifaIVA: d.codigoTarifaIVA } : {}),
      TotalMontoImpuesto: d.totalMontoImpuesto,
    }));
  }

  optionalTotal("TotalImpuesto", resumen.totalImpuesto);
  optionalTotal("TotalImpAsumEmisorFabrica", resumen.totalImpAsumEmisorFabrica);
  optionalTotal("TotalIVADevuelto", resumen.totalIVADevuelto);
  optionalTotal("TotalOtrosCargos", resumen.totalOtrosCargos);

  if (resumen.medioPago && resumen.medioPago.length > 0) {
    result.MedioPago = resumen.medioPago.map((m: MedioPago) => ({
      TipoMedioPago: m.tipoMedioPago,
      ...(m.medioPagoOtros ? { MedioPagoOtros: m.medioPagoOtros } : {}),
      TotalMedioPago: m.totalMedioPago,
    }));
  }

  result.TotalComprobante = resumen.totalComprobante;

  return result;
}

/**
 * Build the OtrosCargos XML array (v4.4: OtrosCargos is a repeated element
 * with no inner wrapper; order: TipoDocumentoOC, TipoDocumentoOTROS?,
 * IdentificacionTercero?, NombreTercero?, Detalle, PorcentajeOC?, MontoCargo).
 */
export function buildOtrosCargosXml(otrosCargos: OtroCargo[]): Record<string, unknown>[] {
  return otrosCargos.map((c: OtroCargo) => ({
    TipoDocumentoOC: c.tipoDocumento,
    ...(c.tipoDocumentoOtros ? { TipoDocumentoOTROS: c.tipoDocumentoOtros } : {}),
    ...(c.identificacionTercero
      ? { IdentificacionTercero: buildIdentificacionXml(c.identificacionTercero) }
      : {}),
    ...(c.nombreTercero ? { NombreTercero: c.nombreTercero } : {}),
    Detalle: c.detalle,
    ...(c.porcentaje !== undefined ? { PorcentajeOC: c.porcentaje } : {}),
    MontoCargo: c.montoCargo,
  }));
}

/**
 * Build InformacionReferencia XML array (v4.4 order: TipoDocIR,
 * TipoDocRefOTRO?, Numero?, FechaEmisionIR, Codigo?, CodigoReferenciaOTRO?,
 * Razon?).
 */
export function buildInformacionReferenciaXml(
  refs: InformacionReferencia[],
): Record<string, unknown>[] {
  return refs.map((ref: InformacionReferencia) => ({
    TipoDocIR: ref.tipoDoc,
    ...(ref.tipoDocOtros ? { TipoDocRefOTRO: ref.tipoDocOtros } : {}),
    ...(ref.numero ? { Numero: ref.numero } : {}),
    FechaEmisionIR: ref.fechaEmision,
    ...(ref.codigo ? { Codigo: ref.codigo } : {}),
    ...(ref.codigoOtros ? { CodigoReferenciaOTRO: ref.codigoOtros } : {}),
    ...(ref.razon ? { Razon: ref.razon } : {}),
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

// ---------------------------------------------------------------------------
// Standard document body
// ---------------------------------------------------------------------------

/** Common fields consumed by {@link buildStandardDocumentBody}. */
export interface CommonDocumentFields {
  clave: string;
  proveedorSistemas: string;
  codigoActividadEmisor?: string;
  codigoActividadReceptor?: string;
  numeroConsecutivo: string;
  fechaEmision: string;
  emisor: Emisor;
  receptor?: Receptor;
  condicionVenta: string;
  condicionVentaOtros?: string;
  plazoCredito?: string;
  detalleServicio: LineaDetalle[];
  otrosCargos?: OtroCargo[];
  resumenFactura: ResumenFactura;
  informacionReferencia?: InformacionReferencia[];
  otros?: OtroContenido[];
}

/**
 * Build the standard v4.4 document body shared by the document types
 * (Factura, Tiquete, Nota Credito, Nota Debito, Compra, Exportacion,
 * Recibo Electronico de Pago via its reduced variant).
 *
 * v4.4 root order: Clave, ProveedorSistemas, CodigoActividadEmisor?,
 * CodigoActividadReceptor?, NumeroConsecutivo, FechaEmision, Emisor,
 * Receptor?, CondicionVenta, CondicionVentaOtros?, PlazoCredito?,
 * DetalleServicio, OtrosCargos?, ResumenFactura, InformacionReferencia?,
 * Otros?.
 */
export function buildStandardDocumentBody(
  input: CommonDocumentFields,
  variant: DocumentVariant = DOCUMENT_VARIANTS.FacturaElectronica,
): Record<string, unknown> {
  const minimalParties = !variant.cuerpoCompleto;

  // Guard against pre-v4.4 input shapes from untyped callers: these fields
  // were renamed/moved and would otherwise be dropped silently.
  const legacy = input as unknown as Record<string, unknown>;
  if (legacy.codigoActividad !== undefined) {
    throw new Error(
      "codigoActividad was renamed to codigoActividadEmisor in v4.4 (with optional codigoActividadReceptor)",
    );
  }
  if (legacy.medioPago !== undefined) {
    throw new Error(
      "medioPago moved into resumenFactura.medioPago in v4.4 (entries of { tipoMedioPago, totalMedioPago })",
    );
  }

  const data: Record<string, unknown> = {
    Clave: input.clave,
    ProveedorSistemas: input.proveedorSistemas,
  };

  if (variant.codigoActividadEmisor === "required" && !input.codigoActividadEmisor) {
    throw new Error("codigoActividadEmisor is required for this document type (v4.4)");
  }

  if (variant.codigoActividadEmisor !== "none" && input.codigoActividadEmisor) {
    data.CodigoActividadEmisor = input.codigoActividadEmisor;
  }

  if (variant.codigoActividadReceptor && input.codigoActividadReceptor) {
    data.CodigoActividadReceptor = input.codigoActividadReceptor;
  }

  data.NumeroConsecutivo = input.numeroConsecutivo;
  data.FechaEmision = input.fechaEmision;
  data.Emisor = buildEmisorXml(input.emisor, minimalParties);

  if (input.receptor) {
    data.Receptor = buildReceptorXml(input.receptor, minimalParties);
  }

  data.CondicionVenta = input.condicionVenta;

  if (variant.cuerpoCompleto) {
    if (input.condicionVentaOtros) {
      data.CondicionVentaOtros = input.condicionVentaOtros;
    }

    if (input.plazoCredito) {
      data.PlazoCredito = input.plazoCredito;
    }
  }

  data.DetalleServicio = {
    LineaDetalle: input.detalleServicio.map((line: LineaDetalle) =>
      buildLineaDetalleXml(line, variant),
    ),
  };

  if (variant.cuerpoCompleto && input.otrosCargos && input.otrosCargos.length > 0) {
    data.OtrosCargos = buildOtrosCargosXml(input.otrosCargos);
  }

  data.ResumenFactura = buildResumenFacturaXml(input.resumenFactura);

  if (input.informacionReferencia && input.informacionReferencia.length > 0) {
    data.InformacionReferencia = buildInformacionReferenciaXml(input.informacionReferencia);
  }

  if (variant.cuerpoCompleto && input.otros && input.otros.length > 0) {
    data.Otros = buildOtrosXml(input.otros);
  }

  return data;
}
