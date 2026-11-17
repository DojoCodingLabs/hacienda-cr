/**
 * XML builder for the additive `DecimalDocument*` family.
 *
 * The builder always recalculates from source facts. It never trusts a caller's
 * line totals or summary, and it serializes every monetary value with exactly
 * five decimals at the XML boundary while keeping canonical trimmed text in the
 * calculated JSON.
 */

import {
  DECIMAL_DOCUMENT_TYPE_NAMES,
  DecimalDocumentInputSchema,
  DecimalMensajeReceptorSchema,
  type DecimalDocumentCalculated,
  type DecimalDocumentInput,
  type DecimalFacturaInput,
  type DecimalFacturaCompraInput,
  type DecimalFacturaExportacionInput,
  type DecimalLineCalculated,
  type DecimalLineWithTariffCalculated,
  type DecimalMensajeReceptor,
  type DecimalNotaCreditoInput,
  type DecimalNotaDebitoInput,
  type DecimalOtherCharge,
  type DecimalReciboPagoInput,
  type DecimalRepLineCalculated,
  type DecimalSummary,
  type DecimalTaxCalculated,
  type DecimalTiqueteInput,
  formatScaledDecimal,
  parseMonetaryText,
  type DecimalLineInput,
  type DecimalLineWithTariffInput,
} from "@dojocoding/hacienda-shared";
import { calculateDecimalDocument } from "../tax/decimal-document.js";
import { ValidationError } from "../errors.js";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { buildXml } from "../xml/builder.js";
import {
  DOCUMENT_VARIANTS,
  buildStandardDocumentBody,
  type CommonDocumentFields,
  type DocumentVariant,
  type XmlImpuesto,
  type XmlLineaDetalle,
  type XmlOtroCargo,
  type XmlResumenFactura,
} from "./shared-xml-helpers.js";
import { buildMensajeReceptorFields } from "./mensaje-receptor-builder.js";

function xmlMoney(value: string): string {
  const canonical = formatScaledDecimal(parseMonetaryText(value), 5);
  const [whole = "0", fraction = ""] = canonical.split(".");
  return `${whole}.${fraction.padEnd(5, "0")}`;
}

function xmlTax(tax: DecimalTaxCalculated): XmlImpuesto {
  return {
    codigo: tax.codigo,
    ...(tax.codigoImpuestoOtros ? { codigoImpuestoOtros: tax.codigoImpuestoOtros } : {}),
    ...(tax.codigoTarifaIVA ? { codigoTarifaIVA: tax.codigoTarifaIVA } : {}),
    ...(tax.tarifa !== undefined ? { tarifa: tax.tarifa } : {}),
    ...(tax.factorCalculoIVA !== undefined ? { factorCalculoIVA: tax.factorCalculoIVA } : {}),
    ...(tax.datosImpuestoEspecifico
      ? {
          datosImpuestoEspecifico: {
            ...tax.datosImpuestoEspecifico,
            impuestoUnidad: xmlMoney(tax.datosImpuestoEspecifico.impuestoUnidad),
          },
        }
      : {}),
    monto: xmlMoney(tax.monto),
    ...(tax.exoneracion
      ? {
          exoneracion: {
            ...tax.exoneracion,
            montoExoneracion: xmlMoney(tax.exoneracion.montoExoneracion),
          },
        }
      : {}),
  };
}

type AnyCalculatedLine =
  DecimalLineCalculated | DecimalLineWithTariffCalculated | DecimalRepLineCalculated;

