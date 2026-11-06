/** Internal ordinary IVA13 monetary kernel. It consumes no document identity,
 * party, case or authority; callers parse their own current/retained schemas. */
import {
  ExactFeCalculatedSchema,
  type ExactFeInput,
  type ExactFeCalculated,
} from "@dojocoding/hacienda-shared";
export interface ExactOrdinaryMonetarySource {
  detalleServicio: ExactFeInput["detalleServicio"];
  codigoTipoMoneda: ExactFeInput["codigoTipoMoneda"];
  medioPago?: ExactFeInput["medioPago"];
}
import {
  scaled,
  round,
  money,
  sum,
  applyDiscounts,
  applyFrozenGrossDiscounts,
} from "./exact-decimal.js";

export function calculateExactOrdinaryMoney(
  input: ExactOrdinaryMonetarySource,
  family: "FE" | "TE" | "ND" | "FEC" | "NC" = "FE",
  basis: "sequential" | "frozen-gross" = "sequential",
): ExactFeCalculated {
  const moneyForCase = (value: bigint) => money(value, family);
  let services = 0n,
    goods = 0n,
    discounts = 0n,
    taxes = 0n;
  const detalleServicio = input.detalleServicio.map((line) => {
    const gross = round(scaled(line.cantidad, 3) * scaled(line.precioUnitario, 5), 1000n);
    moneyForCase(gross);
    if (gross <= 0n) throw new RangeError(`Zero-gross line is outside ordinary exact ${family}`);
    const discountEntries = line.descuento ?? [];
    const guardMessage = `Zero or negative net line is outside ordinary exact ${family}`;
    const applied =
      basis === "frozen-gross"
        ? applyFrozenGrossDiscounts(gross, discountEntries, guardMessage)
        : applyDiscounts(gross, discountEntries, guardMessage);
    const discount = discountEntries.length
      ? discountEntries.map((d, i) => {
          const amount = applied.amounts[i] as bigint;
          const { codigoDescuento, codigoDescuentoOtros, naturalezaDescuento } = d;
          return {
            codigoDescuento,
            ...(codigoDescuentoOtros ? { codigoDescuentoOtros } : {}),
            ...(naturalezaDescuento ? { naturalezaDescuento } : {}),
            montoDescuento: moneyForCase(amount),
          };
        })
      : undefined;
    const deduction = sum(applied.amounts);
    const net = gross - deduction,
      tax = round(net * 13n, 100n);
    if (line.esServicio) services += gross;
    else goods += gross;
    discounts += deduction;
    taxes += tax;
    return {
      ...line,
      precioUnitario: moneyForCase(scaled(line.precioUnitario, 5)),
      ...(discount ? { descuento: discount } : {}),
      montoTotal: moneyForCase(gross),
      subTotal: moneyForCase(net),
      baseImponible: moneyForCase(net),
      impuesto: [
        {
          codigo: "01" as const,
          codigoTarifaIVA: "08" as const,
          tarifa: "13" as const,
          monto: moneyForCase(tax),
        },
      ] as const,
      impuestoNeto: moneyForCase(tax),
      montoTotalLinea: moneyForCase(net + tax),
    };
  });
  const venta = services + goods,
    net = venta - discounts,
    total = net + taxes;
  const payments = input.medioPago ?? [];
  if (payments.length > 0) {
    const paid = sum(payments.map((p) => scaled(p.totalMedioPago, 5)));
    if (paid !== total)
      throw new RangeError(`Exact ordinary ${family} payment allocation must equal invoice total`);
  }
  return ExactFeCalculatedSchema.parse({
    detalleServicio,
    resumenFactura: {
      codigoTipoMoneda: {
        ...input.codigoTipoMoneda,
        tipoCambio: moneyForCase(scaled(input.codigoTipoMoneda.tipoCambio, 5)),
      },
      totalServGravados: moneyForCase(services),
      totalMercanciasGravadas: moneyForCase(goods),
      totalGravado: moneyForCase(venta),
      totalVenta: moneyForCase(venta),
      totalDescuentos: moneyForCase(discounts),
      totalVentaNeta: moneyForCase(net),
      totalImpuesto: moneyForCase(taxes),
      totalComprobante: moneyForCase(total),
      totalDesgloseImpuesto: [
        { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: moneyForCase(taxes) },
      ],
      ...(payments.length > 0
        ? {
            medioPago: payments.map((p) => ({
              ...p,
              totalMedioPago: moneyForCase(scaled(p.totalMedioPago, 5)),
            })),
          }
        : {}),
    },
  });
}
