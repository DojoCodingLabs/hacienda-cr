import {
  ExactFecUsedPersonalGoodsNonSubjectInputSchema,
  ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema,
  type ExactFecUsedPersonalGoodsNonSubjectInput,
  type ExactFecUsedPersonalGoodsNonSubjectCalculated,
} from "@dojocoding/hacienda-shared";
import { assertDocumentIdentity } from "../xml/document-identity.js";
import { scaled, round, money, sum } from "./exact-decimal.js";
/** Selected non-subject acquisition, not qualification, credit or resale authority. */
export function calculateExactFecUsedPersonalGoodsNonSubject(
  source: ExactFecUsedPersonalGoodsNonSubjectInput,
): ExactFecUsedPersonalGoodsNonSubjectCalculated {
  const input = ExactFecUsedPersonalGoodsNonSubjectInputSchema.parse(source);
  assertDocumentIdentity(input, "08");
  const m = (v: bigint) => money(v, "FEC");
  let grossTotal = 0n,
    discounts = 0n;
  const detalleServicio = input.detalleServicio.map((line) => {
    const gross = round(scaled(line.cantidad, 3) * scaled(line.precioUnitario, 5), 1000n);
    m(gross);
    if (gross <= 0n) throw new RangeError("Zero-gross line is outside non-subject FEC");
    const descuento = line.descuento?.map((d) => {
      const amount =
        "porcentaje" in d
          ? round(gross * scaled(d.porcentaje, 5), 10000000n)
          : scaled(d.montoDescuento, 5);
      const { codigoDescuento, codigoDescuentoOtros, naturalezaDescuento } = d;
      return {
        codigoDescuento,
        ...(codigoDescuentoOtros ? { codigoDescuentoOtros } : {}),
        ...(naturalezaDescuento ? { naturalezaDescuento } : {}),
        montoDescuento: m(amount),
      };
    });
    const deduction = sum((descuento ?? []).map((d) => scaled(d.montoDescuento, 5)));
    if (deduction >= gross)
      throw new RangeError("Zero or negative net line is outside non-subject FEC");
    const net = gross - deduction;
    grossTotal += gross;
    discounts += deduction;
    return {
      ...line,
      precioUnitario: m(scaled(line.precioUnitario, 5)),
      ...(descuento ? { descuento } : {}),
      montoTotal: m(gross),
      subTotal: m(net),
      baseImponible: m(net),
      impuesto: [{ codigo: "01", codigoTarifaIVA: "11", tarifa: "0", monto: "0.00000" }],
      impuestoNeto: "0.00000",
      montoTotalLinea: m(net),
    };
  });
  const net = grossTotal - discounts;
  if (sum(input.medioPago.map((p) => scaled(p.totalMedioPago, 5))) !== net)
    throw new RangeError("Exact non-subject FEC payment allocation must equal invoice total");
  return ExactFecUsedPersonalGoodsNonSubjectCalculatedSchema.parse({
    detalleServicio,
    resumenFactura: {
      codigoTipoMoneda: {
        ...input.codigoTipoMoneda,
        tipoCambio: m(scaled(input.codigoTipoMoneda.tipoCambio, 5)),
      },
      totalMercNoSujeta: m(grossTotal),
      totalNoSujeto: m(grossTotal),
      totalVenta: m(grossTotal),
      totalDescuentos: m(discounts),
      totalVentaNeta: m(net),
      totalImpuesto: "0.00000",
      totalComprobante: m(net),
      totalDesgloseImpuesto: [
        { codigo: "01", codigoTarifaIVA: "11", totalMontoImpuesto: "0.00000" },
      ],
      medioPago: input.medioPago.map((p) => ({
        ...p,
        totalMedioPago: m(scaled(p.totalMedioPago, 5)),
      })),
    },
  });
}
