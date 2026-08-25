/**
 * Tests for tax calculation utilities (Hacienda v4.4 semantics).
 */

import { describe, it, expect } from "vitest";
import { round5, calculateLineItemTotals, calculateInvoiceSummary } from "./calculator.js";
import type { LineItemInput } from "./calculator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely get the first tax from a calculated line item.
 * Fails the test if not available.
 */
function getFirstTax(result: ReturnType<typeof calculateLineItemTotals>) {
  expect(result.impuesto).toBeDefined();
  const taxes = result.impuesto ?? [];
  expect(taxes.length).toBeGreaterThan(0);
  const first = taxes[0];
  expect(first).toBeDefined();
  return first as NonNullable<typeof first>;
}

// ---------------------------------------------------------------------------
// round5
// ---------------------------------------------------------------------------

describe("round5", () => {
  it("should round to 5 decimal places", () => {
    expect(round5(1.123456789)).toBe(1.12346);
  });

  it("should preserve values with fewer than 5 decimals", () => {
    expect(round5(100)).toBe(100);
    expect(round5(1.5)).toBe(1.5);
    expect(round5(0.12345)).toBe(0.12345);
  });

  it("should round 0.5 up", () => {
    expect(round5(1.000005)).toBe(1.00001);
  });

  it("should handle zero", () => {
    expect(round5(0)).toBe(0);
  });

  it("should handle negative numbers", () => {
    expect(round5(-1.123456789)).toBe(-1.12346);
  });
});

// ---------------------------------------------------------------------------
// calculateLineItemTotals
// ---------------------------------------------------------------------------

