import { describe, expect, it } from "vitest";
import {
  DecimalDocumentCalculatedSchema,
  DecimalDocumentInputSchema,
  DecimalMensajeReceptorSchema,
  type DecimalDocumentInput,
  type DecimalMensajeReceptor,
} from "@dojocoding/hacienda-shared";
import { validateAgainstXsd, xmllintAvailable } from "../__testing__/xsd.js";
import { buildClave } from "../clave/build-clave.js";
import { Situation, type DocumentType } from "../clave/types.js";
import {
  buildDecimalDocumentXml,
  buildDecimalMensajeReceptorXml,
} from "./decimal-document-builder.js";
import { calculateDecimalDocument } from "../tax/decimal-document.js";

const CLAVE = "50601012500310123456700100001010000000001199999999";
function claveFor(
  tipoDocumento: DecimalDocumentInput["tipoDocumento"],
  taxpayerId = "3101234567",
): string {
  return buildClave({
    date: new Date("2025-07-27T10:30:00-06:00"),
    taxpayerId,
    branch: "001",
    pos: "00001",
    documentType: tipoDocumento as DocumentType,
    sequence: 1,
    situation: Situation.NORMAL,
    securityCode: "99999999",
  });
}
function consecutiveFor(tipoDocumento: DecimalDocumentInput["tipoDocumento"]): string {
  return `00100001${tipoDocumento}0000000001`;
}
const REFERENCE = {
  tipoDoc: "01" as const,
  numero: CLAVE,
  fechaEmision: "2025-07-27T10:30:00-06:00",
  codigo: "01" as const,
  razon: "Referencia para prueba",
};
const EMISOR = {
  nombre: "Empresa Exacta S.A.",
  identificacion: { tipo: "02" as const, numero: "3101234567" },
  ubicacion: {
    provincia: "1",
    canton: "01",
    distrito: "01",
    otrasSenas: "100m norte del parque",
  },
  correoElectronico: "facturacion@example.com",
};
const RECEPTOR = {
  nombre: "Cliente Exacto S.R.L.",
  identificacion: { tipo: "02" as const, numero: "3109876543" },
  correoElectronico: "compras@example.com",
};
const LINE = {
  numeroLinea: 1,
  codigoCabys: "4321000000000",
  cantidad: "1",
  unidadMedida: "Sp" as const,
  detalle: "Servicio de consultoria",
  precioUnitario: "100",
  impuesto: [{ codigo: "01" as const, codigoTarifaIVA: "08" as const, tarifa: "13" }],
  esServicio: true,
};
const CURRENCY = { codigoMoneda: "CRC" as const, tipoCambio: "1" };
const PAYMENT = { tipoMedioPago: "01" as const, totalMedioPago: "113" };

function source(tipoDocumento: DecimalDocumentInput["tipoDocumento"]): DecimalDocumentInput {
  const common = {
    clave: claveFor(tipoDocumento, tipoDocumento === "08" ? "3109876543" : "3101234567"),
    proveedorSistemas: "3101234567",
    numeroConsecutivo: consecutiveFor(tipoDocumento),
    fechaEmision: "2025-07-27T10:30:00-06:00",
    emisor: EMISOR,
    receptor: RECEPTOR,
    condicionVenta: "01" as const,
    detalleServicio: [LINE],
    codigoTipoMoneda: CURRENCY,
    medioPago: [PAYMENT],
  };
  switch (tipoDocumento) {
    case "01":
      return { ...common, tipoDocumento, codigoActividadEmisor: "620100" };
    case "02":
    case "03":
      return {
        ...common,
        tipoDocumento,
        codigoActividadEmisor: "620100",
        informacionReferencia: [REFERENCE],
      };
    case "04":
      return { ...common, tipoDocumento, codigoActividadEmisor: "620100" };
    case "08":
      return {
        ...common,
        tipoDocumento,
        codigoActividadEmisor: "620100",
        codigoActividadReceptor: "620100",
        informacionReferencia: [REFERENCE],
      };
    case "09":
      return {
        ...common,
        tipoDocumento,
        codigoActividadEmisor: "620100",
        codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: "530.5" },
        medioPago: [{ tipoMedioPago: "04", totalMedioPago: "100" }],
        detalleServicio: [
          {
            ...LINE,
            partidaArancelaria: "123456789012",
            impuesto: [{ codigo: "01", codigoTarifaIVA: "01", tarifa: "0" }],
          },
        ],
      };
    case "10":
      return {
        clave: claveFor(tipoDocumento),
        tipoDocumento,
        proveedorSistemas: "3101234567",
        numeroConsecutivo: consecutiveFor(tipoDocumento),
        fechaEmision: "2025-07-27T10:30:00-06:00",
        emisor: EMISOR,
        receptor: RECEPTOR,
        condicionVenta: "11",
        detalleServicio: [
          {
            numeroLinea: 1,
            codigoCabys: "4321000000000",
            detalle: "Pago de factura",
            montoTotal: "100",
            subTotal: "100",
            impuesto: [
              {
                codigo: "01",
                codigoTarifaIVA: "08",
                tarifa: "13",
                monto: "13",
              },
            ],
            impuestoNeto: "13",
            montoTotalLinea: "113",
          },
        ],
        codigoTipoMoneda: CURRENCY,
        medioPago: [PAYMENT],
        informacionReferencia: [REFERENCE],
      };
  }
}

