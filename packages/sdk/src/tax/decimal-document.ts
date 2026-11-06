/**
 * Exact calculation for the additive `DecimalDocument*` family.
 *
 * All arithmetic runs on scaled integers from `exact-decimal.ts`. The module
 * does not parse a monetary value with `Number`, does not force the legacy
 * `1e-6` comparison tolerance, and does not trust any derived line or summary
 * value supplied by a source document.
 */

import {
  DecimalDocumentCalculatedSchema,
  DecimalDocumentInputSchema,
  DecimalLineCalculatedSchema,
  DecimalLineWithTariffCalculatedSchema,
  DecimalSummarySchema,
  isPositiveMonetaryText,
  parseMonetaryText,
  scaledFromPlainDecimal,
  type DecimalCurrency,
  type DecimalDiscount,
  type DecimalDocumentCalculated,
  type DecimalDocumentInput,
  type DecimalLineInput,
  type DecimalLineWithTariffInput,
  type DecimalOtherCharge,
  type DecimalPayment,
  type DecimalRepLineInput,
  type DecimalSummary,
  type DecimalTaxCalculated,
  type DecimalTaxInput,
} from "@dojocoding/hacienda-shared";
import { multiply, percent, ratio, round, sum, text } from "./exact-decimal.js";

const MONEY = 5;
const QUANTITY = 3;
const RATE = 5;
const MAX = 999999999999999999n;
const IVA_TAX_CODES = new Set(["01", "07", "08"]);
const SPECIFIC_BASE_CODES = new Set(["02", "04", "05"]);

export type DecimalLineSource = DecimalLineInput | DecimalLineWithTariffInput;
export type DecimalCalculatedLine =
  ReturnType<typeof calculateDecimalLineItemTotals> | ReturnType<typeof calculateDecimalRepLine>;

interface SummaryLine {
  montoTotal: string;
  impuesto: readonly DecimalTaxCalculated[];
  impuestoNeto?: string;
  descuento?: readonly DecimalDiscount[];
  impuestoAsumidoEmisorFabrica?: string;
  esServicio?: boolean;
}

function money(value: bigint): string {
  if (value < 0n || value > MAX) throw new RangeError("Exact monetary bound exceeded");
  return text(value, MONEY);
}

function rate(value: string): bigint {
  return scaledFromPlainDecimal(value, RATE);
}

function quantity(value: string): bigint {
  return scaledFromPlainDecimal(value, QUANTITY);
}

function sourceAmount(value: string): bigint {
  return parseMonetaryText(value);
}

function decimalData(value: {
  cantidadUnidadMedida: string;
  porcentaje?: string;
  proporcion?: string;
  impuestoUnidad: string;
}): {
  cantidad: bigint;
  porcentaje?: bigint;
  proporcion?: bigint;
  impuestoUnidad: bigint;
} {
  return {
    cantidad: scaledFromPlainDecimal(value.cantidadUnidadMedida, 2),
    ...(value.porcentaje !== undefined
      ? { porcentaje: scaledFromPlainDecimal(value.porcentaje, 2) }
      : {}),
    ...(value.proporcion !== undefined
      ? { proporcion: scaledFromPlainDecimal(value.proporcion, 5) }
      : {}),
    impuestoUnidad: sourceAmount(value.impuestoUnidad),
  };
}

