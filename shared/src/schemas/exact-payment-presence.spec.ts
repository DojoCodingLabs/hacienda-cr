import { z } from "zod";
import * as shared from "../index.js";
import {
  ExactFeCalculatedSchema,
  ExactFeSummarySchema,
  RetainedExactFeCalculatedSchema,
  paymentOptionalFor,
  requirePaymentPresence,
} from "./exact-fe.js";

const MESSAGE = "Payment allocation is required unless the sale condition is 02, 08 or 10";

/** Calculated output of a 100 + IVA13 synthetic FE line. */
function calculated(medioPago?: { tipoMedioPago: "01"; totalMedioPago: string }[]) {
  return {
    detalleServicio: [
      {
        numeroLinea: 1,
        codigoCabys: "8310100000000",
        unidadMedida: "Sp",
        detalle: "Servicio sintético",
        cantidad: "1",
        precioUnitario: "100.00000",
        esServicio: true,
        montoTotal: "100.00000",
        subTotal: "100.00000",
        baseImponible: "100.00000",
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13", monto: "13.00000" }],
        impuestoNeto: "13.00000",
        montoTotalLinea: "113.00000",
      },
    ],
    resumenFactura: {
      codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1.00000" },
      totalServGravados: "100.00000",
      totalMercanciasGravadas: "0.00000",
      totalGravado: "100.00000",
      totalVenta: "100.00000",
      totalDescuentos: "0.00000",
      totalVentaNeta: "100.00000",
      totalImpuesto: "13.00000",
      totalComprobante: "113.00000",
      totalDesgloseImpuesto: [
        { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: "13.00000" },
      ],
      ...(medioPago ? { medioPago } : {}),
    },
  };
}

describe("MedioPago presence helpers (Anexos v4.4:194)", () => {
  it("exempts exactly the sale conditions 02, 08 and 10", () => {
    for (const code of ["02", "08", "10"]) expect(paymentOptionalFor(code)).toBe(true);
    for (const code of [
      "01",
      "03",
      "04",
      "05",
      "06",
      "07",
      "09",
      "11",
      "12",
      "13",
      "14",
      "15",
      "99",
    ])
      expect(paymentOptionalFor(code)).toBe(false);
  });

  it("requires a non-empty allocation only for non-exempt conditions", () => {
    const schema = z
      .object({ condicionVenta: z.string(), medioPago: z.array(z.unknown()).optional() })
      .superRefine((input, ctx) =>
        requirePaymentPresence(input.condicionVenta, input.medioPago, ctx),
      );
    const issues = (input: unknown) => schema.safeParse(input).error?.issues ?? [];
    for (const medioPago of [undefined, []]) {
      expect(issues({ condicionVenta: "01", medioPago })).toEqual([
        expect.objectContaining({ path: ["medioPago"], message: MESSAGE }),
      ]);
      for (const code of ["02", "08", "10"])
        expect(issues({ condicionVenta: code, medioPago })).toEqual([]);
    }
    for (const code of ["01", "02", "08", "10", "99"])
      expect(issues({ condicionVenta: code, medioPago: [{}] })).toEqual([]);
  });
});

describe("calculated summary payment shape", () => {
  it("current summary accepts an absent allocation and keeps the 1–4 bound when present", () => {
    expect(ExactFeCalculatedSchema.parse(calculated()).resumenFactura.medioPago).toBeUndefined();
    expect(
      ExactFeSummarySchema.safeParse(
        calculated([{ tipoMedioPago: "01", totalMedioPago: "113" }]).resumenFactura,
      ).success,
    ).toBe(true);
    const five = Array.from({ length: 5 }, () => ({
      tipoMedioPago: "01" as const,
      totalMedioPago: "22.6",
    }));
    expect(ExactFeSummarySchema.safeParse(calculated(five).resumenFactura).success).toBe(false);
  });

  it("broad decoder still reads a historical zero allocation", () => {
    const zero = calculated([{ tipoMedioPago: "01", totalMedioPago: "0.00000" }]);
    expect(ExactFeCalculatedSchema.parse(zero)).toEqual(zero);
    expect(RetainedExactFeCalculatedSchema.parse(zero)).toEqual(zero);
  });

  it("retained calculated schema re-asserts the historical non-empty allocation", () => {
    for (const medioPago of [undefined, []]) {
      const result = RetainedExactFeCalculatedSchema.safeParse(calculated(medioPago));
      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({
          path: ["resumenFactura", "medioPago"],
          message: "Retained payment allocation is required",
        }),
      ]);
    }
  });
});

describe("public surface", () => {
  it("exports the retained calculated schema but keeps the presence and structure helpers internal", () => {
    expect(shared.RetainedExactFeCalculatedSchema).toBe(RetainedExactFeCalculatedSchema);
    for (const internal of [
      "paymentOptionalFor",
      "requirePaymentPresence",
      "refineExactFeStructure",
      "RetainedExactFePaymentSchema",
      "ExactFeStructureSchema",
    ])
      expect(Object.keys(shared)).not.toContain(internal);
  });
});