describe("calculateLineItemTotals", () => {
  describe("basic calculations", () => {
    it("should calculate montoTotal = cantidad * precioUnitario", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 3,
        unidadMedida: "Unid",
        detalle: "Test product",
        precioUnitario: 1000,
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotal).toBe(3000);
    });

    it("should set subTotal = montoTotal when no discounts", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Test",
        precioUnitario: 5000,
      };

      const result = calculateLineItemTotals(item);
      expect(result.subTotal).toBe(5000);
    });

    it("should always set baseImponible = subTotal", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 2,
        unidadMedida: "Unid",
        detalle: "Test",
        precioUnitario: 5000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      expect(result.baseImponible).toBe(10000);
    });

    it("should default esServicio to false", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Test",
        precioUnitario: 100,
      };

      const result = calculateLineItemTotals(item);
      expect(result.esServicio).toBe(false);
    });

    it("should preserve esServicio = true", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Service",
        precioUnitario: 100,
        esServicio: true,
      };

      const result = calculateLineItemTotals(item);
      expect(result.esServicio).toBe(true);
    });
  });

  describe("synthetic exempt tax (v4.4: every line has at least one Impuesto)", () => {
    it("should add a synthetic exempt IVA entry when no taxes are given", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Untaxed item",
        precioUnitario: 10000,
      };

      const result = calculateLineItemTotals(item);
      expect(result.impuesto).toHaveLength(1);
      expect(result.impuesto[0]).toEqual({
        codigo: "01",
        codigoTarifaIVA: "01",
        tarifa: 0,
        monto: 0,
      });
      expect(result.impuestoNeto).toBe(0);
      expect(result.baseImponible).toBe(10000);
      expect(result.montoTotalLinea).toBe(10000);
    });

    it("should add the synthetic entry for an empty impuesto array", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Untaxed item",
        precioUnitario: 2500,
        impuesto: [],
      };

      const result = calculateLineItemTotals(item);
      expect(result.impuesto).toHaveLength(1);
      expect(result.impuesto[0]?.codigo).toBe("01");
      expect(result.impuesto[0]?.codigoTarifaIVA).toBe("01");
      expect(result.impuesto[0]?.tarifa).toBe(0);
      expect(result.impuesto[0]?.monto).toBe(0);
      expect(result.impuestoNeto).toBe(0);
    });
  });

  describe("IVA calculation", () => {
    it("should calculate 13% IVA correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Consulting",
        precioUnitario: 100000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(13000);
      expect(tax.codigoTarifaIVA).toBe("08");
      expect(result.impuestoNeto).toBe(13000);
      expect(result.montoTotalLinea).toBe(113000);
    });

    it("should calculate 4% reduced IVA correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "1234500000000",
        cantidad: 2,
        unidadMedida: "Unid",
        detalle: "Basic goods",
        precioUnitario: 5000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "04", tarifa: 4 }],
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotal).toBe(10000);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(400);
      expect(result.impuestoNeto).toBe(400);
      expect(result.montoTotalLinea).toBe(10400);
    });

    it("should calculate 1% reduced IVA correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "6789000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Medicine",
        precioUnitario: 15000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "02", tarifa: 1 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(150);
      expect(result.impuestoNeto).toBe(150);
      expect(result.montoTotalLinea).toBe(15150);
    });

    it("should calculate 2% IVA correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "1111000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "2% item",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "03", tarifa: 2 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(200);
    });

    it("should calculate 8% transitional IVA correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "2222000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "8% item",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "07", tarifa: 8 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(800);
    });

    it("should handle 0% exempt correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "3333000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Exempt item",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "01", tarifa: 0 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(0);
      expect(result.impuestoNeto).toBe(0);
      expect(result.montoTotalLinea).toBe(10000);
    });

    it("should omit codigoTarifaIVA on the output for non-IVA taxes", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Selectivo consumo item",
        precioUnitario: 10000,
        impuesto: [{ codigo: "02", tarifa: 10 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(1000);
      expect(tax).not.toHaveProperty("codigoTarifaIVA");
    });
  });

  describe("discounts", () => {
    it("should subtract discounts from montoTotal", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 10,
        unidadMedida: "Unid",
        detalle: "Discounted product",
        precioUnitario: 5000,
        descuento: [
          {
            montoDescuento: 5000,
            codigoDescuento: "01",
            naturalezaDescuento: "Volume discount",
          },
        ],
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotal).toBe(50000);
      expect(result.subTotal).toBe(45000);
      expect(result.baseImponible).toBe(45000);
      // Tax on 45000: 45000 * 0.13 = 5850
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(5850);
      expect(result.montoTotalLinea).toBe(50850);
    });

    it("should handle multiple discounts", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Multi-discount",
        precioUnitario: 10000,
        descuento: [
          { montoDescuento: 1000, codigoDescuento: "01", naturalezaDescuento: "Discount A" },
          { montoDescuento: 500, codigoDescuento: "02", naturalezaDescuento: "Discount B" },
        ],
      };

      const result = calculateLineItemTotals(item);
      expect(result.subTotal).toBe(8500);
    });
  });

  describe("exonerations (v4.4: tarifaExonerada in tariff points)", () => {
    it("should calculate a full exoneration (tarifaExonerada = tarifa)", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Exonerated service",
        precioUnitario: 200000,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "AL-001-2025",
              nombreInstitucion: "02",
              fechaEmision: "2025-01-15T00:00:00-06:00",
              tarifaExonerada: 13,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      // Full tax: 200000 * 13 / 100 = 26000 (still recorded on the tax)
      expect(tax.monto).toBe(26000);
      // Exonerated amount: 200000 * 13 / 100 = 26000
      expect(tax.exoneracion).toBeDefined();
      expect(tax.exoneracion?.montoExoneracion).toBe(26000);
      expect(tax.exoneracion?.tarifaExonerada).toBe(13);
      // Net tax: max(0, 26000 - 26000) = 0
      expect(result.impuestoNeto).toBe(0);
      expect(result.montoTotalLinea).toBe(200000);
    });

    it("should handle partial exoneration (6.5 of 13 points)", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Partially exonerated",
        precioUnitario: 100000,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "04",
              numeroDocumento: "DGH-002-2025",
              nombreInstitucion: "04",
              fechaEmision: "2025-01-01T00:00:00-06:00",
              tarifaExonerada: 6.5,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      // Full tax: 100000 * 13 / 100 = 13000
      expect(tax.monto).toBe(13000);
      // Exonerated: 100000 * 6.5 / 100 = 6500
      expect(tax.exoneracion).toBeDefined();
      expect(tax.exoneracion?.montoExoneracion).toBe(6500);
      expect(tax.exoneracion?.tarifaExonerada).toBe(6.5);
      // Net tax: 13000 - 6500 = 6500
      expect(result.impuestoNeto).toBe(6500);
      expect(result.montoTotalLinea).toBe(106500);
    });

    it("should handle exoneration of 4 points on a 13% tariff", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "4-point exoneration",
        precioUnitario: 130000,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "01",
              numeroDocumento: "EX-004-2025",
              nombreInstitucion: "01",
              fechaEmision: "2025-02-01T00:00:00-06:00",
              tarifaExonerada: 4,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      // Full tax: 130000 * 13 / 100 = 16900
      expect(tax.monto).toBe(16900);
      // Exonerated: 130000 * 4 / 100 = 5200
      expect(tax.exoneracion?.montoExoneracion).toBe(5200);
      // Net tax: 16900 - 5200 = 11700
      expect(result.impuestoNeto).toBe(11700);
      expect(result.montoTotalLinea).toBe(141700);
    });

    it("should clamp net tax at 0 when tarifaExonerada exceeds tarifa", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Over-exonerated",
        precioUnitario: 100000,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "04",
            tarifa: 4,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "EX-OVER-2025",
              nombreInstitucion: "03",
              fechaEmision: "2025-03-01T00:00:00-06:00",
              tarifaExonerada: 13,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(4000);
      expect(tax.exoneracion?.montoExoneracion).toBe(13000);
      // Net tax: max(0, 4000 - 13000) = 0
      expect(result.impuestoNeto).toBe(0);
      expect(result.montoTotalLinea).toBe(100000);
    });

    it("should carry the exoneration document fields through to the output", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Doc passthrough",
        precioUnitario: 10000,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "AL-777-2025",
              nombreInstitucion: "99",
              fechaEmision: "2025-06-01T00:00:00-06:00",
              tarifaExonerada: 13,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.exoneracion?.tipoDocumento).toBe("03");
      expect(tax.exoneracion?.numeroDocumento).toBe("AL-777-2025");
      expect(tax.exoneracion?.nombreInstitucion).toBe("99");
      expect(tax.exoneracion?.fechaEmision).toBe("2025-06-01T00:00:00-06:00");
    });
  });

  describe("commercial codes", () => {
    it("should pass through codigoComercial", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        codigoComercial: [{ tipo: "01", codigo: "SKU-001" }],
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Product with code",
        precioUnitario: 1000,
      };

      const result = calculateLineItemTotals(item);
      expect(result.codigoComercial).toBeDefined();
      const codes = result.codigoComercial ?? [];
      expect(codes.length).toBe(1);
      expect(codes[0]?.tipo).toBe("01");
      expect(codes[0]?.codigo).toBe("SKU-001");
    });
  });

  describe("precision", () => {
    it("should handle fractional quantities", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 2.5,
        unidadMedida: "kg",
        detalle: "Weighted product",
        precioUnitario: 3333.33,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotal).toBe(8333.325);
      const tax = getFirstTax(result);
      // Tax: 8333.325 * 0.13 = 1083.33225
      expect(tax.monto).toBe(1083.33225);
    });

    it("should round the exonerated amount to 5 decimals", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Rounded exoneration",
        precioUnitario: 3333.33333,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "EX-RND-2025",
              nombreInstitucion: "05",
              fechaEmision: "2025-04-01T00:00:00-06:00",
              tarifaExonerada: 6.5,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      // Full tax: round5(3333.33333 * 13 / 100) = round5(433.3333329) = 433.33333
      expect(tax.monto).toBe(433.33333);
      // Exonerated: round5(3333.33333 * 6.5 / 100) = round5(216.66666645) = 216.66667
      expect(tax.exoneracion?.montoExoneracion).toBe(216.66667);
      // Net: round5(433.33333 - 216.66667) = 216.66666
      expect(result.impuestoNeto).toBe(216.66666);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateInvoiceSummary
// ---------------------------------------------------------------------------

describe("calculateInvoiceSummary", () => {
  it("should calculate summary for a single taxed service", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Service",
        precioUnitario: 100000,
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(100000);
    expect(summary.totalServExentos).toBe(0);
    expect(summary.totalMercanciasGravadas).toBe(0);
    expect(summary.totalMercanciasExentas).toBe(0);
    expect(summary.totalGravado).toBe(100000);
    expect(summary.totalExento).toBe(0);
    expect(summary.totalVenta).toBe(100000);
    expect(summary.totalDescuentos).toBe(0);
    expect(summary.totalVentaNeta).toBe(100000);
    expect(summary.totalImpuesto).toBe(13000);
    expect(summary.totalComprobante).toBe(113000);
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 13000 },
    ]);
  });

  it("should separate services from merchandise", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Service",
        precioUnitario: 50000,
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "1234500000000",
        cantidad: 2,
        unidadMedida: "Unid",
        detalle: "Product",
        precioUnitario: 10000,
        esServicio: false,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(50000);
    expect(summary.totalMercanciasGravadas).toBe(20000);
    expect(summary.totalGravado).toBe(70000);
    expect(summary.totalImpuesto).toBe(9100); // 6500 + 2600
    expect(summary.totalComprobante).toBe(79100);
  });

  it("should handle exempt items (no tax input, synthetic exempt entry)", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Exempt service",
        precioUnitario: 30000,
        esServicio: true,
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(0);
    expect(summary.totalServExentos).toBe(30000);
    expect(summary.totalExento).toBe(30000);
    expect(summary.totalImpuesto).toBe(0);
    expect(summary.totalComprobante).toBe(30000);
    // The synthetic exempt entry appears in the breakdown with a 0 total
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "01", totalMontoImpuesto: 0 },
    ]);
  });

  it("should handle fully exonerated items", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Exonerated",
        precioUnitario: 100000,
        esServicio: true,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "EX-001",
              nombreInstitucion: "02",
              fechaEmision: "2025-01-01",
              tarifaExonerada: 13,
            },
          },
        ],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(0);
    expect(summary.totalServExonerado).toBe(100000);
    expect(summary.totalExonerado).toBe(100000);
    expect(summary.totalImpuesto).toBe(0);
    expect(summary.totalComprobante).toBe(100000);
    // Breakdown is net of exoneration: 13000 - 13000 = 0
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 0 },
    ]);
  });

  it("should split base between gravado and exonerado for partial exoneration", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Half exonerated",
        precioUnitario: 100000,
        esServicio: true,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "04",
              numeroDocumento: "EX-050",
              nombreInstitucion: "04",
              fechaEmision: "2025-01-01",
              tarifaExonerada: 6.5,
            },
          },
        ],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    // Exonerated base portion = subTotal * tarifaExonerada / tarifa
    //                         = 100000 * 6.5 / 13 = 50000
    expect(summary.totalServExonerado).toBe(50000);
    expect(summary.totalServGravados).toBe(50000);
    expect(summary.totalGravado).toBe(50000);
    expect(summary.totalExonerado).toBe(50000);
    expect(summary.totalVenta).toBe(100000);
    // Net tax: 13000 - 6500
    expect(summary.totalImpuesto).toBe(6500);
    expect(summary.totalComprobante).toBe(106500);
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 6500 },
    ]);
  });

  it("should split base for a 4-of-13-points exoneration on merchandise", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Partially exonerated goods",
        precioUnitario: 130000,
        esServicio: false,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "01",
              numeroDocumento: "EX-004",
              nombreInstitucion: "01",
              fechaEmision: "2025-02-01",
              tarifaExonerada: 4,
            },
          },
        ],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    // Exonerated base = 130000 * 4 / 13 = 40000
    expect(summary.totalMercExonerada).toBe(40000);
    expect(summary.totalMercanciasGravadas).toBe(90000);
    expect(summary.totalVenta).toBe(130000);
    // Net tax: 16900 - 5200 = 11700
    expect(summary.totalImpuesto).toBe(11700);
    expect(summary.totalComprobante).toBe(141700);
  });

  it("should handle discounts in the summary", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 10,
        unidadMedida: "Unid",
        detalle: "Discounted product",
        precioUnitario: 5000,
        descuento: [{ montoDescuento: 5000, codigoDescuento: "01", naturalezaDescuento: "Volume" }],
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalMercanciasGravadas).toBe(45000);
    expect(summary.totalDescuentos).toBe(5000);
    expect(summary.totalVenta).toBe(45000);
    expect(summary.totalVentaNeta).toBe(40000);
    // Tax on 45000 subtotal: 5850
    expect(summary.totalImpuesto).toBe(5850);
    expect(summary.totalComprobante).toBe(45850);
  });

  it("should sum discounts across multiple lines", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Product A",
        precioUnitario: 10000,
        descuento: [
          { montoDescuento: 1000, codigoDescuento: "01", naturalezaDescuento: "Promo A" },
          { montoDescuento: 500, codigoDescuento: "02", naturalezaDescuento: "Promo B" },
        ],
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Product B",
        precioUnitario: 20000,
        descuento: [
          { montoDescuento: 2000, codigoDescuento: "01", naturalezaDescuento: "Promo C" },
        ],
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalDescuentos).toBe(3500);
    // Subtotals: 8500 + 18000 = 26500
    expect(summary.totalVenta).toBe(26500);
    expect(summary.totalVentaNeta).toBe(23000);
    // Taxes: 1105 + 2340 = 3445
    expect(summary.totalImpuesto).toBe(3445);
    expect(summary.totalComprobante).toBe(26445);
  });

  it("should include otros cargos in totalComprobante", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Product",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items, 500);
    expect(summary.totalComprobante).toBe(11800); // 10000 + 1300 + 500
  });

  it("should handle mixed items correctly", () => {
    const items = [
      // Taxed service
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Taxed service",
        precioUnitario: 100000,
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      // Exempt merchandise (synthetic exempt tax)
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "1234500000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Exempt product",
        precioUnitario: 5000,
        esServicio: false,
      }),
      // Taxed merchandise at 4%
      calculateLineItemTotals({
        numeroLinea: 3,
        codigoCabys: "6789000000000",
        cantidad: 3,
        unidadMedida: "Unid",
        detalle: "Reduced rate product",
        precioUnitario: 2000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "04", tarifa: 4 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(100000);
    expect(summary.totalServExentos).toBe(0);
    expect(summary.totalMercanciasGravadas).toBe(6000);
    expect(summary.totalMercanciasExentas).toBe(5000);
    expect(summary.totalGravado).toBe(106000);
    expect(summary.totalExento).toBe(5000);
    expect(summary.totalVenta).toBe(111000);
    expect(summary.totalImpuesto).toBe(13240); // 13000 + 240
    expect(summary.totalComprobante).toBe(124240);
    // One entry per (codigo, codigoTarifaIVA), in first-appearance order
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 13000 },
      { codigo: "01", codigoTarifaIVA: "01", totalMontoImpuesto: 0 },
      { codigo: "01", codigoTarifaIVA: "04", totalMontoImpuesto: 240 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// calculateInvoiceSummary – totalDesgloseImpuesto (v4.4)
// ---------------------------------------------------------------------------

describe("calculateInvoiceSummary – totalDesgloseImpuesto", () => {
  it("should group taxes by (codigo, codigoTarifaIVA) across lines", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Line A at 13%",
        precioUnitario: 100000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Line B at 13%",
        precioUnitario: 50000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 3,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Line C at 4%",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "04", tarifa: 4 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 19500 }, // 13000 + 6500
      { codigo: "01", codigoTarifaIVA: "04", totalMontoImpuesto: 400 },
    ]);
  });

  it("should keep non-IVA taxes in separate entries without codigoTarifaIVA", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Multi-tax line",
        precioUnitario: 10000,
        impuesto: [
          { codigo: "01", codigoTarifaIVA: "08", tarifa: 13 },
          { codigo: "02", tarifa: 10 },
        ],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalDesgloseImpuesto).toHaveLength(2);
    expect(summary.totalDesgloseImpuesto[0]).toEqual({
      codigo: "01",
      codigoTarifaIVA: "08",
      totalMontoImpuesto: 1300,
    });
    expect(summary.totalDesgloseImpuesto[1]).toEqual({
      codigo: "02",
      totalMontoImpuesto: 1000,
    });
    expect(summary.totalDesgloseImpuesto[1]).not.toHaveProperty("codigoTarifaIVA");
  });

  it("should report amounts net of exoneration in the breakdown", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Exonerated line",
        precioUnitario: 100000,
        impuesto: [
          {
            codigo: "01",
            codigoTarifaIVA: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "EX-DES-01",
              nombreInstitucion: "02",
              fechaEmision: "2025-01-01",
              tarifaExonerada: 6.5,
            },
          },
        ],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Plain 13% line",
        precioUnitario: 100000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    // Line 1 net: 13000 - 6500 = 6500; line 2 net: 13000 → grouped 19500
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 19500 },
    ]);
    expect(summary.totalImpuesto).toBe(19500);
  });

  it("should order entries by first appearance", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "4% first",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "04", tarifa: 4 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "13% second",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 3,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "4% again",
        precioUnitario: 20000,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "04", tarifa: 4 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalDesgloseImpuesto.map((d) => d.codigoTarifaIVA)).toEqual(["04", "08"]);
    expect(summary.totalDesgloseImpuesto[0]?.totalMontoImpuesto).toBe(1200); // 400 + 800
    expect(summary.totalDesgloseImpuesto[1]?.totalMontoImpuesto).toBe(1300);
  });
});

