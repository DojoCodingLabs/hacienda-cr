import { describe, expect, it } from "vitest";
import {
  DecimalDocumentInputSchema,
  DecimalFacturaInputSchema,
  type DecimalFacturaInput,
} from "@dojocoding/hacienda-shared";
import { calculateDecimalDocument, calculateDecimalLineItemTotals } from "./decimal-document.js";

describe("decimal document calculation", () => {
  it("calculates an ordinary IVA line without binary artifacts", () => {
    const line = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "3",
      unidadMedida: "Sp",
      detalle: "Servicio",
      precioUnitario: "0.1",
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
      esServicio: true,
    });
    expect(line.montoTotal).toBe("0.3");
    expect(line.impuesto[0]?.monto).toBe("0.039");
    expect(line.impuestoNeto).toBe("0.039");
    expect(line.montoTotalLinea).toBe("0.339");
  });

  it("calculates ISC from an explicit rate", () => {
    const line = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "ISC",
      precioUnitario: "100",
      impuesto: [{ codigo: "02", tarifa: "10" }],
    });
    expect(line.impuesto[0]?.monto).toBe("10");
    expect(line.montoTotalLinea).toBe("110");
  });

  it("calculates a specific tax and adds it to the IVA base", () => {
    const line = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "Especifico",
      precioUnitario: "100",
      impuesto: [
        { codigo: "01", codigoTarifaIVA: "08", tarifa: "13" },
        {
          codigo: "03",
          datosImpuestoEspecifico: { cantidadUnidadMedida: "2", impuestoUnidad: "1.5" },
        },
      ],
    });
    expect(line.baseImponible).toBe("100");
    expect(line.impuesto[1]?.monto).toBe("3");
    expect(line.impuestoNeto).toBe("16");
  });

  it("calculates a partial exoneration", () => {
    const line = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "Exonerado",
      precioUnitario: "100",
      impuesto: [
        {
          codigo: "01",
          codigoTarifaIVA: "08",
          tarifa: "13",
          exoneracion: {
            tipoDocumento: "01",
            numeroDocumento: "123",
            nombreInstitucion: "01",
            fechaEmision: "2025-01-01",
            tarifaExonerada: "5",
          },
        },
      ],
    });
    expect(line.impuesto[0]?.exoneracion?.montoExoneracion).toBe("5");
    expect(line.impuestoNeto).toBe("8");
    expect(line.montoTotalLinea).toBe("108");
  });

  it("applies discounts before tax", () => {
    const line = calculateDecimalLineItemTotals({
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "Descuento",
      precioUnitario: "100",
      descuento: [{ codigoDescuento: "01", montoDescuento: "10" }],
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
    });
    expect(line.subTotal).toBe("90");
    expect(line.impuestoNeto).toBe("11.7");
    expect(line.montoTotalLinea).toBe("101.7");
  });

  it("aggregates other charges and payment allocations", () => {
    const source: DecimalFacturaInput = DecimalFacturaInputSchema.parse({
      clave: "50601012500310123456700100001010000000001199999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001010000000001",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      emisor: {
        nombre: "Empresa",
        identificacion: { tipo: "02", numero: "3101234567" },
        ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "direccion" },
        correoElectronico: "a@b.com",
      },
      receptor: {
        nombre: "Cliente",
        identificacion: { tipo: "02", numero: "3109876543" },
        correoElectronico: "c@d.com",
      },
      condicionVenta: "01",
      detalleServicio: [
        {
          numeroLinea: 1,
          codigoCabys: "4321000000000",
          cantidad: "1",
          unidadMedida: "Sp",
          detalle: "Servicio",
          precioUnitario: "100",
          impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
          esServicio: true,
        },
      ],
      codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: "118" }],
      otrosCargos: [{ tipoDocumento: "04", detalle: "Cargo", montoCargo: "5" }],
    });
    const calculated = calculateDecimalDocument({ ...source, tipoDocumento: "01" });
    expect(calculated.resumenFactura.totalOtrosCargos).toBe("5");
    expect(calculated.resumenFactura.totalComprobante).toBe("118");
    expect(calculated.resumenFactura.totalImpuesto).toBe("13");
  });

  it("rejects payment allocations that do not square", () => {
    const source: DecimalFacturaInput = DecimalFacturaInputSchema.parse({
      clave: "50601012500310123456700100001010000000001199999999",
      proveedorSistemas: "3101234567",
      codigoActividadEmisor: "620100",
      numeroConsecutivo: "00100001010000000001",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      emisor: {
        nombre: "Empresa",
        identificacion: { tipo: "02", numero: "3101234567" },
        ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "direccion" },
        correoElectronico: "a@b.com",
      },
      receptor: {
        nombre: "Cliente",
        identificacion: { tipo: "02", numero: "3109876543" },
        correoElectronico: "c@d.com",
      },
      condicionVenta: "01",
      detalleServicio: [
        {
          numeroLinea: 1,
          codigoCabys: "4321000000000",
          cantidad: "1",
          unidadMedida: "Sp",
          detalle: "Servicio",
          precioUnitario: "100",
          impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
        },
      ],
      codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: "100" }],
    });
    expect(() => calculateDecimalDocument({ ...source, tipoDocumento: "01" })).toThrow(
      /Payment allocations/,
    );
  });

  it("rejects an intermediate amount above the monetary bound", () => {
    expect(() =>
      calculateDecimalLineItemTotals({
        numeroLinea: 1,
        codigoCabys: "4321000000000",
        cantidad: "2",
        unidadMedida: "Sp",
        detalle: "Grande",
        precioUnitario: "9999999999999.99999",
        impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
      }),
    ).toThrow(/bound/i);
  });

  it("rejects REP totals that do not square", () => {
    const source = {
      clave: "50601012500310123456700100001010000000001199999999",
      tipoDocumento: "10" as const,
      proveedorSistemas: "3101234567",
      numeroConsecutivo: "00100001100000000001",
      fechaEmision: "2025-07-27T10:30:00-06:00",
      emisor: {
        nombre: "Empresa",
        identificacion: { tipo: "02" as const, numero: "3101234567" },
        ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "direccion" },
        correoElectronico: "a@b.com",
      },
      receptor: {
        nombre: "Cliente",
        identificacion: { tipo: "02" as const, numero: "3109876543" },
        correoElectronico: "c@d.com",
      },
      condicionVenta: "11" as const,
      detalleServicio: [
        {
          numeroLinea: 1,
          codigoCabys: "4321000000000",
          detalle: "Pago",
          montoTotal: "100",
          subTotal: "100",
          impuesto: [
            { codigo: "01" as const, codigoTarifaIVA: "08" as const, tarifa: "13", monto: "13" },
          ],
          impuestoNeto: "14",
          montoTotalLinea: "113",
        },
      ],
      codigoTipoMoneda: { codigoMoneda: "CRC" as const, tipoCambio: "1" },
      medioPago: [{ tipoMedioPago: "04" as const, totalMedioPago: "113" }],
      informacionReferencia: [
        {
          tipoDoc: "01" as const,
          fechaEmision: "2025-07-27T10:30:00-06:00",
          codigo: "04" as const,
          razon: "Pago",
        },
      ],
    };
    expect(() => calculateDecimalDocument(DecimalDocumentInputSchema.parse(source))).toThrow(
      /impuestoNeto|RangeError/i,
    );
  });
});
