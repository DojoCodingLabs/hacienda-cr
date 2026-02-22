/**
 * Tests for Factura Electronica input validation.
 */

import { describe, it, expect } from "vitest";
import { validateFacturaInput } from "./validator.js";
import {
  SIMPLE_INVOICE,
  MULTI_ITEM_INVOICE,
  DISCOUNT_INVOICE,
  EXONERATED_INVOICE,
  EXPORT_INVOICE,
  CREDIT_INVOICE,
  REFERENCE_INVOICE,
} from "../__fixtures__/invoices.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstLineItem(invoice: typeof SIMPLE_INVOICE) {
  const line = invoice.detalleServicio[0];
  expect(line).toBeDefined();
  return line as NonNullable<typeof line>;
}

// ---------------------------------------------------------------------------
// Valid inputs — all fixtures should pass
// ---------------------------------------------------------------------------

describe("validateFacturaInput — valid inputs", () => {
  it.each([
    ["SIMPLE_INVOICE", SIMPLE_INVOICE],
    ["MULTI_ITEM_INVOICE", MULTI_ITEM_INVOICE],
    ["DISCOUNT_INVOICE", DISCOUNT_INVOICE],
    ["EXONERATED_INVOICE", EXONERATED_INVOICE],
    ["EXPORT_INVOICE", EXPORT_INVOICE],
    ["CREDIT_INVOICE", CREDIT_INVOICE],
    ["REFERENCE_INVOICE", REFERENCE_INVOICE],
  ] as const)("%s should be valid", (_name, fixture) => {
    const result = validateFacturaInput(fixture);
    if (!result.valid) {
      // Show errors for debugging if a fixture fails unexpectedly
      console.error("Validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Schema-level validation failures
// ---------------------------------------------------------------------------

describe("validateFacturaInput — schema errors", () => {
  it("should reject null input", () => {
    const result = validateFacturaInput(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject empty object", () => {
    const result = validateFacturaInput({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject invalid clave (too short)", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      clave: "12345",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("clave"))).toBe(true);
  });

  it("should reject invalid activity code", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      codigoActividad: "12",
    });
    expect(result.valid).toBe(false);
  });

  it("should reject empty detalleServicio", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      detalleServicio: [],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject empty medioPago", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      medioPago: [],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject missing receptor", () => {
    const { receptor: _, ...noReceptor } = SIMPLE_INVOICE;
    const result = validateFacturaInput(noReceptor);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid sale condition code", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      condicionVenta: "50",
    });
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Business rule validation
// ---------------------------------------------------------------------------

describe("validateFacturaInput — business rules", () => {
  it("should detect non-sequential line numbers", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          numeroLinea: 5, // Should be 1
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("numeroLinea"))).toBe(true);
  });

  it("should detect incorrect montoTotal", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          montoTotal: 99999, // Should be 100000 (1 * 100000)
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("montoTotal"))).toBe(true);
  });

  it("should detect incorrect subTotal (with discount)", () => {
    const baseLine = firstLineItem(DISCOUNT_INVOICE);
    const badInput = {
      ...DISCOUNT_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          subTotal: 50000, // Should be 45000 (50000 - 5000 discount)
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("subTotal"))).toBe(true);
  });

  it("should detect incorrect tax amount", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuesto: [
            {
              codigo: "01" as const,
              codigoTarifa: "08" as const,
              tarifa: 13,
              monto: 12000, // Should be 13000 (100000 * 0.13)
            },
          ],
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("impuesto"))).toBe(true);
  });

  it("should detect incorrect impuestoNeto", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuestoNeto: 12000, // Should be 13000
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("impuestoNeto"))).toBe(true);
  });

  it("should detect incorrect montoTotalLinea", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          montoTotalLinea: 100000, // Should be 113000
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("montoTotalLinea"))).toBe(true);
  });

  it("should detect incorrect totalGravado", () => {
    const badInput = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalGravado: 99999, // Should be 100000
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("totalGravado"))).toBe(true);
  });

  it("should detect incorrect totalVenta", () => {
    const badInput = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalVenta: 99999,
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("totalVenta"))).toBe(true);
  });

  it("should detect incorrect totalVentaNeta", () => {
    const badInput = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalVentaNeta: 99999,
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("totalVentaNeta"))).toBe(true);
  });

  it("should detect incorrect totalComprobante", () => {
    const badInput = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalComprobante: 999999, // Should be 113000
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("totalComprobante"))).toBe(true);
  });

  it("should detect incorrect totalImpuesto", () => {
    const badInput = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalImpuesto: 12000, // Should be 13000
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("totalImpuesto"))).toBe(true);
  });

  it("should require plazoCredito when condicionVenta is 02", () => {
    const badInput = {
      ...CREDIT_INVOICE,
      plazoCredito: undefined,
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("plazoCredito"))).toBe(true);
  });

  it("should warn about missing codigoTarifa for IVA taxes", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuesto: [
            {
              codigo: "01" as const,
              // codigoTarifa is missing
              tarifa: 13,
              monto: 13000,
            },
          ],
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("codigoTarifa"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("validateFacturaInput — edge cases", () => {
  it("should accept an invoice with no taxes (export/exempt)", () => {
    const result = validateFacturaInput(EXPORT_INVOICE);
    expect(result.valid).toBe(true);
  });

  it("should return structured errors with path and message", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      clave: "short",
    });
    expect(result.valid).toBe(false);
    const firstError = result.errors[0];
    expect(firstError).toBeDefined();
    expect(typeof firstError?.path).toBe("string");
    expect(typeof firstError?.message).toBe("string");
  });

  it("should validate totalExento consistency", () => {
    const badInput = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalExento: 5000, // Should be 0 (no exempt items)
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
  });
});