// ---------------------------------------------------------------------------
// round5 – IEEE 754 edge cases
// ---------------------------------------------------------------------------

describe("round5 – IEEE 754 edge cases", () => {
  it("should round 0.123456789 to 0.12346", () => {
    expect(round5(0.123456789)).toBe(0.12346);
  });

  it("should round 99999.999999 to 100000 (precision test)", () => {
    expect(round5(99999.999999)).toBe(100000);
  });

  it("should round -0.123456789 to -0.12346", () => {
    expect(round5(-0.123456789)).toBe(-0.12346);
  });

  it("should preserve precision for large number 999999999.12345", () => {
    expect(round5(999999999.12345)).toBe(999999999.12345);
  });

  it("should round 0.000001 to 0 (below half-unit at 5th decimal)", () => {
    expect(round5(0.000001)).toBe(0);
  });

  it("should round 0.000005 to 0.00001 (rounds half up at boundary)", () => {
    expect(round5(0.000005)).toBe(0.00001);
  });
});

// ---------------------------------------------------------------------------
// calculateLineItemTotals – edge cases
// ---------------------------------------------------------------------------

describe("calculateLineItemTotals – edge cases", () => {
  it("should handle micro quantity (cantidad=0.001)", () => {
    const item: LineItemInput = {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 0.001,
      unidadMedida: "kg",
      detalle: "Micro quantity",
      precioUnitario: 10000,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
    };
    const result = calculateLineItemTotals(item);
    // montoTotal = 0.001 * 10000 = 10
    expect(result.montoTotal).toBe(10);
    // tax = 10 * 0.13 = 1.3
    expect(result.impuestoNeto).toBe(1.3);
    expect(result.montoTotalLinea).toBe(11.3);
  });

  it("should handle free item (precioUnitario=0)", () => {
    const item: LineItemInput = {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 5,
      unidadMedida: "Unid",
      detalle: "Free promotional item",
      precioUnitario: 0,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
    };
    const result = calculateLineItemTotals(item);
    expect(result.montoTotal).toBe(0);
    expect(result.subTotal).toBe(0);
    expect(result.baseImponible).toBe(0);
    expect(result.impuestoNeto).toBe(0);
    expect(result.montoTotalLinea).toBe(0);
  });

  it("should handle very large amounts (999999.99 * 100)", () => {
    const item: LineItemInput = {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 100,
      unidadMedida: "Unid",
      detalle: "Expensive bulk",
      precioUnitario: 999999.99,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
    };
    const result = calculateLineItemTotals(item);
    // montoTotal = 100 * 999999.99 = 99999999
    expect(result.montoTotal).toBe(99999999);
    const tax = getFirstTax(result);
    // tax = 99999999 * 0.13 = 12999999.87
    expect(tax.monto).toBe(12999999.87);
    expect(result.montoTotalLinea).toBe(112999998.87);
  });

  it("should handle multiple taxes on same line (IVA + selectivo consumo)", () => {
    const item: LineItemInput = {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Unid",
      detalle: "Multi-tax item",
      precioUnitario: 10000,
      impuesto: [
        { codigo: "01", codigoTarifaIVA: "08", tarifa: 13 },
        { codigo: "02", tarifa: 10 },
      ],
    };
    const result = calculateLineItemTotals(item);
    expect(result.impuesto).toBeDefined();
    expect(result.impuesto).toHaveLength(2);
    // IVA: 10000 * 0.13 = 1300
    expect(result.impuesto?.[0]?.monto).toBe(1300);
    // Selectivo: 10000 * 0.10 = 1000
    expect(result.impuesto?.[1]?.monto).toBe(1000);
    // impuestoNeto only counts IVA (code "01"), not selectivo consumo ("02")
    expect(result.impuestoNeto).toBe(1300);
    // montoTotalLinea = subTotal + impuestoNeto (only IVA net)
    expect(result.montoTotalLinea).toBe(11300);
  });

  it("should count IVA calculo especial (07) and bienes usados (08) as IVA", () => {
    const item: LineItemInput = {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Unid",
      detalle: "Special IVA regimes",
      precioUnitario: 10000,
      impuesto: [
        { codigo: "07", codigoTarifaIVA: "08", tarifa: 13 },
        { codigo: "08", codigoTarifaIVA: "08", tarifa: 13 },
      ],
    };
    const result = calculateLineItemTotals(item);
    // Both are IVA-related: 1300 + 1300 = 2600
    expect(result.impuestoNeto).toBe(2600);
    expect(result.montoTotalLinea).toBe(12600);
  });

  it("should handle 100% exoneration with discount applied first", () => {
    const item: LineItemInput = {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Fully exonerated with discount",
      precioUnitario: 50000,
      descuento: [
        { montoDescuento: 10000, codigoDescuento: "01", naturalezaDescuento: "Discount" },
      ],
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: 13,
          exoneracion: {
            tipoDocumento: "03",
            numeroDocumento: "EX-100-2025",
            nombreInstitucion: "06",
            fechaEmision: "2025-06-01T00:00:00-06:00",
            tarifaExonerada: 13,
          },
        },
      ],
    };
    const result = calculateLineItemTotals(item);
    const tax = getFirstTax(result);
    expect(result.subTotal).toBe(40000);
    expect(tax.monto).toBe(5200); // full tax on discounted subtotal still recorded
    expect(tax.exoneracion?.montoExoneracion).toBe(5200);
    expect(result.impuestoNeto).toBe(0);
    expect(result.montoTotalLinea).toBe(40000);
  });
});

