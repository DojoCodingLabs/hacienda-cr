/**
 * Tests for tax calculation utilities.
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

    it("should set montoTotalLinea = subTotal when no taxes", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Exempt item",
        precioUnitario: 10000,
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotalLinea).toBe(10000);
      expect(result.impuestoNeto).toBeUndefined();
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

  describe("IVA calculation", () => {
    it("should calculate 13% IVA correctly", () => {
      const item: LineItemInput = {
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: "Consulting",
        precioUnitario: 100000,
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(13000);
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
        impuesto: [{ codigo: "01", codigoTarifa: "04", tarifa: 4 }],
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
        impuesto: [{ codigo: "01", codigoTarifa: "02", tarifa: 1 }],
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
        impuesto: [{ codigo: "01", codigoTarifa: "03", tarifa: 2 }],
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
        impuesto: [{ codigo: "01", codigoTarifa: "07", tarifa: 8 }],
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
        impuesto: [{ codigo: "01", codigoTarifa: "01", tarifa: 0 }],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      expect(tax.monto).toBe(0);
      expect(result.impuestoNeto).toBe(0);
      expect(result.montoTotalLinea).toBe(10000);
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
            naturalezaDescuento: "Volume discount",
          },
        ],
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotal).toBe(50000);
      expect(result.subTotal).toBe(45000);
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
          { montoDescuento: 1000, naturalezaDescuento: "Discount A" },
          { montoDescuento: 500, naturalezaDescuento: "Discount B" },
        ],
      };

      const result = calculateLineItemTotals(item);
      expect(result.subTotal).toBe(8500);
    });
  });

  describe("exonerations", () => {
    it("should calculate exoneration correctly", () => {
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
            codigoTarifa: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "AL-001-2025",
              nombreInstitucion: "Ministerio de Educacion",
              fechaEmision: "2025-01-15T00:00:00-06:00",
              porcentajeExoneracion: 100,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      // Full tax: 200000 * 0.13 = 26000
      expect(tax.monto).toBe(26000);
      // Exoneration: 26000 * 100% = 26000
      expect(tax.exoneracion).toBeDefined();
      expect(tax.exoneracion?.montoExoneracion).toBe(26000);
      // Net tax: 26000 - 26000 = 0
      expect(result.impuestoNeto).toBe(0);
      expect(result.montoTotalLinea).toBe(200000);
    });

    it("should handle partial exoneration (50%)", () => {
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
            codigoTarifa: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "04",
              numeroDocumento: "DGH-002-2025",
              nombreInstitucion: "DGH",
              fechaEmision: "2025-01-01T00:00:00-06:00",
              porcentajeExoneracion: 50,
            },
          },
        ],
      };

      const result = calculateLineItemTotals(item);
      const tax = getFirstTax(result);
      // Full tax: 100000 * 0.13 = 13000
      expect(tax.monto).toBe(13000);
      // Exonerated: 13000 * 50% = 6500
      expect(tax.exoneracion).toBeDefined();
      expect(tax.exoneracion?.montoExoneracion).toBe(6500);
      // Net tax: 13000 - 6500 = 6500
      expect(result.impuestoNeto).toBe(6500);
      expect(result.montoTotalLinea).toBe(106500);
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
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
      };

      const result = calculateLineItemTotals(item);
      expect(result.montoTotal).toBe(8333.325);
      const tax = getFirstTax(result);
      // Tax: 8333.325 * 0.13 = 1083.33225 -> 1083.33225
      expect(tax.monto).toBe(1083.33225);
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
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
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
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
      }),
      calculateLineItemTotals({
        numeroLinea: 2,
        codigoCabys: "1234500000000",
        cantidad: 2,
        unidadMedida: "Unid",
        detalle: "Product",
        precioUnitario: 10000,
        esServicio: false,
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
      }),
    ];

    const summary = calculateInvoiceSummary(items);
    expect(summary.totalServGravados).toBe(50000);
    expect(summary.totalMercanciasGravadas).toBe(20000);
    expect(summary.totalGravado).toBe(70000);
    expect(summary.totalImpuesto).toBe(9100); // 6500 + 2600
    expect(summary.totalComprobante).toBe(79100);
  });

  it("should handle exempt items (no tax)", () => {
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
  });

  it("should handle exonerated items", () => {
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
            codigoTarifa: "08",
            tarifa: 13,
            exoneracion: {
              tipoDocumento: "03",
              numeroDocumento: "EX-001",
              nombreInstitucion: "MinEdu",
              fechaEmision: "2025-01-01",
              porcentajeExoneracion: 100,
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
        descuento: [{ montoDescuento: 5000, naturalezaDescuento: "Volume" }],
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
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

  it("should include otros cargos in totalComprobante", () => {
    const items = [
      calculateLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: 1,
        unidadMedida: "Unid",
        detalle: "Product",
        precioUnitario: 10000,
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
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
        impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
      }),
      // Exempt merchandise
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
        impuesto: [{ codigo: "01", codigoTarifa: "04", tarifa: 4 }],
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
  });
});