function xmlLine(line: AnyCalculatedLine, variant: DocumentVariant): XmlLineaDetalle {
  return {
    numeroLinea: line.numeroLinea,
    ...("partidaArancelaria" in line && line.partidaArancelaria
      ? { partidaArancelaria: line.partidaArancelaria }
      : {}),
    ...("codigoCabys" in line && line.codigoCabys ? { codigoCabys: line.codigoCabys } : {}),
    ...("codigoComercial" in line && line.codigoComercial
      ? { codigoComercial: line.codigoComercial }
      : {}),
    ...("cantidad" in line && line.cantidad ? { cantidad: line.cantidad } : {}),
    ...("unidadMedida" in line && line.unidadMedida ? { unidadMedida: line.unidadMedida } : {}),
    ...("tipoTransaccion" in line && line.tipoTransaccion
      ? { tipoTransaccion: line.tipoTransaccion }
      : {}),
    ...("unidadMedidaComercial" in line && line.unidadMedidaComercial
      ? { unidadMedidaComercial: line.unidadMedidaComercial }
      : {}),
    detalle: line.detalle,
    ...("numeroVINoSerie" in line && line.numeroVINoSerie
      ? { numeroVINoSerie: line.numeroVINoSerie }
      : {}),
    ...("precioUnitario" in line && line.precioUnitario
      ? { precioUnitario: xmlMoney(line.precioUnitario) }
      : {}),
    montoTotal: xmlMoney(line.montoTotal),
    ...("descuento" in line && line.descuento
      ? {
          descuento: line.descuento.map((discount) => ({
            ...discount,
            montoDescuento: xmlMoney(discount.montoDescuento),
          })),
        }
      : {}),
    subTotal: xmlMoney(line.subTotal),
    ...("baseImponible" in line && line.baseImponible !== undefined
      ? { baseImponible: xmlMoney(line.baseImponible) }
      : {}),
    impuesto: line.impuesto.map(xmlTax),
    ...("impuestoAsumidoEmisorFabrica" in line && line.impuestoAsumidoEmisorFabrica !== undefined
      ? { impuestoAsumidoEmisorFabrica: xmlMoney(line.impuestoAsumidoEmisorFabrica) }
      : variant.lineaConImpuestoAsumido === "required"
        ? { impuestoAsumidoEmisorFabrica: "0.00000" }
        : {}),
    ...(line.impuestoNeto !== undefined
      ? { impuestoNeto: xmlMoney(line.impuestoNeto) }
      : variant.lineaConImpuestoNeto
        ? { impuestoNeto: "0.00000" }
        : {}),
    montoTotalLinea: xmlMoney(line.montoTotalLinea),
  };
}