/** Compute one tax amount from supplied facts, using the shared HALF_UP kernel. */
export function calculateDecimalTaxAmount(
  tax: Pick<DecimalTaxInput, "codigo" | "tarifa" | "monto" | "datosImpuestoEspecifico">,
  base: bigint,
  cantidad: bigint,
): bigint {
  const data = tax.datosImpuestoEspecifico;
  if (["03", "04", "05", "06"].includes(tax.codigo)) {
    if (!data) throw new Error(`Specific tax ${tax.codigo} requires datosImpuestoEspecifico`);
    const values = decimalData(data);
    if (tax.codigo === "04") {
      if (values.porcentaje === undefined || values.proporcion === undefined)
        throw new Error("Alcohol tax requires porcentaje and proporcion");
      const expectedProportion = percent(values.cantidad, values.porcentaje, 2, 2, RATE);
      if (expectedProportion !== values.proporcion)
        throw new Error("Alcohol proporcion must equal cantidadUnidadMedida * porcentaje / 100");
      return round(cantidad * values.proporcion * values.impuestoUnidad, 100000000n);
    }
    if (tax.codigo === "05") {
      if (tax.monto === undefined)
        throw new Error("Tax 05 requires an explicit monto calculated for the product category");
      return sourceAmount(tax.monto);
    }
    if (tax.codigo === "06")
      return round(cantidad * values.cantidad * values.impuestoUnidad, 100000n);
    return round(values.cantidad * values.impuestoUnidad, 100n);
  }

  if (tax.codigo === "02" && tax.tarifa === undefined) {
    if (tax.monto === undefined)
      throw new Error("ISC requires either a tarifa or an explicit monto");
    return sourceAmount(tax.monto);
  }
  if (tax.tarifa === undefined) throw new Error(`Tax ${tax.codigo} requires tarifa`);
  const amount = percent(base, rate(tax.tarifa), MONEY, RATE, MONEY);
  if (tax.monto !== undefined && amount !== sourceAmount(tax.monto))
    throw new Error("Tax amount does not match its percentage rate");
  return amount;
}

function discountAmount(discount: DecimalDiscount): bigint {
  return sourceAmount(discount.montoDescuento);
}

function canonicalDiscount(discount: DecimalDiscount): DecimalDiscount {
  return { ...discount, montoDescuento: money(discountAmount(discount)) };
}

/**
 * Calculate one ordinary line.
 *
 * Order: gross, discounts, subtotal, specific-tax base, taxes/exoneration,
 * net tax, line total. The supplied source never carries a derived amount.
 */
export function calculateDecimalLineItemTotals(line: DecimalLineSource) {
  const gross = multiply(
    quantity(line.cantidad),
    sourceAmount(line.precioUnitario),
    QUANTITY,
    MONEY,
    MONEY,
  );
  const discounts = line.descuento?.map(canonicalDiscount);
  const deduction = sum((discounts ?? []).map((discount) => sourceAmount(discount.montoDescuento)));
  if (deduction > gross) throw new RangeError("Discounts cannot exceed the gross line amount");
  const subTotal = gross - deduction;

  const taxInputs: DecimalTaxInput[] =
    line.impuesto.length > 0
      ? line.impuesto
      : [
          {
            codigo: "01",
            codigoTarifaIVA: "01",
            tarifa: "0",
          },
        ];

  const specificBase = sum(
    taxInputs
      .filter((tax) => SPECIFIC_BASE_CODES.has(tax.codigo))
      .map((tax) => calculateDecimalTaxAmount(tax, subTotal, quantity(line.cantidad))),
  );
  const baseImponible = subTotal + specificBase;

  const calculatedTaxes: DecimalTaxCalculated[] = [];
  let impuestoNeto = 0n;
  for (const tax of taxInputs) {
    const taxBase = IVA_TAX_CODES.has(tax.codigo) ? baseImponible : subTotal;
    const fullTaxAmount = calculateDecimalTaxAmount(tax, taxBase, quantity(line.cantidad));
    let netTaxAmount = fullTaxAmount;
    let exoneracion: DecimalTaxCalculated["exoneracion"] | undefined;

    if (tax.exoneracion) {
      const exonerationPortion = percent(
        taxBase,
        rate(tax.exoneracion.tarifaExonerada),
        MONEY,
        RATE,
        MONEY,
      );
      netTaxAmount = fullTaxAmount > exonerationPortion ? fullTaxAmount - exonerationPortion : 0n;
      exoneracion = {
        ...tax.exoneracion,
        montoExoneracion: money(exonerationPortion),
      };
    }

    calculatedTaxes.push({
      codigo: tax.codigo,
      ...(tax.codigoImpuestoOtros ? { codigoImpuestoOtros: tax.codigoImpuestoOtros } : {}),
      ...(tax.codigoTarifaIVA ? { codigoTarifaIVA: tax.codigoTarifaIVA } : {}),
      ...(tax.tarifa !== undefined ? { tarifa: tax.tarifa } : {}),
      ...(tax.factorCalculoIVA !== undefined ? { factorCalculoIVA: tax.factorCalculoIVA } : {}),
      ...(tax.datosImpuestoEspecifico
        ? { datosImpuestoEspecifico: tax.datosImpuestoEspecifico }
        : {}),
      ...(exoneracion ? { exoneracion } : {}),
      monto: money(fullTaxAmount),
    });
    impuestoNeto += netTaxAmount;
  }

  const result = {
    numeroLinea: line.numeroLinea,
    codigoCabys: line.codigoCabys,
    ...(line.codigoComercial ? { codigoComercial: line.codigoComercial } : {}),
    ...("partidaArancelaria" in line && line.partidaArancelaria
      ? { partidaArancelaria: line.partidaArancelaria }
      : {}),
    cantidad: text(quantity(line.cantidad), QUANTITY),
    unidadMedida: line.unidadMedida,
    ...(line.tipoTransaccion ? { tipoTransaccion: line.tipoTransaccion } : {}),
    ...(line.unidadMedidaComercial ? { unidadMedidaComercial: line.unidadMedidaComercial } : {}),
    detalle: line.detalle,
    ...(line.numeroVINoSerie ? { numeroVINoSerie: line.numeroVINoSerie } : {}),
    precioUnitario: money(sourceAmount(line.precioUnitario)),
    montoTotal: money(gross),
    ...(discounts ? { descuento: discounts } : {}),
    subTotal: money(subTotal),
    baseImponible: money(baseImponible),
    impuesto: calculatedTaxes,
    ...(line.impuestoAsumidoEmisorFabrica !== undefined
      ? { impuestoAsumidoEmisorFabrica: money(sourceAmount(line.impuestoAsumidoEmisorFabrica)) }
      : {}),
    impuestoNeto: money(impuestoNeto),
    montoTotalLinea: money(subTotal + impuestoNeto),
    ...(line.esServicio !== undefined ? { esServicio: line.esServicio } : {}),
  };

  return "partidaArancelaria" in result
    ? DecimalLineWithTariffCalculatedSchema.parse(result)
    : DecimalLineCalculatedSchema.parse(result);
}

