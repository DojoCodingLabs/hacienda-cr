/**
 * Tests for shared XML mapping helpers — covers untested optional paths.
 */

import { describe, it, expect } from "vitest";
import {
  buildEmisorXml,
  buildReceptorXml,
  buildResumenFacturaXml,
  buildOtrosCargosXml,
  buildInformacionReferenciaXml,
  buildOtrosXml,
  buildStandardDocumentBody,
} from "./shared-xml-helpers.js";
import type {
  Emisor,
  Receptor,
  ResumenFactura,
  InformacionReferencia,
  OtroContenido,
  LineaDetalle,
} from "@hacienda-cr/shared";
import type { CommonDocumentFields } from "./shared-xml-helpers.js";

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function minimalEmisor(overrides: Partial<Emisor> = {}): Emisor {
  return {
    nombre: "Empresa Test S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    correoElectronico: "test@example.com",
    ...overrides,
  };
}

function minimalReceptor(overrides: Partial<Receptor> = {}): Receptor {
  return {
    nombre: "Cliente Test",
    ...overrides,
  };
}

function minimalResumen(overrides: Partial<ResumenFactura> = {}): ResumenFactura {
  return {
    totalServGravados: 100000,
    totalServExentos: 0,
    totalMercanciasGravadas: 0,
    totalMercanciasExentas: 0,
    totalGravado: 100000,
    totalExento: 0,
    totalVenta: 100000,
    totalDescuentos: 0,
    totalVentaNeta: 100000,
    totalImpuesto: 13000,
    totalComprobante: 113000,
    ...overrides,
  };
}

function minimalLineaDetalle(): LineaDetalle {
  return {
    numeroLinea: 1,
    codigoCabys: "4321000000000",
    cantidad: 1,
    unidadMedida: "Sp",
    detalle: "Servicio",
    precioUnitario: 1000,
    montoTotal: 1000,
    subTotal: 1000,
    montoTotalLinea: 1000,
  } as LineaDetalle;
}

