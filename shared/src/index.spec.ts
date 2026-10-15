import { describe, it, expect } from "vitest";
import {
  // Constants
  Environment,
  API_BASE_URLS,
  IDP_TOKEN_URLS,
  CLIENT_IDS,
  DocumentTypeCode,
  DOCUMENT_TYPE_NAMES,
  TaxCode,
  IvaRateCode,
  IVA_RATE_PERCENTAGES,
  IdentificationType,
  IDENTIFICATION_LENGTHS,
  SaleCondition,
  REP_SALE_CONDITIONS,
  PaymentMethod,
  ProvinceCode,
  PROVINCE_NAMES,
  XADES_POLICY_HASH,
  CurrencyCode,
  CURRENCY_CODES,
  ExonerationType,
  UnitOfMeasure,
  UNITS_OF_MEASURE,
  REFERENCE_DOC_TYPES,
  REFERENCE_CODES,
  REP_REFERENCE_CODES,
  DISCOUNT_CODES,
  OTHER_CHARGE_TYPES,
  EXONERATION_INSTITUTIONS,
  COUNTRY_CODE,
  SituationCode,
  MensajeReceptorCode,
  // Types (runtime values)
  HaciendaStatus,
  CLAVE_LENGTH,
} from "./index.js";

describe("@dojocoding/hacienda-shared", () => {
  describe("Environment constants", () => {
    it("should define sandbox and production environments", () => {
      expect(Environment.SANDBOX).toBe("sandbox");
      expect(Environment.PRODUCTION).toBe("production");
    });

    it("should have API base URLs for both environments", () => {
      expect(API_BASE_URLS.sandbox).toContain("recepcion-sandbox");
      expect(API_BASE_URLS.production).toContain("api.comprobanteselectronicos");
      expect(API_BASE_URLS.production).not.toContain("sandbox");
    });

    it("should have IDP token URLs for both environments", () => {
      expect(IDP_TOKEN_URLS.sandbox).toContain("rut-stag");
      expect(IDP_TOKEN_URLS.production).toContain("/rut/");
    });

    it("should have correct client IDs", () => {
      expect(CLIENT_IDS.sandbox).toBe("api-stag");
      expect(CLIENT_IDS.production).toBe("api-prod");
    });

    it("should have Costa Rica country code", () => {
      expect(COUNTRY_CODE).toBe("506");
    });
  });

  describe("Document type codes", () => {
    it("should define all 9 document types", () => {
      expect(DocumentTypeCode.FACTURA_ELECTRONICA).toBe("01");
      expect(DocumentTypeCode.NOTA_DEBITO_ELECTRONICA).toBe("02");
      expect(DocumentTypeCode.NOTA_CREDITO_ELECTRONICA).toBe("03");
      expect(DocumentTypeCode.TIQUETE_ELECTRONICO).toBe("04");
      expect(DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA).toBe("05");
      expect(DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION).toBe("06");
      expect(DocumentTypeCode.RECIBO_ELECTRONICO_PAGO).toBe("07");
      expect(DocumentTypeCode.COMPRA_PAGO).toBe("08");
      expect(DocumentTypeCode.GASTO_VIAJE).toBe("09");
    });

    it("should have human-readable names for all types", () => {
      expect(DOCUMENT_TYPE_NAMES["01"]).toBe("Factura Electrónica");
      expect(DOCUMENT_TYPE_NAMES["04"]).toBe("Tiquete Electrónico");
    });

    it("should define situation codes", () => {
      expect(SituationCode.NORMAL).toBe("1");
      expect(SituationCode.CONTINGENCIA).toBe("2");
      expect(SituationCode.SIN_INTERNET).toBe("3");
    });

    it("should define mensaje receptor codes", () => {
      expect(MensajeReceptorCode.ACEPTADO).toBe("1");
      expect(MensajeReceptorCode.ACEPTADO_PARCIALMENTE).toBe("2");
      expect(MensajeReceptorCode.RECHAZADO).toBe("3");
    });
  });

  describe("Tax codes", () => {
    it("should define IVA tax code", () => {
      expect(TaxCode.IVA).toBe("01");
    });

    it("should define all IVA rate codes", () => {
      expect(IvaRateCode.EXENTO).toBe("01");
      expect(IvaRateCode.GENERAL_13).toBe("08");
    });

    it("should define the new v4.4 IVA rate codes", () => {
      expect(IvaRateCode.REDUCIDA_0_5).toBe("09");
      expect(IvaRateCode.TARIFA_EXENTA).toBe("10");
      expect(IvaRateCode.CERO_SIN_CREDITO).toBe("11");
    });

    it("should map IVA rates to percentages", () => {
      expect(IVA_RATE_PERCENTAGES["01"]).toBe(0);
      expect(IVA_RATE_PERCENTAGES["02"]).toBe(1);
      expect(IVA_RATE_PERCENTAGES["03"]).toBe(2);
      expect(IVA_RATE_PERCENTAGES["04"]).toBe(4);
      expect(IVA_RATE_PERCENTAGES["07"]).toBe(8);
      expect(IVA_RATE_PERCENTAGES["08"]).toBe(13);
      expect(IVA_RATE_PERCENTAGES["09"]).toBe(0.5);
      expect(IVA_RATE_PERCENTAGES["10"]).toBe(0);
      expect(IVA_RATE_PERCENTAGES["11"]).toBe(0);
    });

    it("should define the new v4.4 exoneration types", () => {
      expect(ExonerationType.ZONA_FRANCA).toBe("08");
      expect(ExonerationType.SERVICIOS_COMPLEMENTARIOS_EXPORTACION).toBe("09");
      expect(ExonerationType.CORPORACIONES_MUNICIPALES).toBe("10");
      expect(ExonerationType.DGH_IMPUESTO_LOCAL_CONCRETA).toBe("11");
      expect(ExonerationType.EXONERACION_12).toBe("12");
      expect(ExonerationType.OTROS).toBe("99");
    });
  });

  describe("Units of measure", () => {
    it("should vendor all 101 official v4.4 unit codes", () => {
      expect(UNITS_OF_MEASURE).toHaveLength(101);
    });

    it("should include common units with official casing", () => {
      expect(UNITS_OF_MEASURE).toContain("Sp");
      expect(UNITS_OF_MEASURE).toContain("Unid");
      expect(UNITS_OF_MEASURE).toContain("Kg");
      expect(UNITS_OF_MEASURE).toContain("mL");
      expect(UNITS_OF_MEASURE).not.toContain("kg");
    });

    it("should provide named accessors that exist in the catalog", () => {
      expect(UnitOfMeasure.SERVICIOS_PROFESIONALES).toBe("Sp");
      expect(UnitOfMeasure.UNIDAD).toBe("Unid");
      expect(UnitOfMeasure.KILOGRAMOS).toBe("Kg");
      for (const value of Object.values(UnitOfMeasure)) {
        expect(UNITS_OF_MEASURE).toContain(value);
      }
    });
  });

  describe("Identification types", () => {
    it("should define all 6 identification types (05/06 new in v4.4)", () => {
      expect(IdentificationType.CEDULA_FISICA).toBe("01");
      expect(IdentificationType.CEDULA_JURIDICA).toBe("02");
      expect(IdentificationType.DIMEX).toBe("03");
      expect(IdentificationType.NITE).toBe("04");
      expect(IdentificationType.EXTRANJERO_NO_DOMICILIADO).toBe("05");
      expect(IdentificationType.NO_CONTRIBUYENTE).toBe("06");
    });

    it("should define expected lengths for domestic registry types only", () => {
      expect(IDENTIFICATION_LENGTHS["01"]).toEqual([9]);
      expect(IDENTIFICATION_LENGTHS["02"]).toEqual([10]);
      expect(IDENTIFICATION_LENGTHS["03"]).toEqual([11, 12]);
      expect(IDENTIFICATION_LENGTHS["04"]).toEqual([10]);
      expect(IDENTIFICATION_LENGTHS["05"]).toBeUndefined();
      expect(IDENTIFICATION_LENGTHS["06"]).toBeUndefined();
    });
  });

  describe("Sale conditions and payment methods", () => {
    it("should define sale conditions", () => {
      expect(SaleCondition.CONTADO).toBe("01");
      expect(SaleCondition.CREDITO).toBe("02");
      expect(SaleCondition.VENTA_CREDITO_IVA_90_DIAS).toBe("10");
      expect(SaleCondition.VENTA_MERCANCIA_NO_NACIONALIZADA).toBe("12");
      expect(SaleCondition.VENTA_BIENES_USADOS_NO_CONTRIBUYENTE).toBe("13");
      expect(SaleCondition.ARRENDAMIENTO_OPERATIVO).toBe("14");
      expect(SaleCondition.ARRENDAMIENTO_FINANCIERO).toBe("15");
      expect(SaleCondition.OTROS).toBe("99");
    });

    it("should define the REP-only payment sale conditions (09 and 11)", () => {
      expect(SaleCondition.PAGO_SERVICIO_ESTADO).toBe("09");
      expect(SaleCondition.PAGO_VENTA_CREDITO_IVA_90_DIAS).toBe("11");
      expect(REP_SALE_CONDITIONS).toEqual(["09", "11"]);
    });

    it("should define payment methods", () => {
      expect(PaymentMethod.EFECTIVO).toBe("01");
      expect(PaymentMethod.TARJETA).toBe("02");
      expect(PaymentMethod.TRANSFERENCIA).toBe("04");
    });

    it("should define the new v4.4 payment methods", () => {
      expect(PaymentMethod.SINPE_MOVIL).toBe("06");
      expect(PaymentMethod.PLATAFORMA_DIGITAL).toBe("07");
      expect(PaymentMethod.OTROS).toBe("99");
    });
  });

  describe("Document reference catalogs (v4.4)", () => {
    it("should define referenced document types 01-18 plus 99", () => {
      expect(REFERENCE_DOC_TYPES).toHaveLength(21);
      expect(REFERENCE_DOC_TYPES).toContain("01");
      expect(REFERENCE_DOC_TYPES).toContain("18");
      expect(REFERENCE_DOC_TYPES).toContain("19");
      expect(REFERENCE_DOC_TYPES).toContain("20");
      expect(REFERENCE_DOC_TYPES).toContain("99");
    });

    it("should define reference codes without 03", () => {
      expect(REFERENCE_CODES).toContain("01");
      expect(REFERENCE_CODES).toContain("12");
      expect(REFERENCE_CODES).toContain("16");
      expect(REFERENCE_CODES).toContain("99");
      expect(REFERENCE_CODES).not.toContain("03");
      expect(REFERENCE_CODES).not.toContain("17");
      expect(REP_REFERENCE_CODES).toContain("17");
    });

    it("should define discount codes 01-09 plus 99", () => {
      expect(DISCOUNT_CODES).toHaveLength(10);
      expect(DISCOUNT_CODES).toContain("01");
      expect(DISCOUNT_CODES).toContain("09");
      expect(DISCOUNT_CODES).toContain("99");
    });

    it("should define other-charge types 01-10 plus 99", () => {
      expect(OTHER_CHARGE_TYPES).toHaveLength(11);
      expect(OTHER_CHARGE_TYPES).toContain("01");
      expect(OTHER_CHARGE_TYPES).toContain("10");
      expect(OTHER_CHARGE_TYPES).toContain("99");
    });

    it("should define exoneration institutions 01-12 plus 99", () => {
      expect(EXONERATION_INSTITUTIONS).toHaveLength(13);
      expect(EXONERATION_INSTITUTIONS).toContain("01");
      expect(EXONERATION_INSTITUTIONS).toContain("12");
      expect(EXONERATION_INSTITUTIONS).toContain("99");
    });
  });

  describe("Provinces", () => {
    it("should define all 7 provinces", () => {
      expect(Object.keys(ProvinceCode)).toHaveLength(7);
      expect(ProvinceCode.SAN_JOSE).toBe("1");
      expect(ProvinceCode.LIMON).toBe("7");
    });

    it("should map province names", () => {
      expect(PROVINCE_NAMES["1"]).toBe("San José");
      expect(PROVINCE_NAMES["7"]).toBe("Limón");
    });
  });

  describe("XAdES policy", () => {
    it("should define the policy hash", () => {
      expect(XADES_POLICY_HASH).toBe("Ohixl6upD6av8N7pEvDABhEL6hM=");
    });
  });

  describe("Currency codes", () => {
    it("should define CRC, USD, EUR", () => {
      expect(CurrencyCode.CRC).toBe("CRC");
      expect(CurrencyCode.USD).toBe("USD");
      expect(CurrencyCode.EUR).toBe("EUR");
    });

    it("should vendor the full ISO 4217 catalog from the v4.4 XSD", () => {
      expect(CURRENCY_CODES).toHaveLength(168);
      expect(CURRENCY_CODES).toContain("CRC");
      expect(CURRENCY_CODES).toContain("USD");
      expect(CURRENCY_CODES).toContain("JPY");
      expect(CURRENCY_CODES).not.toContain("ZZZ");
    });
  });

  describe("API types", () => {
    it("should define Hacienda status values", () => {
      expect(HaciendaStatus.RECIBIDO).toBe("recibido");
      expect(HaciendaStatus.ACEPTADO).toBe("aceptado");
      expect(HaciendaStatus.RECHAZADO).toBe("rechazado");
    });
  });

  describe("Clave constants", () => {
    it("should define clave length as 50", () => {
      expect(CLAVE_LENGTH).toBe(50);
    });
  });
});