/** Validate and canonicalize a REP line without deriving an amount. */
export function calculateDecimalRepLine(line: DecimalRepLineInput) {
  return canonicalRepLine(line);
}

function canonicalRepLine(line: {
  numeroLinea: number;
  codigoCabys?: string;
  detalle: string;
  montoTotal: string;
  subTotal: string;
  impuesto: DecimalTaxCalculated[];
  impuestoNeto: string;
  montoTotalLinea: string;
  esServicio?: boolean;
}) {
  const montoTotal = sourceAmount(line.montoTotal);
  if (!isPositiveMonetaryText(line.montoTotal))
    throw new RangeError("REP line amount must be positive");
  const subTotal = sourceAmount(line.subTotal);
  if (subTotal !== montoTotal)
    throw new RangeError("REP line subTotal must equal its supplied montoTotal");
  const taxNet = sum(
    line.impuesto.map((tax) => {
      const full = sourceAmount(tax.monto);
      const exoneration = tax.exoneracion ? sourceAmount(tax.exoneracion.montoExoneracion) : 0n;
      return full > exoneration ? full - exoneration : 0n;
    }),
  );
  const declaredTax = sourceAmount(line.impuestoNeto);
  if (declaredTax !== taxNet)
    throw new RangeError("REP line impuestoNeto must equal the supplied net tax amounts");
  const lineTotal = sourceAmount(line.montoTotalLinea);
  if (lineTotal !== subTotal + taxNet)
    throw new RangeError("REP line total must equal subTotal + impuestoNeto");

  return {
    numeroLinea: line.numeroLinea,
    ...(line.codigoCabys ? { codigoCabys: line.codigoCabys } : {}),
    detalle: line.detalle,
    montoTotal: money(montoTotal),
    subTotal: money(subTotal),
    impuesto: line.impuesto.map((tax) => ({
      ...tax,
      monto: money(sourceAmount(tax.monto)),
      ...(tax.exoneracion
        ? {
            exoneracion: {
              ...tax.exoneracion,
              montoExoneracion: money(sourceAmount(tax.exoneracion.montoExoneracion)),
            },
          }
        : {}),
    })),
    impuestoNeto: money(taxNet),
    montoTotalLinea: money(lineTotal),
    ...(line.esServicio !== undefined ? { esServicio: line.esServicio } : {}),
  };
}

