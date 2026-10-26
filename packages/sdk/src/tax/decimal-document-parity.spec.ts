import { describe, expect, it } from "vitest";
import { calculateLineItemTotals, calculateInvoiceSummary } from "./calculator.js";
import {
  calculateDecimalLineItemTotals,
  calculateDecimalInvoiceSummary,
} from "./decimal-document.js";

describe("decimal calculation parity with Number path", () => {
  it("matches an ordinary IVA line", () => {
    const legacy = calculateLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 3,
      unidadMedida: "Sp",
      detalle: "Servicio",
      precioUnitario: 0.1,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      esServicio: true,
    });
    const exact = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "3",
      unidadMedida: "Sp",
      detalle: "Servicio",
      precioUnitario: "0.1",
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
      esServicio: true,
    });
    expect(Number(exact.montoTotal)).toBe(legacy.montoTotal);
    expect(Number(exact.subTotal)).toBe(legacy.subTotal);
    expect(Number(exact.baseImponible)).toBe(legacy.baseImponible);
    expect(Number(exact.impuestoNeto)).toBe(legacy.impuestoNeto);
    expect(Number(exact.montoTotalLinea)).toBe(legacy.montoTotalLinea);
  });

  it("matches an ISC line", () => {
    const legacy = calculateLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "ISC",
      precioUnitario: 100,
      impuesto: [{ codigo: "02", tarifa: 10 }],
    });
    const exact = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "ISC",
      precioUnitario: "100",
      impuesto: [{ codigo: "02", tarifa: "10" }],
    });
    expect(Number(exact.impuesto[0]?.monto)).toBe(legacy.impuesto[0]?.monto);
    expect(Number(exact.montoTotalLinea)).toBe(legacy.montoTotalLinea);
  });

  it("matches an exoneration line", () => {
    const legacy = calculateLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Exon",
      precioUnitario: 100,
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          exoneracion: {
            tipoDocumento: "01",
            numeroDocumento: "123",
            nombreInstitucion: "01",
            fechaEmision: "2025-01-01",
            tarifaExonerada: 5,
          },
        },
      ],
    });
    const exact = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "Exon",
      precioUnitario: "100",
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: "13",
          exoneracion: {
            tipoDocumento: "01",
            numeroDocumento: "123",
            nombreInstitucion: "01",
            fechaEmision: "2025-01-01",
            tarifaExonerada: "5",
          },
        },
      ],
    });
    expect(Number(exact.impuesto[0]?.exoneracion?.montoExoneracion)).toBe(
      legacy.impuesto[0]?.exoneracion?.montoExoneracion,
    );
    expect(Number(exact.impuestoNeto)).toBe(legacy.impuestoNeto);
  });

  it("matches invoice summaries", () => {
    const lines = [
      {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Servicio",
        precioUnitario: 100,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
        esServicio: true,
      },
    ];
    const legacyLines = lines.map((line) => calculateLineItemTotals(line));
    const legacySummary = calculateInvoiceSummary(legacyLines);
    const exactLines = lines.map((line) =>
      calculateDecimalLineItemTotals({
        ...line,
        cantidad: String(line.cantidad),
        precioUnitario: String(line.precioUnitario),
        impuesto: line.impuesto.map((tax) => ({
          ...tax,
          tarifa: String(tax.tarifa),
        })),
      }),
    );
    const exactSummary = calculateDecimalInvoiceSummary(exactLines, {
      codigoMoneda: "CRC",
      tipoCambio: "1",
    });
    expect(Number(exactSummary.totalVenta)).toBe(legacySummary.totalVenta);
    expect(Number(exactSummary.totalImpuesto)).toBe(legacySummary.totalImpuesto);
    expect(Number(exactSummary.totalComprobante)).toBe(legacySummary.totalComprobante);
  });
});
