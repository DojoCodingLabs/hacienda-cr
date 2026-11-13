import { describe, expect, it } from "vitest";
import { fixtureClave } from "./__fixtures__/identity.js";
import { buildDecimalDocumentXml, calculateDecimalDocument } from "@dojocoding/hacienda-sdk";

describe("packaged decimal consumer", () => {
  it("imports new exports from dist and builds a decimal document", () => {
    const source: Parameters<typeof calculateDecimalDocument>[0] = {
      tipoDocumento: "01",
      clave: fixtureClave("2025-07-27T10:30:00-06:00", "01", 1),
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
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
    };
    const calculated = calculateDecimalDocument(source);
    expect(calculated.resumenFactura.totalComprobante).toBe("113");
    const xml = buildDecimalDocumentXml(source);
    expect(xml).toContain("<TotalComprobante>113.00000</TotalComprobante>");
  });
});