function classification(line: SummaryLine): { gravado: bigint; exento: bigint; exonerado: bigint } {
  const gross = sourceAmount(line.montoTotal);
  if (!line.impuesto || line.impuesto.length === 0)
    return { gravado: 0n, exento: gross, exonerado: 0n };

  const allZeroRate = line.impuesto.every((tax) => {
    if (tax.tarifa !== undefined) return rate(tax.tarifa) === 0n;
    if (tax.factorCalculoIVA !== undefined) return rate(tax.factorCalculoIVA) === 0n;
    return sourceAmount(tax.monto) === 0n;
  });
  if (allZeroRate) return { gravado: 0n, exento: gross, exonerado: 0n };

  if (line.impuesto.some((tax) => tax.exoneracion !== undefined)) {
    let totalExonerado = 0n;
    for (const tax of line.impuesto) {
      if (tax.exoneracion && tax.tarifa !== undefined && rate(tax.tarifa) > 0n)
        totalExonerado += ratio(
          gross,
          rate(tax.exoneracion.tarifaExonerada),
          rate(tax.tarifa),
          MONEY,
          RATE,
          MONEY,
        );
    }
    if (totalExonerado >= gross) return { gravado: 0n, exento: 0n, exonerado: gross };
    return { gravado: gross - totalExonerado, exento: 0n, exonerado: totalExonerado };
  }

  return { gravado: gross, exento: 0n, exonerado: 0n };
}