// ---------------------------------------------------------------------------
// calculateInvoiceSummary – edge cases
// ---------------------------------------------------------------------------

describe("calculateInvoiceSummary – edge cases", () => {
  it("should handle invoice summary with all zeros", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Free item",
        precioUnitario: 0,
      }),
    ];
    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(0);
    expect(summary.totalServExentos).toBe(0);
    expect(summary.totalServExonerado).toBe(0);
    expect(summary.totalMercanciasGravadas).toBe(0);
    expect(summary.totalMercanciasExentas).toBe(0);
    expect(summary.totalMercExonerada).toBe(0);
    expect(summary.totalGravado).toBe(0);
    expect(summary.totalExento).toBe(0);
    expect(summary.totalExonerado).toBe(0);
    expect(summary.totalVenta).toBe(0);
    expect(summary.totalDescuentos).toBe(0);
    expect(summary.totalVentaNeta).toBe(0);
    expect(summary.totalImpuesto).toBe(0);
    expect(summary.totalComprobante).toBe(0);
    // Synthetic exempt entry still appears in the breakdown
    expect(summary.totalDesgloseImpuesto).toEqual([
      { codigo: "01", codigoTarifaIVA: "01", totalMontoImpuesto: 0 },
    ]);
  });

  it("should handle summary with only services", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Service A",
        precioUnitario: 20000,
        esServicio: true,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Service B",
        precioUnitario: 30000,
        esServicio: true,
      }),
    ];
    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(20000);
    expect(summary.totalServExentos).toBe(30000);
    expect(summary.totalMercanciasGravadas).toBe(0);
    expect(summary.totalMercanciasExentas).toBe(0);
    expect(summary.totalGravado).toBe(20000);
    expect(summary.totalExento).toBe(30000);
    expect(summary.totalVenta).toBe(50000);
    expect(summary.totalImpuesto).toBe(2600);
    expect(summary.totalComprobante).toBe(52600);
  });

  it("should handle summary with only merchandise", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 3,
        unidadMedida: "Unid",
        detalle: "Product A",
        precioUnitario: 5000,
        esServicio: false,
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Product B",
        precioUnitario: 8000,
        esServicio: false,
      }),
    ];
    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(0);
    expect(summary.totalServExentos).toBe(0);
    expect(summary.totalMercanciasGravadas).toBe(15000);
    expect(summary.totalMercanciasExentas).toBe(8000);
    expect(summary.totalGravado).toBe(15000);
    expect(summary.totalExento).toBe(8000);
    expect(summary.totalVenta).toBe(23000);
    expect(summary.totalImpuesto).toBe(1950);
    expect(summary.totalComprobante).toBe(24950);
  });
});
