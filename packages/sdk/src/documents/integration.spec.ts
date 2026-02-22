/**
 * Integration tests — full flow from line item calculation through
 * XML generation and validation.
 */

import { describe, it, expect } from "vitest";
import { calculateLineItemTotals, calculateInvoiceSummary } from "../tax/calculator.js";
import { buildFacturaXml } from "./factura-builder.js";
import { validateFacturaInput } from "../xml/validator.js";
import type { FacturaElectronica } from "@hacienda-cr/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function line(invoice: FacturaElectronica, index: number) {
  const l = invoice.detalleServicio[index];
  expect(l).toBeDefined();
  return l as NonNullable<typeof l>;
}

function buildFullInvoice(overrides?: Partial<FacturaElectronica>): FacturaElectronica {
  // Calculate line items
  const line1 = calculateLineItemTotals({
    numeroLinea: 1,
    codigoCabys: "4321000000000",
    cantidad: 2,
    unidadMedida: "Sp",
    detalle: "Horas de consultoria",
    precioUnitario: 50000,
    esServicio: true,
    impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
  });

  const line2 = calculateLineItemTotals({
    numeroLinea: 2,
    codigoCabys: "1234500000000",
    cantidad: 5,
    unidadMedida: "Unid",
    detalle: "Producto estandar",
    precioUnitario: 2000,
    esServicio: false,
    impuesto: [{ codigo: "01", codigoTarifa: "04", tarifa: 4 }],
  });

  const items = [line1, line2];
  const summary = calculateInvoiceSummary(items);

  return {
    clave: "50601072500031012345670010000101000000000119999999",
    codigoActividad: "620100",
    numeroConsecutivo: "00100001010000000001",
    fechaEmision: "2025-07-27T10:30:00-06:00",
    emisor: {
      nombre: "Empresa Test S.A.",
      identificacion: {
        tipo: "02",
        numero: "3101234567",
      },
      correoElectronico: "test@empresa.cr",
    },
    receptor: {
      nombre: "Cliente Test",
      identificacion: {
        tipo: "01",
        numero: "123456789",
      },
    },
    condicionVenta: "01",
    medioPago: ["01"],
    detalleServicio: items,
    resumenFactura: summary,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Full pipeline: calculate -> validate -> build XML
// ---------------------------------------------------------------------------

describe("Full pipeline: calculate -> validate -> build XML", () => {
  it("should produce valid XML from calculated line items", () => {
    const invoice = buildFullInvoice();

    // Validate
    const validation = validateFacturaInput(invoice);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Build XML
    const xml = buildFacturaXml(invoice);
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain("<FacturaElectronica");
    expect(xml).toContain("<Clave>");
    expect(xml).toContain("<DetalleServicio>");
    expect(xml).toContain("<ResumenFactura>");
  });

  it("should correctly calculate totals for multi-item invoice", () => {
    const invoice = buildFullInvoice();
    const l0 = line(invoice, 0);
    const l1 = line(invoice, 1);

    // Line 1: 2 * 50000 = 100000, tax 13000
    expect(l0.montoTotal).toBe(100000);
    expect(l0.impuestoNeto).toBe(13000);
    expect(l0.montoTotalLinea).toBe(113000);

    // Line 2: 5 * 2000 = 10000, tax 400
    expect(l1.montoTotal).toBe(10000);
    expect(l1.impuestoNeto).toBe(400);
    expect(l1.montoTotalLinea).toBe(10400);

    // Summary
    expect(invoice.resumenFactura.totalServGravados).toBe(100000);
    expect(invoice.resumenFactura.totalMercanciasGravadas).toBe(10000);
    expect(invoice.resumenFactura.totalGravado).toBe(110000);
    expect(invoice.resumenFactura.totalImpuesto).toBe(13400);
    expect(invoice.resumenFactura.totalComprobante).toBe(123400);
  });

  it("should produce XML with correct structure for discounted items", () => {
    const discountedLine = calculateLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 10,
      unidadMedida: "Unid",
      detalle: "Producto con descuento",
      precioUnitario: 5000,
      descuento: [{ montoDescuento: 5000, naturalezaDescuento: "Descuento por volumen" }],
      impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
    });

    const summary = calculateInvoiceSummary([discountedLine]);
    const invoice: FacturaElectronica = {
      clave: "50601072500031012345670010000101000000000219999999",
      codigoActividad: "620100",
      numeroConsecutivo: "00100001010000000002",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      emisor: {
        nombre: "Empresa Test S.A.",
        identificacion: { tipo: "02", numero: "3101234567" },
        correoElectronico: "test@empresa.cr",
      },
      receptor: {
        nombre: "Cliente Test",
        identificacion: { tipo: "01", numero: "123456789" },
      },
      condicionVenta: "01",
      medioPago: ["01"],
      detalleServicio: [discountedLine],
      resumenFactura: summary,
    };

    const validation = validateFacturaInput(invoice);
    expect(validation.valid).toBe(true);

    const xml = buildFacturaXml(invoice);
    expect(xml).toContain("<Descuento>");
    expect(xml).toContain("<MontoDescuento>5000</MontoDescuento>");
    expect(xml).toContain("<SubTotal>45000</SubTotal>");
  });

  it("should handle exonerated items through the full pipeline", () => {
    const exoneratedLine = calculateLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio exonerado",
      precioUnitario: 200000,
      esServicio: true,
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
    });

    expect(exoneratedLine.impuestoNeto).toBe(0);
    expect(exoneratedLine.montoTotalLinea).toBe(200000);

    const summary = calculateInvoiceSummary([exoneratedLine]);
    expect(summary.totalServExonerado).toBe(200000);
    expect(summary.totalExonerado).toBe(200000);
    expect(summary.totalImpuesto).toBe(0);
    expect(summary.totalComprobante).toBe(200000);
  });
});