function minimalDocumentFields(
  overrides: Partial<CommonDocumentFields> = {},
): CommonDocumentFields {
  return {
    clave: "50601012600310123456700100001010000000001199999999",
    codigoActividad: "620100",
    numeroConsecutivo: "00100001010000000001",
    fechaEmision: "2025-07-27T10:30:00-06:00",
    emisor: minimalEmisor(),
    condicionVenta: "01",
    medioPago: ["01"],
    detalleServicio: [minimalLineaDetalle()],
    resumenFactura: minimalResumen(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildEmisorXml
// ---------------------------------------------------------------------------

describe("buildEmisorXml", () => {
  it("should include Fax when present", () => {
    const result = buildEmisorXml(
      minimalEmisor({ fax: { codigoPais: "506", numTelefono: "22224444" } }),
    );
    expect(result.Fax).toEqual({ CodigoPais: "506", NumTelefono: "22224444" });
  });

  it("should not include Fax when absent", () => {
    const result = buildEmisorXml(minimalEmisor());
    expect(result).not.toHaveProperty("Fax");
  });

  it("should include Telefono when present", () => {
    const result = buildEmisorXml(
      minimalEmisor({ telefono: { codigoPais: "506", numTelefono: "88887777" } }),
    );
    expect(result.Telefono).toEqual({ CodigoPais: "506", NumTelefono: "88887777" });
  });

  it("should not include Telefono when absent", () => {
    const result = buildEmisorXml(minimalEmisor());
    expect(result).not.toHaveProperty("Telefono");
  });

  it("should include NombreComercial when present", () => {
    const result = buildEmisorXml(minimalEmisor({ nombreComercial: "MiMarca" }));
    expect(result.NombreComercial).toBe("MiMarca");
  });

  it("should not include NombreComercial when absent", () => {
    const result = buildEmisorXml(minimalEmisor());
    expect(result).not.toHaveProperty("NombreComercial");
  });

  it("should include Ubicacion with Barrio when present", () => {
    const result = buildEmisorXml(
      minimalEmisor({
        ubicacion: {
          provincia: "1",
          canton: "01",
          distrito: "01",
          barrio: "02",
        },
      }),
    );
    expect(result.Ubicacion).toEqual({
      Provincia: "1",
      Canton: "01",
      Distrito: "01",
      Barrio: "02",
    });
  });

  it("should include Ubicacion with OtrasSenas when present", () => {
    const result = buildEmisorXml(
      minimalEmisor({
        ubicacion: {
          provincia: "2",
          canton: "03",
          distrito: "04",
          otrasSenas: "Frente al parque",
        },
      }),
    );
    expect(result.Ubicacion).toEqual({
      Provincia: "2",
      Canton: "03",
      Distrito: "04",
      OtrasSenas: "Frente al parque",
    });
  });

  it("should include Ubicacion with both Barrio and OtrasSenas", () => {
    const result = buildEmisorXml(
      minimalEmisor({
        ubicacion: {
          provincia: "1",
          canton: "01",
          distrito: "01",
          barrio: "05",
          otrasSenas: "200m norte de la iglesia",
        },
      }),
    );
    const ubicacion = result.Ubicacion as Record<string, unknown>;
    expect(ubicacion.Barrio).toBe("05");
    expect(ubicacion.OtrasSenas).toBe("200m norte de la iglesia");
  });

  it("should omit Ubicacion entirely when absent", () => {
    const result = buildEmisorXml(minimalEmisor());
    expect(result).not.toHaveProperty("Ubicacion");
  });

  it("should include all optional fields together", () => {
    const result = buildEmisorXml(
      minimalEmisor({
        nombreComercial: "Brand",
        ubicacion: {
          provincia: "1",
          canton: "01",
          distrito: "01",
          barrio: "01",
          otrasSenas: "Calle 1",
        },
        telefono: { codigoPais: "506", numTelefono: "11112222" },
        fax: { codigoPais: "506", numTelefono: "33334444" },
      }),
    );
    expect(result.NombreComercial).toBe("Brand");
    expect(result).toHaveProperty("Ubicacion");
    expect(result).toHaveProperty("Telefono");
    expect(result).toHaveProperty("Fax");
    expect(result.Nombre).toBe("Empresa Test S.A.");
    expect(result.CorreoElectronico).toBe("test@example.com");
  });
});

// ---------------------------------------------------------------------------
// buildReceptorXml
// ---------------------------------------------------------------------------

describe("buildReceptorXml", () => {
  it("should include Fax when present", () => {
    const result = buildReceptorXml(
      minimalReceptor({ fax: { codigoPais: "506", numTelefono: "55556666" } }),
    );
    expect(result.Fax).toEqual({ CodigoPais: "506", NumTelefono: "55556666" });
  });

  it("should not include Fax when absent", () => {
    const result = buildReceptorXml(minimalReceptor());
    expect(result).not.toHaveProperty("Fax");
  });

  it("should include IdentificacionExtranjero when present", () => {
    const result = buildReceptorXml(
      minimalReceptor({ identificacionExtranjero: "US-EIN-99-1234567" }),
    );
    expect(result.IdentificacionExtranjero).toBe("US-EIN-99-1234567");
  });

  it("should not include IdentificacionExtranjero when absent", () => {
    const result = buildReceptorXml(minimalReceptor());
    expect(result).not.toHaveProperty("IdentificacionExtranjero");
  });

  it("should include NombreComercial when present", () => {
    const result = buildReceptorXml(minimalReceptor({ nombreComercial: "Tienda XYZ" }));
    expect(result.NombreComercial).toBe("Tienda XYZ");
  });

  it("should not include NombreComercial when absent", () => {
    const result = buildReceptorXml(minimalReceptor());
    expect(result).not.toHaveProperty("NombreComercial");
  });

  it("should include Ubicacion with Barrio and OtrasSenas", () => {
    const result = buildReceptorXml(
      minimalReceptor({
        ubicacion: {
          provincia: "3",
          canton: "02",
          distrito: "05",
          barrio: "03",
          otrasSenas: "Edificio azul",
        },
      }),
    );
    expect(result.Ubicacion).toEqual({
      Provincia: "3",
      Canton: "02",
      Distrito: "05",
      Barrio: "03",
      OtrasSenas: "Edificio azul",
    });
  });

  it("should include Ubicacion without optional subfields", () => {
    const result = buildReceptorXml(
      minimalReceptor({
        ubicacion: { provincia: "1", canton: "01", distrito: "01" },
      }),
    );
    const ubicacion = result.Ubicacion as Record<string, unknown>;
    expect(ubicacion).not.toHaveProperty("Barrio");
    expect(ubicacion).not.toHaveProperty("OtrasSenas");
  });

  it("should include Telefono when present", () => {
    const result = buildReceptorXml(
      minimalReceptor({ telefono: { codigoPais: "506", numTelefono: "77778888" } }),
    );
    expect(result.Telefono).toEqual({ CodigoPais: "506", NumTelefono: "77778888" });
  });

  it("should include CorreoElectronico when present", () => {
    const result = buildReceptorXml(minimalReceptor({ correoElectronico: "cliente@test.com" }));
    expect(result.CorreoElectronico).toBe("cliente@test.com");
  });

  it("should not include CorreoElectronico when absent", () => {
    const result = buildReceptorXml(minimalReceptor());
    expect(result).not.toHaveProperty("CorreoElectronico");
  });

  it("should include Identificacion when present", () => {
    const result = buildReceptorXml(
      minimalReceptor({ identificacion: { tipo: "01", numero: "101230456" } }),
    );
    expect(result.Identificacion).toEqual({ Tipo: "01", Numero: "101230456" });
  });

  it("should not include Identificacion when absent", () => {
    const result = buildReceptorXml(minimalReceptor());
    expect(result).not.toHaveProperty("Identificacion");
  });

  it("should handle all optional fields together", () => {
    const result = buildReceptorXml(
      minimalReceptor({
        identificacion: { tipo: "02", numero: "3109876543" },
        identificacionExtranjero: "PA-RUC-555",
        nombreComercial: "Import Co",
        ubicacion: {
          provincia: "7",
          canton: "01",
          distrito: "01",
          barrio: "01",
          otrasSenas: "Zona franca",
        },
        telefono: { codigoPais: "507", numTelefono: "12345678" },
        fax: { codigoPais: "507", numTelefono: "87654321" },
        correoElectronico: "import@co.pa",
      }),
    );
    expect(result).toHaveProperty("Identificacion");
    expect(result).toHaveProperty("IdentificacionExtranjero");
    expect(result).toHaveProperty("NombreComercial");
    expect(result).toHaveProperty("Ubicacion");
    expect(result).toHaveProperty("Telefono");
    expect(result).toHaveProperty("Fax");
    expect(result).toHaveProperty("CorreoElectronico");
  });
});

// ---------------------------------------------------------------------------
// buildResumenFacturaXml
// ---------------------------------------------------------------------------

describe("buildResumenFacturaXml", () => {
  it("should include CodigoTipoMoneda when present", () => {
    const result = buildResumenFacturaXml(
      minimalResumen({
        codigoTipoMoneda: { codigoMoneda: "USD" as never, tipoCambio: 530.5 },
      }),
    );
    expect(result.CodigoTipoMoneda).toEqual({ CodigoMoneda: "USD", TipoCambio: 530.5 });
  });

  it("should not include CodigoTipoMoneda when absent", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result).not.toHaveProperty("CodigoTipoMoneda");
  });

  it("should include TotalServExonerado when > 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalServExonerado: 50000 }));
    expect(result.TotalServExonerado).toBe(50000);
  });

  it("should not include TotalServExonerado when 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalServExonerado: 0 }));
    expect(result).not.toHaveProperty("TotalServExonerado");
  });

  it("should not include TotalServExonerado when undefined", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result).not.toHaveProperty("TotalServExonerado");
  });

  it("should include TotalMercExonerada when > 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalMercExonerada: 75000 }));
    expect(result.TotalMercExonerada).toBe(75000);
  });

  it("should not include TotalMercExonerada when 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalMercExonerada: 0 }));
    expect(result).not.toHaveProperty("TotalMercExonerada");
  });

  it("should not include TotalMercExonerada when undefined", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result).not.toHaveProperty("TotalMercExonerada");
  });

  it("should include TotalExonerado when > 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalExonerado: 125000 }));
    expect(result.TotalExonerado).toBe(125000);
  });

  it("should not include TotalExonerado when 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalExonerado: 0 }));
    expect(result).not.toHaveProperty("TotalExonerado");
  });

  it("should not include TotalExonerado when undefined", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result).not.toHaveProperty("TotalExonerado");
  });

  it("should include TotalIVADevuelto when > 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalIVADevuelto: 5000 }));
    expect(result.TotalIVADevuelto).toBe(5000);
  });

  it("should not include TotalIVADevuelto when 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalIVADevuelto: 0 }));
    expect(result).not.toHaveProperty("TotalIVADevuelto");
  });

  it("should not include TotalIVADevuelto when undefined", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result).not.toHaveProperty("TotalIVADevuelto");
  });

  it("should include TotalOtrosCargos when > 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalOtrosCargos: 2500 }));
    expect(result.TotalOtrosCargos).toBe(2500);
  });

  it("should not include TotalOtrosCargos when 0", () => {
    const result = buildResumenFacturaXml(minimalResumen({ totalOtrosCargos: 0 }));
    expect(result).not.toHaveProperty("TotalOtrosCargos");
  });

  it("should not include TotalOtrosCargos when undefined", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result).not.toHaveProperty("TotalOtrosCargos");
  });

  it("should always include required summary totals", () => {
    const result = buildResumenFacturaXml(minimalResumen());
    expect(result.TotalServGravados).toBe(100000);
    expect(result.TotalServExentos).toBe(0);
    expect(result.TotalMercanciasGravadas).toBe(0);
    expect(result.TotalMercanciasExentas).toBe(0);
    expect(result.TotalGravado).toBe(100000);
    expect(result.TotalExento).toBe(0);
    expect(result.TotalVenta).toBe(100000);
    expect(result.TotalDescuentos).toBe(0);
    expect(result.TotalVentaNeta).toBe(100000);
    expect(result.TotalImpuesto).toBe(13000);
    expect(result.TotalComprobante).toBe(113000);
  });
});