function xmlSummary(summary: DecimalSummary, variant: DocumentVariant): XmlResumenFactura {
  return {
    ...(summary.codigoTipoMoneda
      ? {
          codigoTipoMoneda: {
            codigoMoneda: summary.codigoTipoMoneda.codigoMoneda,
            tipoCambio: xmlMoney(summary.codigoTipoMoneda.tipoCambio),
          },
        }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalServGravados !== undefined
      ? { totalServGravados: xmlMoney(summary.totalServGravados) }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalServExentos !== undefined
      ? { totalServExentos: xmlMoney(summary.totalServExentos) }
      : {}),
    ...(variant.cuerpoCompleto &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalServExonerado !== undefined
      ? { totalServExonerado: xmlMoney(summary.totalServExonerado) }
      : {}),
    ...(variant.cuerpoCompleto &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalServNoSujeto !== undefined
      ? { totalServNoSujeto: xmlMoney(summary.totalServNoSujeto) }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalMercanciasGravadas !== undefined
      ? { totalMercanciasGravadas: xmlMoney(summary.totalMercanciasGravadas) }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalMercanciasExentas !== undefined
      ? { totalMercanciasExentas: xmlMoney(summary.totalMercanciasExentas) }
      : {}),
    ...(variant.cuerpoCompleto &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalMercExonerada !== undefined
      ? { totalMercExonerada: xmlMoney(summary.totalMercExonerada) }
      : {}),
    ...(variant.cuerpoCompleto &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalMercNoSujeta !== undefined
      ? { totalMercNoSujeta: xmlMoney(summary.totalMercNoSujeta) }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalGravado !== undefined
      ? { totalGravado: xmlMoney(summary.totalGravado) }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalExento !== undefined
      ? { totalExento: xmlMoney(summary.totalExento) }
      : {}),
    ...(variant.cuerpoCompleto &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalExonerado !== undefined
      ? { totalExonerado: xmlMoney(summary.totalExonerado) }
      : {}),
    ...(variant.cuerpoCompleto &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalNoSujeto !== undefined
      ? { totalNoSujeto: xmlMoney(summary.totalNoSujeto) }
      : {}),
    totalVenta: xmlMoney(summary.totalVenta),
    ...(variant.cuerpoCompleto && summary.totalDescuentos !== undefined
      ? { totalDescuentos: xmlMoney(summary.totalDescuentos) }
      : {}),
    totalVentaNeta: xmlMoney(summary.totalVentaNeta),
    ...(summary.totalDesgloseImpuesto
      ? {
          totalDesgloseImpuesto: summary.totalDesgloseImpuesto.map((tax) => ({
            ...tax,
            totalMontoImpuesto: xmlMoney(tax.totalMontoImpuesto),
          })),
        }
      : {}),
    ...(summary.totalImpuesto !== undefined
      ? { totalImpuesto: xmlMoney(summary.totalImpuesto) }
      : {}),
    ...(variant.cuerpoCompleto &&
    variant.codigoActividadEmisor === "required" &&
    summary.totalImpAsumEmisorFabrica !== undefined
      ? { totalImpAsumEmisorFabrica: xmlMoney(summary.totalImpAsumEmisorFabrica) }
      : {}),
    ...(variant.codigoActividadEmisor === "required" &&
    !variant.lineaConPartidaArancelaria &&
    summary.totalIVADevuelto !== undefined
      ? { totalIVADevuelto: xmlMoney(summary.totalIVADevuelto) }
      : {}),
    ...(variant.cuerpoCompleto && summary.totalOtrosCargos !== undefined
      ? { totalOtrosCargos: xmlMoney(summary.totalOtrosCargos) }
      : {}),
    ...(summary.medioPago
      ? {
          medioPago: summary.medioPago.map((payment) => ({
            ...payment,
            totalMedioPago: xmlMoney(payment.totalMedioPago),
          })),
        }
      : {}),
    totalComprobante: xmlMoney(summary.totalComprobante),
  };
}

function xmlOtherCharges(charges: readonly DecimalOtherCharge[]): XmlOtroCargo[] {
  return charges.map((charge) => ({
    ...charge,
    montoCargo: xmlMoney(charge.montoCargo),
  }));
}

function rootFor(tipoDocumento: DecimalDocumentInput["tipoDocumento"]): string {
  return DECIMAL_DOCUMENT_TYPE_NAMES[tipoDocumento];
}

function variantFor(root: string): DocumentVariant {
  return DOCUMENT_VARIANTS[root as keyof typeof DOCUMENT_VARIANTS];
}

function commonFields(
  source: DecimalDocumentInput,
  calculated: DecimalDocumentCalculated,
  variant: DocumentVariant,
): CommonDocumentFields {
  return {
    clave: source.clave,
    proveedorSistemas: source.proveedorSistemas,
    ...("codigoActividadEmisor" in source && source.codigoActividadEmisor
      ? { codigoActividadEmisor: source.codigoActividadEmisor }
      : {}),
    ...("codigoActividadReceptor" in source && source.codigoActividadReceptor
      ? { codigoActividadReceptor: source.codigoActividadReceptor }
      : {}),
    numeroConsecutivo: source.numeroConsecutivo,
    fechaEmision: source.fechaEmision,
    emisor: source.emisor,
    ...(source.receptor ? { receptor: source.receptor } : {}),
    condicionVenta: source.condicionVenta,
    ...("condicionVentaOtros" in source && source.condicionVentaOtros
      ? { condicionVentaOtros: source.condicionVentaOtros }
      : {}),
    ...("plazoCredito" in source && source.plazoCredito
      ? { plazoCredito: source.plazoCredito }
      : {}),
    detalleServicio: calculated.detalleServicio.map((line) => xmlLine(line, variant)),
    ...("otrosCargos" in source && source.otrosCargos
      ? { otrosCargos: xmlOtherCharges(source.otrosCargos) }
      : {}),
    resumenFactura: xmlSummary(calculated.resumenFactura, variant),
    ...(source.informacionReferencia
      ? { informacionReferencia: source.informacionReferencia }
      : {}),
    ...("otros" in source && source.otros ? { otros: source.otros } : {}),
  };
}

