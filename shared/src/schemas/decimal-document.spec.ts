import { describe, expect, it } from "vitest";
import {
  DecimalDocumentCalculatedSchema,
  DecimalDocumentInputSchema,
  type DecimalDocumentInput,
} from "./decimal-document.js";
import { DecimalMensajeReceptorSchema } from "./decimal-recipient.js";

const CLAVE = "50601012500310123456700100001010000000001199999999";
const EMISOR = {
  nombre: "Empresa Test",
  identificacion: { tipo: "02" as const, numero: "3101234567" },
  ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "Direccion" },
  correoElectronico: "test@example.com",
};
const RECEPTOR = {
  nombre: "Cliente Test",
  identificacion: { tipo: "02" as const, numero: "3109876543" },
  correoElectronico: "cliente@example.com",
};
const LINE = {
  numeroLinea: 1,
  codigoCabys: "4321000000000",
  cantidad: "1",
  unidadMedida: "Sp" as const,
  detalle: "Servicio",
  precioUnitario: "100",
  impuesto: [{ codigo: "01" as const, codigoTarifaIVA: "08" as const, tarifa: "13" }],
  esServicio: true,
};
const REFERENCE = {
  tipoDoc: "01" as const,
  fechaEmision: "2025-07-27T10:30:00-06:00",
  codigo: "01" as const,
  razon: "Referencia",
};

function base(tipoDocumento: DecimalDocumentInput["tipoDocumento"]): Record<string, unknown> {
  return {
    clave: CLAVE,
    proveedorSistemas: "3101234567",
    numeroConsecutivo: `00100001${tipoDocumento}0000000001`,
    fechaEmision: "2025-07-27T10:30:00-06:00",
    emisor: EMISOR,
    receptor: RECEPTOR,
    condicionVenta: "01",
    detalleServicio: [LINE],
    codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
    tipoDocumento,
  };
}

describe("decimal document schemas", () => {
  it("accepts all seven document types", () => {
    const cases: [DecimalDocumentInput["tipoDocumento"], Record<string, unknown>][] = [
      ["01", { ...base("01"), codigoActividadEmisor: "620100" }],
      ["04", { ...base("04"), codigoActividadEmisor: "620100" }],
      [
        "02",
        { ...base("02"), codigoActividadEmisor: "620100", informacionReferencia: [REFERENCE] },
      ],
      [
        "03",
        { ...base("03"), codigoActividadEmisor: "620100", informacionReferencia: [REFERENCE] },
      ],
      [
        "08",
        {
          ...base("08"),
          codigoActividadEmisor: "620100",
          codigoActividadReceptor: "620100",
          informacionReferencia: [REFERENCE],
        },
      ],
      [
        "09",
        {
          ...base("09"),
          codigoActividadEmisor: "620100",
          detalleServicio: [
            {
              ...LINE,
              partidaArancelaria: "123456789012",
              impuesto: [{ codigo: "01", codigoTarifaIVA: "01", tarifa: "0" }],
            },
          ],
          codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: "530.5" },
          medioPago: [{ tipoMedioPago: "04", totalMedioPago: "100" }],
        },
      ],
      [
        "10",
        {
          clave: CLAVE,
          tipoDocumento: "10",
          proveedorSistemas: "3101234567",
          numeroConsecutivo: "00100001100000000001",
          fechaEmision: "2025-07-27T10:30:00-06:00",
          emisor: EMISOR,
          receptor: RECEPTOR,
          condicionVenta: "11",
          detalleServicio: [
            {
              numeroLinea: 1,
              codigoCabys: "4321000000000",
              detalle: "Pago",
              montoTotal: "100",
              subTotal: "100",
              impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13", monto: "13" }],
              impuestoNeto: "13",
              montoTotalLinea: "113",
            },
          ],
          codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
          medioPago: [{ tipoMedioPago: "04", totalMedioPago: "113" }],
          informacionReferencia: [REFERENCE],
        },
      ],
    ];
    for (const [, input] of cases) {
      expect(DecimalDocumentInputSchema.safeParse(input).success).toBe(true);
    }
  });

  it("rejects missing or unknown document types", () => {
    const input = { ...base("01"), codigoActividadEmisor: "620100" };
    const { tipoDocumento: _ignored, ...without } = input;
    expect(DecimalDocumentInputSchema.safeParse(without).success).toBe(false);
    expect(DecimalDocumentInputSchema.safeParse({ ...input, tipoDocumento: "99" }).success).toBe(
      false,
    );
  });

  it("rejects fields from another document family", () => {
    const tiquete = { ...base("04"), codigoActividadEmisor: "620100", partidaArancelaria: "123" };
    expect(DecimalDocumentInputSchema.safeParse(tiquete).success).toBe(false);
  });

  it("rejects injected derived totals", () => {
    const input = { ...base("01"), codigoActividadEmisor: "620100", totalComprobante: "113" };
    expect(DecimalDocumentInputSchema.safeParse(input).success).toBe(false);
    const lineInput = {
      ...base("01"),
      codigoActividadEmisor: "620100",
      detalleServicio: [
        { ...LINE, montoTotal: "100", subTotal: "100", impuestoNeto: "13", montoTotalLinea: "113" },
      ],
    };
    expect(DecimalDocumentInputSchema.safeParse(lineInput).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const input = { ...base("01"), codigoActividadEmisor: "620100", foo: "bar" };
    expect(DecimalDocumentInputSchema.safeParse(input).success).toBe(false);
  });

  it("round-trips through JSON and structuredClone", () => {
    const input = { ...base("01"), codigoActividadEmisor: "620100" };
    const parsed = DecimalDocumentInputSchema.parse(input);
    const cloned = structuredClone(parsed);
    expect(cloned).toEqual(parsed);
    expect(DecimalDocumentInputSchema.safeParse(JSON.parse(JSON.stringify(parsed))).success).toBe(
      true,
    );
    const calculated = DecimalDocumentCalculatedSchema.safeParse(parsed);
    // A source is not a calculated document.
    expect(calculated.success).toBe(false);
  });

  it("validates MensajeReceptor and rejects incoherent totals", () => {
    const valid = {
      clave: CLAVE,
      numeroCedulaEmisor: "3101234567",
      fechaEmisionDoc: "2025-07-27T10:30:00-06:00",
      mensaje: "1",
      montoTotalImpuesto: "13",
      totalFactura: "113",
      numeroCedulaReceptor: "3109876543",
      numeroConsecutivoReceptor: "00100001010000000001",
    };
    expect(DecimalMensajeReceptorSchema.safeParse(valid).success).toBe(true);
    expect(
      DecimalMensajeReceptorSchema.safeParse({ ...valid, montoTotalImpuestoAcreditar: "14" })
        .success,
    ).toBe(false);
    expect(
      DecimalMensajeReceptorSchema.safeParse({ ...valid, montoTotalDeGastoAplicable: "114" })
        .success,
    ).toBe(false);
  });
});
