import { ExactMoneySchema, ExactQuantitySchema, ExactDiscountInputSchema } from "./exact-fe.js";

describe("public exact ordinary FE decimal schemas", () => {
  it("accepts full supported maxima and rejects number coercion", () => {
    expect(ExactMoneySchema.parse("9999999999999.99999")).toBe("9999999999999.99999");
    expect(ExactQuantitySchema.parse("9999999999999999")).toBe("9999999999999999");
    expect(ExactQuantitySchema.parse("9999999999999.999")).toBe("9999999999999.999");
    expect(ExactMoneySchema.safeParse(1).success).toBe(false);
    expect(ExactQuantitySchema.safeParse(1).success).toBe(false);
  });
  it("safeParse remains bounded and returns failures for malformed decimal strings", () => {
    for (const value of [
      "",
      "NaN",
      "Infinity",
      "1e3",
      "-1",
      "+1",
      "01",
      "0.0001",
      "9".repeat(20000),
    ]) {
      expect(() => ExactQuantitySchema.safeParse(value)).not.toThrow();
      expect(ExactQuantitySchema.safeParse(value).success).toBe(false);
    }
    for (const value of [
      "",
      "NaN",
      "Infinity",
      "1e3",
      "-1",
      "+1",
      "01",
      "100.00001",
      "9".repeat(20000),
    ]) {
      const source = { codigoDescuento: "07", porcentaje: value };
      expect(() => ExactDiscountInputSchema.safeParse(source)).not.toThrow();
      expect(ExactDiscountInputSchema.safeParse(source).success).toBe(false);
    }
  });
  it("requires exclusive amount/percent facts and code99 companion without invented nature", () => {
    expect(
      ExactDiscountInputSchema.safeParse({ codigoDescuento: "07", montoDescuento: "0.00001" })
        .success,
    ).toBe(true);
    expect(
      ExactDiscountInputSchema.safeParse({ codigoDescuento: "07", porcentaje: "1.23456" }).success,
    ).toBe(true);
    expect(
      ExactDiscountInputSchema.safeParse({
        codigoDescuento: "07",
        montoDescuento: "1",
        porcentaje: "1",
      }).success,
    ).toBe(false);
    for (const code of ["01", "02", "03"])
      expect(
        ExactDiscountInputSchema.safeParse({ codigoDescuento: code, montoDescuento: "1" }).success,
      ).toBe(false);
    expect(
      ExactDiscountInputSchema.safeParse({ codigoDescuento: "99", montoDescuento: "1" }).success,
    ).toBe(false);
  });
});

// Exact source-only schema contract; no calculated/user-supplied totals.
import { ExactFeInputSchema, RetainedExactFeInputSchema } from "./exact-fe.js";
const creditFixture = {
  caseCode: "FE-domestic-ordinary-iva13-v1",
  clave: "1".repeat(50),
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2026-10-18T12:00:00-06:00",
  proveedorSistemas: "3101123456",
  codigoActividadEmisor: "620100",
  emisor: {
    nombre: "Emisor sintético",
    identificacion: { tipo: "02", numero: "3101123456" },
    ubicacion: {
      provincia: "1",
      canton: "01",
      distrito: "01",
      otrasSenas: "Dirección sintética local",
    },
    correoElectronico: "issuer@example.test",
  },
  receptor: { nombre: "Receptor sintético", identificacion: { tipo: "02", numero: "3101123457" } },
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "8310100000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "Servicio sintético",
      precioUnitario: "100",
      esServicio: true,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
    },
  ],
  codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
  medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
};
describe("current credit days versus read-only retained source", () => {
  for (const condicionVenta of ["02", "10"]) {
    it(`requires positive1–5digit days for${condicionVenta} without coercing the original lexeme`, () => {
      for (const plazoCredito of [undefined, "", "0", "00000", "100000", "-1", "1.5", "+1", 1])
        expect(
          ExactFeInputSchema.safeParse({ ...creditFixture, condicionVenta, plazoCredito }).success,
        ).toBe(false);
      for (const plazoCredito of ["1", "00001", "00030", "99999"]) {
        const parsed = ExactFeInputSchema.parse({ ...creditFixture, condicionVenta, plazoCredito });
        expect(parsed.plazoCredito).toBe(plazoCredito);
      }
    });
  }
  it("keeps former historical term shape available without treating it as current emission readiness", () => {
    for (const input of [
      { ...creditFixture, condicionVenta: "02", plazoCredito: "00000" },
      { ...creditFixture, condicionVenta: "10" },
    ]) {
      expect(RetainedExactFeInputSchema.parse(input)).toEqual(input);
      expect(ExactFeInputSchema.safeParse(input).success).toBe(false);
    }
    expect(
      RetainedExactFeInputSchema.safeParse({ ...creditFixture, condicionVenta: "02" }).success,
    ).toBe(false);
    expect(
      RetainedExactFeInputSchema.safeParse({ ...creditFixture, plazoCredito: "100000" }).success,
    ).toBe(false);
  });
  it("does not make other valid sale conditions require credit terms, but refuses any explicit zero term", () => {
    for (const condicionVenta of ["01", "03", "08", "99"]) {
      const input = {
        ...creditFixture,
        condicionVenta,
        ...(condicionVenta === "99" ? { condicionVentaOtros: "Contrato sintético explícito" } : {}),
      };
      expect(ExactFeInputSchema.safeParse(input).success).toBe(true);
      expect(ExactFeInputSchema.safeParse({ ...input, plazoCredito: "0" }).success).toBe(false);
    }
  });
});
