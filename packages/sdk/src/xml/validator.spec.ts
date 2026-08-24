/**
 * Tests for Factura Electronica input validation (v4.4).
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

  it("should reject missing proveedorSistemas (v4.4 required)", () => {
    const { proveedorSistemas: _, ...noProveedor } = SIMPLE_INVOICE;
    const result = validateFacturaInput(noProveedor);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("proveedorSistemas"))).toBe(true);
  });

  it("should reject invalid codigoActividadEmisor", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      codigoActividadEmisor: "12",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("codigoActividadEmisor"))).toBe(true);
  });

  it("should reject missing codigoActividadEmisor", () => {
    const { codigoActividadEmisor: _, ...noActivity } = SIMPLE_INVOICE;
    const result = validateFacturaInput(noActivity);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("codigoActividadEmisor"))).toBe(true);
  });

  it("should reject invalid codigoActividadReceptor when present", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      codigoActividadReceptor: "abc123",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("codigoActividadReceptor"))).toBe(true);
  });

  it("should reject empty detalleServicio", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      detalleServicio: [],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject missing receptor", () => {
    const { receptor: _, ...noReceptor } = SIMPLE_INVOICE;
    const result = validateFacturaInput(noReceptor);
    expect(result.valid).toBe(false);
  });

  it("should reject receptor without identificacion (required for Factura)", () => {
    const { identificacion: _, ...receptorNoId } = SIMPLE_INVOICE.receptor;
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      receptor: receptorNoId,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "receptor.identificacion")).toBe(true);
  });

  it("should reject invalid sale condition code", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      condicionVenta: "50",
    });
    expect(result.valid).toBe(false);
  });

  it("should reject a line item without impuesto (v4.4 requires at least one)", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const { impuesto: _, ...lineNoTax } = baseLine;
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      detalleServicio: [lineNoTax],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("impuesto"))).toBe(true);
  });

  it("should reject a free-text nombreInstitucion in exoneracion (coded in v4.4)", () => {
    const baseLine = firstLineItem(EXONERATED_INVOICE);
    const baseTax = baseLine.impuesto[0];
    expect(baseTax?.exoneracion).toBeDefined();
    const result = validateFacturaInput({
      ...EXONERATED_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuesto: [
            {
              ...baseTax,
              exoneracion: {
                ...baseTax?.exoneracion,
                nombreInstitucion: "Ministerio de Educacion Publica",
              },
            },
          ],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("nombreInstitucion"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// medioPago (v4.4: lives inside resumenFactura, 1-4 entries when present)
// ---------------------------------------------------------------------------

describe("validateFacturaInput — resumenFactura.medioPago", () => {
  it("should reject an empty medioPago array", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        medioPago: [],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("resumenFactura.medioPago"))).toBe(true);
  });

  it("should reject more than 4 medioPago entries", () => {
    const entry = { tipoMedioPago: "01" as const, totalMedioPago: 22600 };
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        medioPago: [entry, entry, entry, entry, entry],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("resumenFactura.medioPago"))).toBe(true);
  });

  it("should accept exactly 4 medioPago entries", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        medioPago: [
          { tipoMedioPago: "01", totalMedioPago: 28250 },
          { tipoMedioPago: "02", totalMedioPago: 28250 },
          { tipoMedioPago: "04", totalMedioPago: 28250 },
          { tipoMedioPago: "06", totalMedioPago: 28250 },
        ],
      },
    });
    expect(result.valid).toBe(true);
  });

  it("should accept an omitted medioPago (optional in the schema)", () => {
    const { medioPago: _, ...resumenNoMedioPago } = SIMPLE_INVOICE.resumenFactura;
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: resumenNoMedioPago,
    });
    expect(result.valid).toBe(true);
  });

  it("should reject an invalid tipoMedioPago code", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        medioPago: [{ tipoMedioPago: "42", totalMedioPago: 113000 }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("medioPago"))).toBe(true);
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
              codigoTarifaIVA: "08" as const,
              tarifa: 13,
              monto: 12000, // Should be 13000 (100000 * 0.13)
            },
          ],
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "detalleServicio.0.impuesto.0.monto")).toBe(true);
  });

  it("should skip the tax amount check when tarifa is undefined", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const input = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuesto: [
            {
              // Non-IVA tax with no rate: monto is not derivable, so not checked
              codigo: "02" as const,
              monto: 5000,
            },
          ],
          impuestoNeto: 0,
          montoTotalLinea: 100000,
        },
      ],
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalImpuesto: 0,
        medioPago: [{ tipoMedioPago: "01" as const, totalMedioPago: 100000 }],
        totalComprobante: 100000,
      },
    };
    const result = validateFacturaInput(input);
    if (!result.valid) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
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

  it("should subtract montoExoneracion when checking impuestoNeto", () => {
    const baseLine = firstLineItem(EXONERATED_INVOICE);
    const badInput = {
      ...EXONERATED_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuestoNeto: 26000, // Should be 0 (26000 tax - 26000 exonerated)
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "detalleServicio.0.impuestoNeto")).toBe(true);
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

  it("should include totalNoSujeto in the totalVenta check when present", () => {
    const input = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalNoSujeto: 1000,
        // totalVenta stays 100000, but expected is now 101000
      },
    };
    const result = validateFacturaInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "resumenFactura.totalVenta")).toBe(true);
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

  it("should subtract totalIVADevuelto in the totalComprobante check", () => {
    const input = {
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalIVADevuelto: 13000,
        medioPago: [{ tipoMedioPago: "02" as const, totalMedioPago: 100000 }],
        totalComprobante: 100000, // 100000 + 13000 - 13000
      },
    };
    const result = validateFacturaInput(input);
    if (!result.valid) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
  });

  it("should add totalOtrosCargos in the totalComprobante check", () => {
    const input = {
      ...SIMPLE_INVOICE,
      otrosCargos: [
        {
          tipoDocumento: "04" as const,
          detalle: "Timbre de ley",
          montoCargo: 500,
        },
      ],
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalOtrosCargos: 500,
        medioPago: [{ tipoMedioPago: "01" as const, totalMedioPago: 113500 }],
        totalComprobante: 113500, // 100000 + 13000 + 500
      },
    };
    const result = validateFacturaInput(input);
    if (!result.valid) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
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

  it("should require codigoTarifaIVA for IVA taxes", () => {
    const baseLine = firstLineItem(SIMPLE_INVOICE);
    const badInput = {
      ...SIMPLE_INVOICE,
      detalleServicio: [
        {
          ...baseLine,
          impuesto: [
            {
              codigo: "01" as const,
              // codigoTarifaIVA is missing
              tarifa: 13,
              monto: 13000,
            },
          ],
        },
      ],
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path === "detalleServicio.0.impuesto.0.codigoTarifaIVA"),
    ).toBe(true);
    expect(result.errors.some((e) => e.message.includes("codigoTarifaIVA"))).toBe(true);
  });

  it.each([["07"], ["08"]] as const)(
    "should require codigoTarifaIVA for IVA-related code %s",
    (codigo) => {
      const baseLine = firstLineItem(SIMPLE_INVOICE);
      const badInput = {
        ...SIMPLE_INVOICE,
        detalleServicio: [
          {
            ...baseLine,
            impuesto: [
              {
                codigo,
                tarifa: 13,
                monto: 13000,
              },
            ],
          },
        ],
      };
      const result = validateFacturaInput(badInput);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === "detalleServicio.0.impuesto.0.codigoTarifaIVA"),
      ).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// Optional summary totals (v4.4)
// ---------------------------------------------------------------------------

describe("validateFacturaInput — optional summary totals", () => {
  it("should skip the totalGravado check when it is omitted", () => {
    const { totalGravado: _, ...resumen } = SIMPLE_INVOICE.resumenFactura;
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...resumen,
        // totalVenta must now match only the remaining present components
        totalExento: 0,
        totalExonerado: 100000,
        totalServExonerado: 100000,
        totalServGravados: 0,
      },
    });
    // totalGravado itself is not flagged; the remaining components add up
    expect(result.errors.some((e) => e.path === "resumenFactura.totalGravado")).toBe(false);
  });

  it("should skip the totalExento check when it is omitted", () => {
    const { totalExento: _, ...resumen } = EXPORT_INVOICE.resumenFactura;
    const result = validateFacturaInput({
      ...EXPORT_INVOICE,
      resumenFactura: resumen,
    });
    expect(result.errors.some((e) => e.path === "resumenFactura.totalExento")).toBe(false);
    // But totalVenta then no longer adds up (3000 vs 0 from present components)
    expect(result.errors.some((e) => e.path === "resumenFactura.totalVenta")).toBe(true);
  });

  it("should skip the totalImpuesto check when it is omitted", () => {
    const { totalImpuesto: _, ...resumen } = SIMPLE_INVOICE.resumenFactura;
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...resumen,
        // With totalImpuesto absent, totalComprobante = totalVentaNeta + 0
        medioPago: [{ tipoMedioPago: "01" as const, totalMedioPago: 100000 }],
        totalComprobante: 100000,
      },
    });
    if (!result.valid) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
  });

  it("should validate totalExonerado consistency when present", () => {
    const badInput = {
      ...EXONERATED_INVOICE,
      resumenFactura: {
        ...EXONERATED_INVOICE.resumenFactura,
        totalServExonerado: 100000, // totalExonerado stays 200000 → mismatch
      },
    };
    const result = validateFacturaInput(badInput);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "resumenFactura.totalExonerado")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("validateFacturaInput — edge cases", () => {
  it("should accept an invoice with 0% exempt tax (export)", () => {
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

  it("should accept a totalDesgloseImpuesto breakdown in the summary", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 13000 }],
      },
    });
    if (!result.valid) {
      console.error("Validation errors:", result.errors);
    }
    expect(result.valid).toBe(true);
  });

  it("should reject an invalid codigo in totalDesgloseImpuesto", () => {
    const result = validateFacturaInput({
      ...SIMPLE_INVOICE,
      resumenFactura: {
        ...SIMPLE_INVOICE.resumenFactura,
        totalDesgloseImpuesto: [{ codigo: "42", totalMontoImpuesto: 13000 }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("totalDesgloseImpuesto"))).toBe(true);
  });
});
