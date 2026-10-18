/** Additive exact ordinary-FE arithmetic. Monetary values never cross Number.
 * Round nonnegative products HALF_UP to5 decimal places at gross, percentage
 * discount and per-line tax boundaries; aggregate already-quantized integers. */
import {
  ExactFeInputSchema,
  ExactFeCalculatedSchema,
  type ExactFeInput,
  type ExactFeCalculated,
} from "@dojocoding/hacienda-shared";
const SCALE = 100000n;
const MAX = 999999999999999999n;
function scaled(text: string, scale: number): bigint {
  const [whole = "", fraction = ""] = text.split(".");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
}
function round(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}
function money(n: bigint): string {
  if (n < 0n || n > MAX) throw new RangeError("Exact FE monetary bound exceeded");
  return `${n / SCALE}.${(n % SCALE).toString().padStart(5, "0")}`;
}
function sum(items: readonly bigint[]) {
  return items.reduce((a, b) => a + b, 0n);
}
export function calculateExactFe(source: ExactFeInput): ExactFeCalculated {
  const input = ExactFeInputSchema.parse(source);
  let services = 0n,
    goods = 0n,
    discounts = 0n,
    taxes = 0n;
  const detalleServicio = input.detalleServicio.map((line) => {
    const gross = round(scaled(line.cantidad, 3) * scaled(line.precioUnitario, 5), 1000n);
    money(gross);
    if (gross <= 0n) throw new RangeError("Zero-gross line is outside ordinary exact FE");
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
        montoDescuento: money(amount),
      };
    });
    const deduction = sum((discount ?? []).map((d) => scaled(d.montoDescuento, 5)));
    if (deduction >= gross)
      throw new RangeError("Zero or negative net line is outside ordinary exact FE");
    const net = gross - deduction,
      tax = round(net * 13n, 100n);
    if (line.esServicio) services += gross;
    else goods += gross;
    discounts += deduction;
    taxes += tax;
    return {
      ...line,
      precioUnitario: money(scaled(line.precioUnitario, 5)),
      ...(discount ? { descuento: discount } : {}),
      montoTotal: money(gross),
      subTotal: money(net),
      baseImponible: money(net),
      impuesto: [
        {
          codigo: "01" as const,
          codigoTarifaIVA: "08" as const,
          tarifa: "13" as const,
          monto: money(tax),
        },
      ] as const,
      impuestoNeto: money(tax),
      montoTotalLinea: money(net + tax),
    };
  });
  const venta = services + goods,
    net = venta - discounts,
    total = net + taxes;
  const paid = sum(input.medioPago.map((p) => scaled(p.totalMedioPago, 5)));
  if (paid !== total)
    throw new RangeError("Exact ordinary FE payment allocation must equal invoice total");
  return ExactFeCalculatedSchema.parse({
    detalleServicio,
    resumenFactura: {
      codigoTipoMoneda: {
        ...input.codigoTipoMoneda,
        tipoCambio: money(scaled(input.codigoTipoMoneda.tipoCambio, 5)),
      },
      totalServGravados: money(services),
      totalMercanciasGravadas: money(goods),
      totalGravado: money(venta),
      totalVenta: money(venta),
      totalDescuentos: money(discounts),
      totalVentaNeta: money(net),
      totalImpuesto: money(taxes),
      totalComprobante: money(total),
      totalDesgloseImpuesto: [
        { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: money(taxes) },
      ],
      medioPago: input.medioPago.map((p) => ({
        ...p,
        totalMedioPago: money(scaled(p.totalMedioPago, 5)),
      })),
    },
  });
}
