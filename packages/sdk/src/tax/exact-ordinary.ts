/** Internal ordinary IVA13 monetary kernel. It consumes no document identity,
 * party, case or authority; callers parse their own current/retained schemas. */
import {
  ExactFeCalculatedSchema,
  type ExactFeInput,
  type ExactFeCalculated,
} from "@dojocoding/hacienda-shared";
export type ExactOrdinaryMonetarySource = Pick<
  ExactFeInput,
  "detalleServicio" | "codigoTipoMoneda" | "medioPago"
>;
import { scaled, round, money, sum } from "./exact-decimal.js";
const SCALE = 100000n;
export function calculateExactOrdinaryMoney(
  input: ExactOrdinaryMonetarySource,
  family: "FE" | "TE" | "ND" | "FEC" | "NC" = "FE",
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
    const discount = line.descuento?.map((d) => {
      const amount =
        "porcentaje" in d
          ? round(gross * scaled(d.porcentaje, 5), 100n * SCALE)
          : scaled(d.montoDescuento, 5);
      const { codigoDescuento, codigoDescuentoOtros, naturalezaDescuento } = d;
      return {
        codigoDescuento,
        ...(codigoDescuentoOtros ? { codigoDescuentoOtros } : {}),
        ...(naturalezaDescuento ? { naturalezaDescuento } : {}),
        montoDescuento: moneyForCase(amount),
      };
    });
    const deduction = sum((discount ?? []).map((d) => scaled(d.montoDescuento, 5)));
    if (deduction >= gross)
      throw new RangeError(`Zero or negative net line is outside ordinary exact ${family}`);
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
  const paid = sum(input.medioPago.map((p) => scaled(p.totalMedioPago, 5)));
  if (paid !== total)
    throw new RangeError(`Exact ordinary ${family} payment allocation must equal invoice total`);
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
      medioPago: input.medioPago.map((p) => ({
        ...p,
        totalMedioPago: moneyForCase(scaled(p.totalMedioPago, 5)),
      })),
    },
  });
}