/** Build any covered document from its exact source facts. */
export function buildDecimalDocumentXml(source: DecimalDocumentInput): string {
  const input = DecimalDocumentInputSchema.parse(source);
  const calculated = calculateDecimalDocument(input);
  assertDocumentIdentity(input, input.tipoDocumento);
  const root = rootFor(input.tipoDocumento);
  const variant = variantFor(root);
  return buildXml(
    root,
    buildStandardDocumentBody(commonFields(input, calculated, variant), variant),
  );
}

/** Build an exact FE from its per-type source schema (no discriminator required). */
export function buildDecimalFacturaXml(source: DecimalFacturaInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "01" });
}

export function buildDecimalTiqueteXml(source: DecimalTiqueteInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "04" });
}

export function buildDecimalNotaCreditoXml(source: DecimalNotaCreditoInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "03" });
}

export function buildDecimalNotaDebitoXml(source: DecimalNotaDebitoInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "02" });
}

export function buildDecimalFacturaCompraXml(source: DecimalFacturaCompraInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "08" });
}

export function buildDecimalFacturaExportacionXml(source: DecimalFacturaExportacionInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "09" });
}

export function buildDecimalReciboPagoXml(source: DecimalReciboPagoInput): string {
  return buildDecimalDocumentXml({ ...source, tipoDocumento: "10" });
}

/** Validate the Mensaje Receptor's own envelope identity before serialization. */
export function assertRecipientMessageIdentity(input: DecimalMensajeReceptor): void {
  const issues: { path: string; message: string }[] = [];
  if (!/^506\d{6}[A-Za-z0-9]{12}\d{29}$/.test(input.clave))
    issues.push({
      path: "clave",
      message: "clave must follow the 50-character Costa Rica identity layout",
    });
  if (!/^\d{20}$/.test(input.numeroConsecutivoReceptor))
    issues.push({
      path: "numeroConsecutivoReceptor",
      message: "numeroConsecutivoReceptor must contain 20 digits",
    });
  if (!/^[123]$/.test(input.clave.slice(41, 42)))
    issues.push({ path: "clave", message: "clave situation must be 1, 2 or 3" });
  if (issues.length)
    throw new ValidationError("Recipient message identity validation failed", issues);
}

/** Build a Mensaje Receptor from bounded decimal text without calculating taxes. */
export function buildDecimalMensajeReceptorXml(source: DecimalMensajeReceptor): string {
  const input = DecimalMensajeReceptorSchema.parse(source);
  assertRecipientMessageIdentity(input);
  return buildXml(
    "MensajeReceptor",
    buildMensajeReceptorFields({
      ...input,
      ...(input.montoTotalImpuesto !== undefined
        ? { montoTotalImpuesto: xmlMoney(input.montoTotalImpuesto) }
        : {}),
      ...(input.montoTotalImpuestoAcreditar !== undefined
        ? { montoTotalImpuestoAcreditar: xmlMoney(input.montoTotalImpuestoAcreditar) }
        : {}),
      ...(input.montoTotalDeGastoAplicable !== undefined
        ? { montoTotalDeGastoAplicable: xmlMoney(input.montoTotalDeGastoAplicable) }
        : {}),
      totalFactura: xmlMoney(input.totalFactura),
    }),
  );
}

export type { DecimalLineInput, DecimalLineWithTariffInput };
