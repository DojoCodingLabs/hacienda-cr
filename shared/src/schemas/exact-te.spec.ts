import { describe, expect, it } from "vitest";
import { ExactTeInputSchema } from "./exact-te.js";
const source = () => ({
  caseCode: "TE-domestic-ordinary-iva13-v1",
  clave: "50627072500310123456700100001040000000001199999999",
  numeroConsecutivo: "00100001040000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  emisor: {
    nombre: "Empresa sintética",
    identificacion: { tipo: "02", numero: "3101234567" },
    ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "Dirección sintética" },
    correoElectronico: "synthetic@example.test",
  },
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "8310100000000",
      cantidad: "1",
      unidadMedida: "Sp",
      detalle: "Servicio sintético",
      precioUnitario: "100.00001",
      esServicio: true,
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
    },
  ],
  codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
  medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113.00001" }],
});
describe("strict exact ordinary TE input", () => {
  it("keeps receiver absent or actual, with optional identification", () => {
    expect(ExactTeInputSchema.parse(source())).not.toHaveProperty("receptor");
    for (const receptor of [
      { nombre: "Persona real" },
      { nombre: "Persona real", identificacion: { tipo: "01", numero: "112345678" } },
    ])
      expect(ExactTeInputSchema.parse({ ...source(), receptor }).receptor).toEqual(receptor);
    for (const receptor of [
      {},
      { nombre: "ab" },
      { nombre: "   " },
      { nombre: "Persona", identificacion: { tipo: "05", numero: "FOREIGN" } },
      { nombre: "Persona", otrasSenasExtranjero: "No admitido" },
    ])
      expect(ExactTeInputSchema.safeParse({ ...source(), receptor }).success).toBe(false);
  });
  it("enforces current family/terms/companions without silently normalizing", () => {
    for (const condicionVenta of ["09", "11", "12", "13"])
      expect(ExactTeInputSchema.safeParse({ ...source(), condicionVenta }).success).toBe(false);
    for (const condicionVenta of ["02", "10"]) {
      for (const plazoCredito of [undefined, "0", "00000", "100000"])
        expect(
          ExactTeInputSchema.safeParse({ ...source(), condicionVenta, plazoCredito }).success,
        ).toBe(false);
      expect(
        ExactTeInputSchema.parse({ ...source(), condicionVenta, plazoCredito: "00030" })
          .plazoCredito,
      ).toBe("00030");
    }
    expect(ExactTeInputSchema.safeParse({ ...source(), condicionVenta: "99" }).success).toBe(false);
    expect(
      ExactTeInputSchema.safeParse({
        ...source(),
        condicionVenta: "99",
        condicionVentaOtros: "Motivo real",
      }).success,
    ).toBe(true);
    expect(ExactTeInputSchema.safeParse({ ...source(), plazoCredito: "0" }).success).toBe(false);
  });
  it("denies foreign/unreviewed identity and unsupported fields, currencies or sequences", () => {
    const s = source();
    for (const patch of [
      { codigoActividadReceptor: "620100" },
      { resumenFactura: {} },
      { codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "2" } },
      { codigoTipoMoneda: { codigoMoneda: "EUR", tipoCambio: "1" } },
      { emisor: { ...s.emisor, identificacion: { tipo: "06", numero: "123456789" } } },
      { detalleServicio: [{ ...s.detalleServicio[0], numeroLinea: 2 }] },
      { fechaEmision: "not-a-date" },
    ])
      expect(ExactTeInputSchema.safeParse({ ...s, ...patch }).success).toBe(false);
  });
});
