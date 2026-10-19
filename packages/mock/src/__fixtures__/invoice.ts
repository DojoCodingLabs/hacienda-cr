/**
 * Minimal factura fixture used by the mock's E2E suite.
 *
 * @module mock/__fixtures__/invoice
 */
import type { FacturaElectronica } from "@dojocoding/hacienda-shared";
import { Money } from "@dojocoding/hacienda-shared";

const m = (value: string): Money => Money.fromString(value);

export const MOCK_INVOICE: FacturaElectronica = {
  clave: "50601072500031012345670010000101000000000119999999",
  proveedorSistemas: "3101234567",
  codigoActividadEmisor: "620100",
  numeroConsecutivo: "00100001010000000001",
  fechaEmision: "2025-07-27T10:30:00-06:00",
  emisor: {
    nombre: "Empresa de Prueba S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    ubicacion: {
      provincia: "1",
      canton: "01",
      distrito: "01",
      otrasSenas: "100m norte del parque central",
    },
    correoElectronico: "facturacion@prueba.cr",
  },
  receptor: {
    nombre: "Cliente de Prueba S.R.L.",
    identificacion: { tipo: "02", numero: "3109876543" },
    correoElectronico: "compras@prueba.cr",
  },
  condicionVenta: "01",
  detalleServicio: [
    {
      numeroLinea: 1,
      codigoCabys: "4321000000000",
      cantidad: 1,
      unidadMedida: "Sp",
      detalle: "Servicio de consultoria en TI",
      precioUnitario: m("100000"),
      montoTotal: m("100000"),
      subTotal: m("100000"),
      baseImponible: m("100000"),
      impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: 13, monto: m("13000") }],
      impuestoNeto: m("13000"),
      montoTotalLinea: m("113000"),
    },
  ],
  resumenFactura: {
    totalServGravados: m("100000"),
    totalServExentos: m("0"),
    totalMercanciasGravadas: m("0"),
    totalMercanciasExentas: m("0"),
    totalGravado: m("100000"),
    totalExento: m("0"),
    totalVenta: m("100000"),
    totalDescuentos: m("0"),
    totalVentaNeta: m("100000"),
    totalDesgloseImpuesto: [
      { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: m("13000") },
    ],
    totalImpuesto: m("13000"),
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: m("113000") }],
    totalComprobante: m("113000"),
  },
};