const XSD_BY_ROOT: Record<DecimalDocumentInput["tipoDocumento"], string> = {
  "01": "FacturaElectronica_V4.4.xsd",
  "02": "NotaDebitoElectronica_V4.4.xsd",
  "03": "NotaCreditoElectronica_V4.4.xsd",
  "04": "TiqueteElectronico_V4.4.xsd",
  "08": "FacturaElectronicaCompra_V4.4.xsd",
  "09": "FacturaElectronicaExportacion_V4.4.xsd",
  "10": "ReciboElectronicoPago_V4.4.xsd",
};

describe("decimal document XML builder", () => {
  for (const tipoDocumento of Object.keys(XSD_BY_ROOT) as DecimalDocumentInput["tipoDocumento"][]) {
    it(`builds a schema-valid ${tipoDocumento} with fixed five-decimal money`, () => {
      const input = source(tipoDocumento);
      const xml = buildDecimalDocumentXml(input);
      expect(xml).toContain("TotalComprobante");
      expect(xml).toMatch(/<TotalComprobante>\d+\.\d{5}<\/TotalComprobante>/);
      if (xmllintAvailable()) {
        const result = validateAgainstXsd(xml, XSD_BY_ROOT[tipoDocumento], {
          allowMissingSignature: true,
        });
        expect(result.errors).toBe("");
        expect(result.valid).toBe(true);
      }
    });
  }

  it("uses fixed five decimals while calculated JSON stays canonical", () => {
    const calculated = calculateDecimalDocument(source("01"));
    expect(calculated.resumenFactura.totalComprobante).toBe("113");
    const xml = buildDecimalDocumentXml(source("01"));
    expect(xml).toContain("<TotalComprobante>113.00000</TotalComprobante>");
    expect(xml).toContain("<MontoTotal>100.00000</MontoTotal>");
    expect(xml).toContain("<ImpuestoNeto>13.00000</ImpuestoNeto>");
  });

  it("round-trips source JSON and produces identical XML", () => {
    const input = source("01");
    const reparsed = DecimalDocumentInputSchema.parse(JSON.parse(JSON.stringify(input)));
    expect(buildDecimalDocumentXml(reparsed)).toBe(buildDecimalDocumentXml(input));
    const calculated = calculateDecimalDocument(input);
    const cloned = structuredClone(calculated);
    expect(cloned).toEqual(calculated);
    expect(JSON.parse(JSON.stringify(calculated))).toEqual(calculated);
    expect(DecimalDocumentCalculatedSchema.safeParse(calculated).success).toBe(true);
  });

  it("rejects an incoherent identity before emitting XML", () => {
    const input = source("01");
    const wrong = {
      ...input,
      clave: claveFor("01", "3100000000"),
    };
    expect(() => buildDecimalDocumentXml(wrong)).toThrow(/identity|clave|emisor/i);
  });

  it("rejects an unknown field instead of dropping it", () => {
    const input = { ...source("01"), totalComprobante: "113" };
    expect(() => buildDecimalDocumentXml(input as DecimalDocumentInput)).toThrow();
  });

  it("rejects an out-of-bound amount at the schema boundary", () => {
    const input = source("01");
    const wrong = {
      ...input,
      detalleServicio: [{ ...LINE, precioUnitario: "10000000000000" }],
    };
    expect(() => buildDecimalDocumentXml(wrong as DecimalDocumentInput)).toThrow();
  });

  it("builds a schema-valid Mensaje Receptor and rejects incoherent totals", () => {
    const input: DecimalMensajeReceptor = {
      clave: claveFor("01"),
      numeroCedulaEmisor: "3101234567",
      fechaEmisionDoc: "2025-07-27T10:30:00-06:00",
      mensaje: "1",
      montoTotalImpuesto: "13",
      totalFactura: "113",
      numeroCedulaReceptor: "3109876543",
      numeroConsecutivoReceptor: "00100001010000000001",
    };
    const parsed = DecimalMensajeReceptorSchema.parse(input);
    const xml = buildDecimalMensajeReceptorXml(parsed);
    expect(xml).toContain("<TotalFactura>113.00000</TotalFactura>");
    expect(xml).toContain("<MontoTotalImpuesto>13.00000</MontoTotalImpuesto>");
    if (xmllintAvailable()) {
      const result = validateAgainstXsd(xml, "MensajeReceptor_V4.4.xsd", {
        allowMissingSignature: true,
      });
      expect(result.errors).toBe("");
    }
    expect(
      DecimalMensajeReceptorSchema.safeParse({
        ...input,
        montoTotalImpuestoAcreditar: "14",
      }).success,
    ).toBe(false);
    expect(
      DecimalMensajeReceptorSchema.safeParse({
        ...input,
        montoTotalDeGastoAplicable: "114",
      }).success,
    ).toBe(false);
  });
});
