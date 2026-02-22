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
  PaymentMethod,
  ProvinceCode,
  PROVINCE_NAMES,
  XADES_POLICY_HASH,
  CurrencyCode,
  COUNTRY_CODE,
  SituationCode,
  MensajeReceptorCode,
  // Types (runtime values)
  HaciendaStatus,
  CLAVE_LENGTH,
} from "./index.js";

describe("@hacienda-cr/shared", () => {
  describe("Environment constants", () => {
    it("should define sandbox and production environments", () => {
      expect(Environment.SANDBOX).toBe("sandbox");
      expect(Environment.PRODUCTION).toBe("production");
    });

    it("should have API base URLs for both environments", () => {
      expect(API_BASE_URLS.sandbox).toContain("api-sandbox");
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

    it("should map IVA rates to percentages", () => {
      expect(IVA_RATE_PERCENTAGES["01"]).toBe(0);
      expect(IVA_RATE_PERCENTAGES["02"]).toBe(1);
      expect(IVA_RATE_PERCENTAGES["03"]).toBe(2);
      expect(IVA_RATE_PERCENTAGES["04"]).toBe(4);
      expect(IVA_RATE_PERCENTAGES["07"]).toBe(8);
      expect(IVA_RATE_PERCENTAGES["08"]).toBe(13);
    });
  });

  describe("Identification types", () => {
    it("should define all 4 identification types", () => {
      expect(IdentificationType.CEDULA_FISICA).toBe("01");
      expect(IdentificationType.CEDULA_JURIDICA).toBe("02");
      expect(IdentificationType.DIMEX).toBe("03");
      expect(IdentificationType.NITE).toBe("04");
    });

    it("should define expected lengths", () => {
      expect(IDENTIFICATION_LENGTHS["01"]).toEqual([9]);
      expect(IDENTIFICATION_LENGTHS["02"]).toEqual([10]);
      expect(IDENTIFICATION_LENGTHS["03"]).toEqual([11, 12]);
      expect(IDENTIFICATION_LENGTHS["04"]).toEqual([10]);
    });
  });

  describe("Sale conditions and payment methods", () => {
    it("should define sale conditions", () => {
      expect(SaleCondition.CONTADO).toBe("01");
      expect(SaleCondition.CREDITO).toBe("02");
    });

    it("should define payment methods", () => {
      expect(PaymentMethod.EFECTIVO).toBe("01");
      expect(PaymentMethod.TARJETA).toBe("02");
      expect(PaymentMethod.TRANSFERENCIA).toBe("04");
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