// ---------------------------------------------------------------------------
// buildOtrosCargosXml
// ---------------------------------------------------------------------------

describe("buildOtrosCargosXml", () => {
  it("should map required fields", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "06", detalle: "Servicio de flete", montoOtroCargo: 5000 },
    ]);
    expect(result.OtroCargo).toEqual([
      { TipoDocumento: "06", Detalle: "Servicio de flete", MontoOtroCargo: 5000 },
    ]);
  });

  it("should include NumeroIdentidadTercero when present", () => {
    const result = buildOtrosCargosXml([
      {
        tipoDocumento: "06",
        numeroIdentidadTercero: "3101999999",
        detalle: "Cargo tercero",
        montoOtroCargo: 3000,
      },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo.NumeroIdentidadTercero).toBe("3101999999");
  });

  it("should not include NumeroIdentidadTercero when absent", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "06", detalle: "Cargo simple", montoOtroCargo: 1000 },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo).not.toHaveProperty("NumeroIdentidadTercero");
  });

  it("should include NombreTercero when present", () => {
    const result = buildOtrosCargosXml([
      {
        tipoDocumento: "01",
        nombreTercero: "Transportes ABC",
        detalle: "Flete internacional",
        montoOtroCargo: 15000,
      },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo.NombreTercero).toBe("Transportes ABC");
  });

  it("should not include NombreTercero when absent", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "01", detalle: "Cargo", montoOtroCargo: 500 },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo).not.toHaveProperty("NombreTercero");
  });

  it("should include Porcentaje when present", () => {
    const result = buildOtrosCargosXml([
      {
        tipoDocumento: "02",
        detalle: "Cargo porcentual",
        porcentaje: 10,
        montoOtroCargo: 10000,
      },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo.Porcentaje).toBe(10);
  });

  it("should include Porcentaje when zero", () => {
    const result = buildOtrosCargosXml([
      {
        tipoDocumento: "02",
        detalle: "Cargo con porcentaje cero",
        porcentaje: 0,
        montoOtroCargo: 0,
      },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo.Porcentaje).toBe(0);
  });

  it("should not include Porcentaje when undefined", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "02", detalle: "Sin porcentaje", montoOtroCargo: 2000 },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo).not.toHaveProperty("Porcentaje");
  });

  it("should include all optional fields together", () => {
    const result = buildOtrosCargosXml([
      {
        tipoDocumento: "07",
        numeroIdentidadTercero: "105550123",
        nombreTercero: "Juan Perez",
        detalle: "Comision completa",
        porcentaje: 5,
        montoOtroCargo: 2500,
      },
    ]);
    const cargo = (result.OtroCargo as Record<string, unknown>[])[0];
    expect(cargo.NumeroIdentidadTercero).toBe("105550123");
    expect(cargo.NombreTercero).toBe("Juan Perez");
    expect(cargo.Porcentaje).toBe(5);
    expect(cargo.Detalle).toBe("Comision completa");
    expect(cargo.MontoOtroCargo).toBe(2500);
  });

  it("should handle multiple cargos", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "01", detalle: "Cargo 1", montoOtroCargo: 1000 },
      { tipoDocumento: "02", detalle: "Cargo 2", montoOtroCargo: 2000, porcentaje: 5 },
    ]);
    const cargos = result.OtroCargo as Record<string, unknown>[];
    expect(cargos).toHaveLength(2);
    expect(cargos[0].TipoDocumento).toBe("01");
    expect(cargos[1].Porcentaje).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// buildInformacionReferenciaXml