/** Aggregate already-quantized line amounts without re-rounding them. */
export function calculateDecimalInvoiceSummary(
  lines: readonly SummaryLine[],
  currency: DecimalCurrency,
  payments?: readonly DecimalPayment[],
  otrosCargos?: readonly DecimalOtherCharge[],
): DecimalSummary {
  let totalServGravados = 0n;
  let totalServExentos = 0n;
  let totalServExonerado = 0n;
  let totalMercanciasGravadas = 0n;
  let totalMercanciasExentas = 0n;
  let totalMercExonerada = 0n;
  let totalDescuentos = 0n;
  let totalImpuesto = 0n;
  let totalImpAsumEmisorFabrica = 0n;

  for (const line of lines) {
    const group = classification(line);
    if (line.esServicio) {
      totalServGravados += group.gravado;
      totalServExentos += group.exento;
      totalServExonerado += group.exonerado;
    } else {
      totalMercanciasGravadas += group.gravado;
      totalMercanciasExentas += group.exento;
      totalMercExonerada += group.exonerado;
    }
    if (line.descuento)
      totalDescuentos += sum(
        line.descuento.map((discount) => sourceAmount(discount.montoDescuento)),
      );
    totalImpuesto += sourceAmount(line.impuestoNeto ?? "0");
    if ("impuestoAsumidoEmisorFabrica" in line && line.impuestoAsumidoEmisorFabrica)
      totalImpAsumEmisorFabrica += sourceAmount(line.impuestoAsumidoEmisorFabrica);
  }

  const desglose = new Map<string, { codigo: string; codigoTarifaIVA?: string; total: bigint }>();
  for (const line of lines) {
    for (const tax of line.impuesto) {
      const full = sourceAmount(tax.monto);
      const exoneration = tax.exoneracion ? sourceAmount(tax.exoneracion.montoExoneracion) : 0n;
      const net = full > exoneration ? full - exoneration : 0n;
      const key = `${tax.codigo}|${tax.codigoTarifaIVA ?? ""}`;
      const existing = desglose.get(key);
      if (existing) existing.total += net;
      else
        desglose.set(key, {
          codigo: tax.codigo,
          ...(tax.codigoTarifaIVA ? { codigoTarifaIVA: tax.codigoTarifaIVA } : {}),
          total: net,
        });
    }
  }

  const totalGravado = totalServGravados + totalMercanciasGravadas;
  const totalExento = totalServExentos + totalMercanciasExentas;
  const totalExonerado = totalServExonerado + totalMercExonerada;
  const totalVenta = totalGravado + totalExento + totalExonerado;
  const totalVentaNeta = totalVenta - totalDescuentos;
  const totalOtrosCargos = sum(
    (otrosCargos ?? []).map((charge) => sourceAmount(charge.montoCargo)),
  );
  const totalComprobante = totalVentaNeta + totalImpuesto + totalOtrosCargos;
  const totalPaid = sum((payments ?? []).map((payment) => sourceAmount(payment.totalMedioPago)));
  if (payments && payments.length > 0 && totalPaid !== totalComprobante)
    throw new RangeError("Payment allocations must equal the invoice total");

  return DecimalSummarySchema.parse({
    codigoTipoMoneda: {
      codigoMoneda: currency.codigoMoneda,
      tipoCambio: money(sourceAmount(currency.tipoCambio)),
    },
    totalServGravados: money(totalServGravados),
    totalServExentos: money(totalServExentos),
    totalServExonerado: money(totalServExonerado),
    totalServNoSujeto: "0",
    totalMercanciasGravadas: money(totalMercanciasGravadas),
    totalMercanciasExentas: money(totalMercanciasExentas),
    totalMercExonerada: money(totalMercExonerada),
    totalMercNoSujeta: "0",
    totalGravado: money(totalGravado),
    totalExento: money(totalExento),
    totalExonerado: money(totalExonerado),
    totalNoSujeto: "0",
    totalVenta: money(totalVenta),
    totalDescuentos: money(totalDescuentos),
    totalVentaNeta: money(totalVentaNeta),
    totalDesgloseImpuesto: [...desglose.values()].map((entry) => ({
      codigo: entry.codigo as DecimalSummary["totalDesgloseImpuesto"] extends
        (infer T)[] | undefined
        ? T extends { codigo: infer C }
          ? C
          : never
        : never,
      ...(entry.codigoTarifaIVA
        ? {
            codigoTarifaIVA: entry.codigoTarifaIVA as NonNullable<
              NonNullable<DecimalSummary["totalDesgloseImpuesto"]>[number]["codigoTarifaIVA"]
            >,
          }
        : {}),
      totalMontoImpuesto: money(entry.total),
    })),
    totalImpuesto: money(totalImpuesto),
    totalImpAsumEmisorFabrica: money(totalImpAsumEmisorFabrica),
    totalIVADevuelto: "0",
    totalOtrosCargos: money(totalOtrosCargos),
    ...(payments
      ? {
          medioPago: payments.map((payment) => ({
            ...payment,
            totalMedioPago: money(sourceAmount(payment.totalMedioPago)),
          })),
        }
      : {}),
    totalComprobante: money(totalComprobante),
  });
}

/** Calculate a full standard document from its source facts. */
export function calculateDecimalDocument(source: DecimalDocumentInput): DecimalDocumentCalculated {
  const input = DecimalDocumentInputSchema.parse(source);
  if (input.tipoDocumento === "10") {
    const detalleServicio = input.detalleServicio.map((line) => canonicalRepLine(line));
    const resumenFactura = DecimalSummarySchema.parse(
      calculateDecimalInvoiceSummary(detalleServicio, input.codigoTipoMoneda, input.medioPago),
    );
    return DecimalDocumentCalculatedSchema.parse({
      tipoDocumento: "10",
      clave: input.clave,
      proveedorSistemas: input.proveedorSistemas,
      numeroConsecutivo: input.numeroConsecutivo,
      fechaEmision: input.fechaEmision,
      emisor: input.emisor,
      receptor: input.receptor,
      condicionVenta: input.condicionVenta,
      detalleServicio,
      resumenFactura,
      informacionReferencia: input.informacionReferencia,
    });
  }

  const detalleServicio = input.detalleServicio.map((line) => calculateDecimalLineItemTotals(line));
  const resumenFactura = calculateDecimalInvoiceSummary(
    detalleServicio,
    input.codigoTipoMoneda,
    input.medioPago,
    input.otrosCargos,
  );
  const { codigoTipoMoneda: _currency, medioPago: _payments, ...facts } = input;
  return DecimalDocumentCalculatedSchema.parse({
    ...facts,
    detalleServicio,
    resumenFactura,
  });
}