// ---------------------------------------------------------------------------

describe("buildInformacionReferenciaXml", () => {
  it("should map a single reference", () => {
    const refs: InformacionReferencia[] = [
      {
        tipoDoc: "01" as never,
        numero: "50601012500310123456700100001010000000099199999999",
        fechaEmision: "2025-06-15T08:00:00-06:00",
        codigo: "01" as never,
        razon: "Correccion del monto",
      },
    ];
    const result = buildInformacionReferenciaXml(refs);
    expect(result).toEqual([
      {
        TipoDoc: "01",
        Numero: "50601012500310123456700100001010000000099199999999",
        FechaEmision: "2025-06-15T08:00:00-06:00",
        Codigo: "01",
        Razon: "Correccion del monto",
      },
    ]);
  });

  it("should map multiple references", () => {
    const refs: InformacionReferencia[] = [
      {
        tipoDoc: "01" as never,
        numero: "clave-001",
        fechaEmision: "2025-01-01T00:00:00-06:00",
        codigo: "01" as never,
        razon: "Razon 1",
      },
      {
        tipoDoc: "03" as never,
        numero: "clave-002",
        fechaEmision: "2025-02-01T00:00:00-06:00",
        codigo: "02" as never,
        razon: "Razon 2",
      },
    ];
    const result = buildInformacionReferenciaXml(refs);
    expect(result).toHaveLength(2);
    expect(result[0].TipoDoc).toBe("01");
    expect(result[1].TipoDoc).toBe("03");
    expect(result[1].Codigo).toBe("02");
  });

  it("should preserve all fields exactly", () => {
    const refs: InformacionReferencia[] = [
      {
        tipoDoc: "14" as never,
        numero: "ABC-123",
        fechaEmision: "2025-12-31T23:59:59-06:00",
        codigo: "99" as never,
        razon: "Otro motivo de referencia",
      },
    ];
    const result = buildInformacionReferenciaXml(refs);
    expect(result[0]).toEqual({
      TipoDoc: "14",
      Numero: "ABC-123",
      FechaEmision: "2025-12-31T23:59:59-06:00",
      Codigo: "99",
      Razon: "Otro motivo de referencia",
    });
  });
});

// ---------------------------------------------------------------------------
// buildOtrosXml
// ---------------------------------------------------------------------------

describe("buildOtrosXml", () => {
  it("should map a single OtroContenido", () => {
    const otros: OtroContenido[] = [{ contenido: "<MiTag>valor</MiTag>" }];
    const result = buildOtrosXml(otros);
    expect(result).toEqual({
      OtroContenido: [{ "#text": "<MiTag>valor</MiTag>" }],
    });
  });

  it("should map multiple OtroContenido entries", () => {
    const otros: OtroContenido[] = [
      { contenido: "contenido-1" },
      { contenido: "contenido-2" },
      { contenido: "contenido-3" },
    ];
    const result = buildOtrosXml(otros);
    const items = result.OtroContenido as Record<string, unknown>[];
    expect(items).toHaveLength(3);
    expect(items[0]["#text"]).toBe("contenido-1");
    expect(items[2]["#text"]).toBe("contenido-3");
  });
});

// ---------------------------------------------------------------------------
// buildStandardDocumentBody
// ---------------------------------------------------------------------------

describe("buildStandardDocumentBody", () => {
  it("should include required fields", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields());
    expect(result.Clave).toBe("50601012600310123456700100001010000000001199999999");
    expect(result.CodigoActividad).toBe("620100");
    expect(result.NumeroConsecutivo).toBe("00100001010000000001");
    expect(result.FechaEmision).toBe("2025-07-27T10:30:00-06:00");
    expect(result).toHaveProperty("Emisor");
    expect(result.CondicionVenta).toBe("01");
    expect(result.MedioPago).toEqual(["01"]);
    expect(result).toHaveProperty("DetalleServicio");
    expect(result).toHaveProperty("ResumenFactura");
  });

  it("should not include Receptor when absent", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields());
    expect(result).not.toHaveProperty("Receptor");
  });

  it("should include Receptor when present", () => {
    const result = buildStandardDocumentBody(
      minimalDocumentFields({
        receptor: minimalReceptor({ identificacion: { tipo: "01", numero: "101110222" } }),
      }),
    );
    expect(result).toHaveProperty("Receptor");
    const receptor = result.Receptor as Record<string, unknown>;
    expect(receptor.Nombre).toBe("Cliente Test");
  });

  it("should not include PlazoCredito when absent", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields());
    expect(result).not.toHaveProperty("PlazoCredito");
  });

  it("should include PlazoCredito when present", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields({ plazoCredito: "60" }));
    expect(result.PlazoCredito).toBe("60");
  });

  it("should not include OtrosCargos when absent", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields());
    expect(result).not.toHaveProperty("OtrosCargos");
  });

  it("should not include OtrosCargos when empty array", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields({ otrosCargos: [] }));
    expect(result).not.toHaveProperty("OtrosCargos");
  });

  it("should include OtrosCargos when present", () => {
    const result = buildStandardDocumentBody(
      minimalDocumentFields({
        otrosCargos: [{ tipoDocumento: "06", detalle: "Flete", montoOtroCargo: 5000 }],
      }),
    );
    expect(result).toHaveProperty("OtrosCargos");
  });

  it("should not include InformacionReferencia when absent", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields());
    expect(result).not.toHaveProperty("InformacionReferencia");
  });

  it("should not include InformacionReferencia when empty array", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields({ informacionReferencia: [] }));
    expect(result).not.toHaveProperty("InformacionReferencia");
  });

  it("should include InformacionReferencia when present", () => {
    const result = buildStandardDocumentBody(
      minimalDocumentFields({
        informacionReferencia: [
          {
            tipoDoc: "01" as never,
            numero: "clave-ref",
            fechaEmision: "2025-01-01T00:00:00-06:00",
            codigo: "01" as never,
            razon: "Correccion",
          },
        ],
      }),
    );
    expect(result).toHaveProperty("InformacionReferencia");
    const refs = result.InformacionReferencia as Record<string, unknown>[];
    expect(refs[0].TipoDoc).toBe("01");
  });

  it("should not include Otros when absent", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields());
    expect(result).not.toHaveProperty("Otros");
  });

  it("should not include Otros when empty array", () => {
    const result = buildStandardDocumentBody(minimalDocumentFields({ otros: [] }));
    expect(result).not.toHaveProperty("Otros");
  });

  it("should include Otros when present", () => {
    const result = buildStandardDocumentBody(
      minimalDocumentFields({ otros: [{ contenido: "<Extra>data</Extra>" }] }),
    );
    expect(result).toHaveProperty("Otros");
    const otros = result.Otros as Record<string, unknown>;
    const items = otros.OtroContenido as Record<string, unknown>[];
    expect(items[0]["#text"]).toBe("<Extra>data</Extra>");
  });

  it("should include all optional fields together", () => {
    const result = buildStandardDocumentBody(
      minimalDocumentFields({
        receptor: minimalReceptor(),
        plazoCredito: "90",
        otrosCargos: [{ tipoDocumento: "01", detalle: "Cargo", montoOtroCargo: 100 }],
        informacionReferencia: [
          {
            tipoDoc: "01" as never,
            numero: "ref-1",
            fechaEmision: "2025-01-01T00:00:00-06:00",
            codigo: "04" as never,
            razon: "Referencia",
          },
        ],
        otros: [{ contenido: "extra" }],
      }),
    );
    expect(result).toHaveProperty("Receptor");
    expect(result.PlazoCredito).toBe("90");
    expect(result).toHaveProperty("OtrosCargos");
    expect(result).toHaveProperty("InformacionReferencia");
    expect(result).toHaveProperty("Otros");
  });
});
