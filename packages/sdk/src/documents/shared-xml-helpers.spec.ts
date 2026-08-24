/**
 * Tests for the shared v4.4 XML mapping helpers.
 *
 * Covers field mapping, optional-field emission, per-variant structural
 * differences, and — because fast-xml-parser derives element order from
 * object key insertion order — the exact key order mandated by the XSDs.
 */

import { describe, it, expect } from "vitest";
import {
  DOCUMENT_VARIANTS,
  buildEmisorXml,
  buildReceptorXml,
  buildImpuestoXml,
  buildDescuentoXml,
  buildLineaDetalleXml,
  buildResumenFacturaXml,
  buildOtrosCargosXml,
  buildInformacionReferenciaXml,
  buildOtrosXml,
  buildStandardDocumentBody,
} from "./shared-xml-helpers.js";
import type { CommonDocumentFields } from "./shared-xml-helpers.js";
import type {
  Emisor,
  Receptor,
  Impuesto,
  Descuento,
  LineaDetalle,
  ResumenFactura,
  OtroCargo,
  InformacionReferencia,
  OtroContenido,
  Exoneracion,
} from "@dojocoding/hacienda-shared";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function baseEmisor(overrides: Partial<Emisor> = {}): Emisor {
  return {
    nombre: "Empresa Test S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    ubicacion: {
      provincia: "1",
      canton: "01",
      distrito: "01",
      otrasSenas: "Frente al parque central",
    },
    correoElectronico: "facturas@example.com",
    ...overrides,
  };
}

function baseReceptor(overrides: Partial<Receptor> = {}): Receptor {
  return {
    nombre: "Cliente Test",
    ...overrides,
  };
}

function baseImpuesto(overrides: Partial<Impuesto> = {}): Impuesto {
  return {
    codigo: "01",
    codigoTarifaIVA: "08",
    tarifa: 13,
    monto: 130,
    ...overrides,
  };
}

function baseExoneracion(overrides: Partial<Exoneracion> = {}): Exoneracion {
  return {
    tipoDocumento: "03",
    numeroDocumento: "AL-00001-2026",
    nombreInstitucion: "02",
    fechaEmision: "2026-01-15T00:00:00-06:00",
    tarifaExonerada: 13,
    montoExoneracion: 130,
    ...overrides,
  };
}

function baseLinea(overrides: Partial<LineaDetalle> = {}): LineaDetalle {
  return {
    numeroLinea: 1,
    codigoCabys: "8399000000000",
    cantidad: 1,
    unidadMedida: "Sp",
    detalle: "Servicios profesionales",
    precioUnitario: 1000,
    montoTotal: 1000,
    subTotal: 1000,
    impuesto: [baseImpuesto()],
    montoTotalLinea: 1130,
    ...overrides,
  };
}

function baseResumen(overrides: Partial<ResumenFactura> = {}): ResumenFactura {
  return {
    totalVenta: 1000,
    totalVentaNeta: 1000,
    totalComprobante: 1130,
    ...overrides,
  };
}

function baseFields(overrides: Partial<CommonDocumentFields> = {}): CommonDocumentFields {
  return {
    clave: "50624082600310123456700100001010000000001199999999",
    proveedorSistemas: "3101234567",
    codigoActividadEmisor: "620100",
    numeroConsecutivo: "00100001010000000001",
    fechaEmision: "2026-08-24T10:30:00-06:00",
    emisor: baseEmisor(),
    condicionVenta: "01",
    detalleServicio: [baseLinea()],
    resumenFactura: baseResumen(),
    ...overrides,
  };
}

function baseReferencia(overrides: Partial<InformacionReferencia> = {}): InformacionReferencia {
  return {
    tipoDoc: "01",
    fechaEmision: "2026-06-15T08:00:00-06:00",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildEmisorXml
// ---------------------------------------------------------------------------

describe("buildEmisorXml", () => {
  it("should map Nombre, Identificacion, Ubicacion and CorreoElectronico for a base emisor", () => {
    const result = buildEmisorXml(baseEmisor());
    expect(result).toEqual({
      Nombre: "Empresa Test S.A.",
      Identificacion: { Tipo: "02", Numero: "3101234567" },
      Ubicacion: {
        Provincia: "1",
        Canton: "01",
        Distrito: "01",
        OtrasSenas: "Frente al parque central",
      },
      CorreoElectronico: "facturas@example.com",
    });
  });

  it("should emit elements in the v4.4 XSD order when all optionals are present", () => {
    const result = buildEmisorXml(
      baseEmisor({
        registrofiscal8707: "870700012345",
        nombreComercial: "MiMarca",
        telefono: { codigoPais: "506", numTelefono: "88887777" },
      }),
    );
    expect(Object.keys(result)).toEqual([
      "Nombre",
      "Identificacion",
      "Registrofiscal8707",
      "NombreComercial",
      "Ubicacion",
      "Telefono",
      "CorreoElectronico",
    ]);
  });

  it("should include Registrofiscal8707 when present", () => {
    const result = buildEmisorXml(baseEmisor({ registrofiscal8707: "870700012345" }));
    expect(result.Registrofiscal8707).toBe("870700012345");
  });

  it("should not include Registrofiscal8707 when absent", () => {
    const result = buildEmisorXml(baseEmisor());
    expect(result).not.toHaveProperty("Registrofiscal8707");
  });

  it("should include NombreComercial when present", () => {
    const result = buildEmisorXml(baseEmisor({ nombreComercial: "MiMarca" }));
    expect(result.NombreComercial).toBe("MiMarca");
  });

  it("should not include NombreComercial when absent", () => {
    const result = buildEmisorXml(baseEmisor());
    expect(result).not.toHaveProperty("NombreComercial");
  });

  it("should include Barrio inside Ubicacion when present", () => {
    const result = buildEmisorXml(
      baseEmisor({
        ubicacion: {
          provincia: "2",
          canton: "03",
          distrito: "04",
          barrio: "02",
          otrasSenas: "200m norte de la iglesia",
        },
      }),
    );
    expect(result.Ubicacion).toEqual({
      Provincia: "2",
      Canton: "03",
      Distrito: "04",
      Barrio: "02",
      OtrasSenas: "200m norte de la iglesia",
    });
  });

  it("should omit Barrio from Ubicacion when absent", () => {
    const result = buildEmisorXml(baseEmisor());
    expect(result.Ubicacion).not.toHaveProperty("Barrio");
  });

  it("should include Telefono when present", () => {
    const result = buildEmisorXml(
      baseEmisor({ telefono: { codigoPais: "506", numTelefono: "88887777" } }),
    );
    expect(result.Telefono).toEqual({ CodigoPais: "506", NumTelefono: "88887777" });
  });

  it("should not include Telefono when absent", () => {
    const result = buildEmisorXml(baseEmisor());
    expect(result).not.toHaveProperty("Telefono");
  });

  it("should not emit a Fax element (removed in v4.4)", () => {
    const legacy = {
      ...baseEmisor(),
      fax: { codigoPais: "506", numTelefono: "22224444" },
    } as unknown as Emisor;
    const result = buildEmisorXml(legacy);
    expect(result).not.toHaveProperty("Fax");
  });

  it("should pass through an array of up to 4 correos", () => {
    const correos = ["a@example.com", "b@example.com", "c@example.com", "d@example.com"];
    const result = buildEmisorXml(baseEmisor({ correoElectronico: correos }));
    expect(result.CorreoElectronico).toEqual(correos);
  });

  it("should emit only Nombre, Identificacion and CorreoElectronico when minimal (REP)", () => {
    const result = buildEmisorXml(
      baseEmisor({
        registrofiscal8707: "870700012345",
        nombreComercial: "MiMarca",
        telefono: { codigoPais: "506", numTelefono: "88887777" },
      }),
      true,
    );
    expect(Object.keys(result)).toEqual(["Nombre", "Identificacion", "CorreoElectronico"]);
  });
});

// ---------------------------------------------------------------------------
// buildReceptorXml
// ---------------------------------------------------------------------------

describe("buildReceptorXml", () => {
  it("should map only Nombre for a bare receptor", () => {
    const result = buildReceptorXml(baseReceptor());
    expect(result).toEqual({ Nombre: "Cliente Test" });
  });

  it("should emit elements in the v4.4 XSD order when all optionals are present", () => {
    const result = buildReceptorXml(
      baseReceptor({
        identificacion: { tipo: "05", numero: "US-EIN-99-1234567" },
        nombreComercial: "Import Co",
        ubicacion: {
          provincia: "7",
          canton: "01",
          distrito: "01",
          otrasSenas: "Zona franca",
        },
        otrasSenasExtranjero: "742 Evergreen Terrace, Springfield, USA",
        telefono: { codigoPais: "1", numTelefono: "5551234567" },
        correoElectronico: "import@co.example",
      }),
    );
    expect(Object.keys(result)).toEqual([
      "Nombre",
      "Identificacion",
      "NombreComercial",
      "Ubicacion",
      "OtrasSenasExtranjero",
      "Telefono",
      "CorreoElectronico",
    ]);
  });

  it("should include Identificacion when present", () => {
    const result = buildReceptorXml(
      baseReceptor({ identificacion: { tipo: "01", numero: "101230456" } }),
    );
    expect(result.Identificacion).toEqual({ Tipo: "01", Numero: "101230456" });
  });

  it("should include NombreComercial when present", () => {
    const result = buildReceptorXml(baseReceptor({ nombreComercial: "Tienda XYZ" }));
    expect(result.NombreComercial).toBe("Tienda XYZ");
  });

  it("should include Ubicacion with Barrio and OtrasSenas when present", () => {
    const result = buildReceptorXml(
      baseReceptor({
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

  it("should omit Barrio from Ubicacion when absent", () => {
    const result = buildReceptorXml(
      baseReceptor({
        ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "Calle 1" },
      }),
    );
    expect(result.Ubicacion).not.toHaveProperty("Barrio");
  });

  it("should include OtrasSenasExtranjero when present", () => {
    const result = buildReceptorXml(
      baseReceptor({ otrasSenasExtranjero: "Calle Falsa 123, Ciudad de Panama" }),
    );
    expect(result.OtrasSenasExtranjero).toBe("Calle Falsa 123, Ciudad de Panama");
  });

  it("should include Telefono when present", () => {
    const result = buildReceptorXml(
      baseReceptor({ telefono: { codigoPais: "506", numTelefono: "77778888" } }),
    );
    expect(result.Telefono).toEqual({ CodigoPais: "506", NumTelefono: "77778888" });
  });

  it("should include CorreoElectronico when present", () => {
    const result = buildReceptorXml(baseReceptor({ correoElectronico: "cliente@test.com" }));
    expect(result.CorreoElectronico).toBe("cliente@test.com");
  });

  it("should not emit Fax or IdentificacionExtranjero (removed in v4.4)", () => {
    const legacy = {
      ...baseReceptor(),
      fax: { codigoPais: "506", numTelefono: "55556666" },
      identificacionExtranjero: "US-EIN-99-1234567",
    } as unknown as Receptor;
    const result = buildReceptorXml(legacy);
    expect(result).not.toHaveProperty("Fax");
    expect(result).not.toHaveProperty("IdentificacionExtranjero");
  });

  it("should emit only Nombre, Identificacion and CorreoElectronico when minimal (REP)", () => {
    const result = buildReceptorXml(
      baseReceptor({
        identificacion: { tipo: "01", numero: "101230456" },
        nombreComercial: "Tienda XYZ",
        ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "Calle 1" },
        otrasSenasExtranjero: "Foreign address",
        telefono: { codigoPais: "506", numTelefono: "77778888" },
        correoElectronico: "cliente@test.com",
      }),
      true,
    );
    expect(Object.keys(result)).toEqual(["Nombre", "Identificacion", "CorreoElectronico"]);
  });
});

// ---------------------------------------------------------------------------
// buildImpuestoXml
// ---------------------------------------------------------------------------

describe("buildImpuestoXml", () => {
  it("should map only Codigo and Monto for a bare tax", () => {
    const result = buildImpuestoXml({ codigo: "02", monto: 500 });
    expect(result).toEqual({ Codigo: "02", Monto: 500 });
  });

  it("should emit elements in the v4.4 XSD order when all optionals are present", () => {
    const result = buildImpuestoXml(
      baseImpuesto({
        codigo: "99",
        codigoImpuestoOtros: "Impuesto municipal",
        factorCalculoIVA: 0.04,
        exoneracion: baseExoneracion(),
      }),
    );
    expect(Object.keys(result)).toEqual([
      "Codigo",
      "CodigoImpuestoOTRO",
      "CodigoTarifaIVA",
      "Tarifa",
      "FactorCalculoIVA",
      "Monto",
      "Exoneracion",
    ]);
  });

  it("should include CodigoImpuestoOTRO when present", () => {
    const result = buildImpuestoXml(
      baseImpuesto({ codigo: "99", codigoImpuestoOtros: "Impuesto municipal" }),
    );
    expect(result.CodigoImpuestoOTRO).toBe("Impuesto municipal");
  });

  it("should emit the IVA rate code as CodigoTarifaIVA (renamed in v4.4)", () => {
    const result = buildImpuestoXml(baseImpuesto());
    expect(result.CodigoTarifaIVA).toBe("08");
    expect(result).not.toHaveProperty("CodigoTarifa");
  });

  it("should emit Tarifa when zero", () => {
    const result = buildImpuestoXml(baseImpuesto({ codigoTarifaIVA: "01", tarifa: 0, monto: 0 }));
    expect(result.Tarifa).toBe(0);
  });

  it("should include FactorCalculoIVA when present", () => {
    const result = buildImpuestoXml(baseImpuesto({ codigo: "08", factorCalculoIVA: 1.5 }));
    expect(result.FactorCalculoIVA).toBe(1.5);
  });

  it("should not include FactorCalculoIVA when absent", () => {
    const result = buildImpuestoXml(baseImpuesto());
    expect(result).not.toHaveProperty("FactorCalculoIVA");
  });

  it("should map a minimal Exoneracion with the v4.4 element names and order", () => {
    const result = buildImpuestoXml(baseImpuesto({ exoneracion: baseExoneracion() }));
    expect(result.Exoneracion).toEqual({
      TipoDocumentoEX1: "03",
      NumeroDocumento: "AL-00001-2026",
      NombreInstitucion: "02",
      FechaEmisionEX: "2026-01-15T00:00:00-06:00",
      TarifaExonerada: 13,
      MontoExoneracion: 130,
    });
    expect(Object.keys(result.Exoneracion as Record<string, unknown>)).toEqual([
      "TipoDocumentoEX1",
      "NumeroDocumento",
      "NombreInstitucion",
      "FechaEmisionEX",
      "TarifaExonerada",
      "MontoExoneracion",
    ]);
  });

  it("should emit all optional Exoneracion fields in the v4.4 order", () => {
    const result = buildImpuestoXml(
      baseImpuesto({
        exoneracion: baseExoneracion({
          tipoDocumento: "99",
          tipoDocumentoOtros: "Decreto especial",
          articulo: 5,
          inciso: 2,
          nombreInstitucion: "99",
          nombreInstitucionOtros: "Institucion especial",
        }),
      }),
    );
    expect(Object.keys(result.Exoneracion as Record<string, unknown>)).toEqual([
      "TipoDocumentoEX1",
      "TipoDocumentoOTRO",
      "NumeroDocumento",
      "Articulo",
      "Inciso",
      "NombreInstitucion",
      "NombreInstitucionOtros",
      "FechaEmisionEX",
      "TarifaExonerada",
      "MontoExoneracion",
    ]);
    const exo = result.Exoneracion as Record<string, unknown>;
    expect(exo.TipoDocumentoOTRO).toBe("Decreto especial");
    expect(exo.Articulo).toBe(5);
    expect(exo.Inciso).toBe(2);
    expect(exo.NombreInstitucionOtros).toBe("Institucion especial");
  });

  it("should emit Articulo and Inciso when zero", () => {
    const result = buildImpuestoXml(
      baseImpuesto({ exoneracion: baseExoneracion({ articulo: 0, inciso: 0 }) }),
    );
    const exo = result.Exoneracion as Record<string, unknown>;
    expect(exo.Articulo).toBe(0);
    expect(exo.Inciso).toBe(0);
  });

  it("should not include Exoneracion when absent", () => {
    const result = buildImpuestoXml(baseImpuesto());
    expect(result).not.toHaveProperty("Exoneracion");
  });
});

// ---------------------------------------------------------------------------
// buildDescuentoXml
// ---------------------------------------------------------------------------

describe("buildDescuentoXml", () => {
  it("should map MontoDescuento and CodigoDescuento for a bare discount", () => {
    const result = buildDescuentoXml({ montoDescuento: 100, codigoDescuento: "01" });
    expect(result).toEqual({ MontoDescuento: 100, CodigoDescuento: "01" });
  });

  it("should emit elements in the v4.4 XSD order when all optionals are present", () => {
    const descuento: Descuento = {
      montoDescuento: 50,
      codigoDescuento: "99",
      codigoDescuentoOtros: "Descuento especial",
      naturalezaDescuento: "Cliente frecuente",
    };
    const result = buildDescuentoXml(descuento);
    expect(Object.keys(result)).toEqual([
      "MontoDescuento",
      "CodigoDescuento",
      "CodigoDescuentoOTRO",
      "NaturalezaDescuento",
    ]);
    expect(result.CodigoDescuentoOTRO).toBe("Descuento especial");
    expect(result.NaturalezaDescuento).toBe("Cliente frecuente");
  });

  it("should not include CodigoDescuentoOTRO or NaturalezaDescuento when absent", () => {
    const result = buildDescuentoXml({ montoDescuento: 100, codigoDescuento: "02" });
    expect(result).not.toHaveProperty("CodigoDescuentoOTRO");
    expect(result).not.toHaveProperty("NaturalezaDescuento");
  });
});

// ---------------------------------------------------------------------------
// buildLineaDetalleXml
// ---------------------------------------------------------------------------

describe("buildLineaDetalleXml", () => {
  it("should emit the CABYS code as CodigoCABYS (renamed from Codigo in v4.4)", () => {
    const result = buildLineaDetalleXml(baseLinea());
    expect(result.CodigoCABYS).toBe("8399000000000");
    expect(result).not.toHaveProperty("Codigo");
  });

  it("should emit a fully-populated Factura line in the v4.4 XSD order", () => {
    const result = buildLineaDetalleXml(
      baseLinea({
        codigoComercial: [{ tipo: "04", codigo: "SKU-001" }],
        tipoTransaccion: "01",
        unidadMedidaComercial: "Hora",
        numeroVINoSerie: ["1HGCM82633A004352"],
        descuento: [{ montoDescuento: 100, codigoDescuento: "01" }],
        baseImponible: 900,
        impuestoAsumidoEmisorFabrica: 10,
        impuestoNeto: 117,
      }),
      DOCUMENT_VARIANTS.FacturaElectronica,
    );
    expect(Object.keys(result)).toEqual([
      "NumeroLinea",
      "CodigoCABYS",
      "CodigoComercial",
      "Cantidad",
      "UnidadMedida",
      "TipoTransaccion",
      "UnidadMedidaComercial",
      "Detalle",
      "NumeroVINoSerie",
      "PrecioUnitario",
      "MontoTotal",
      "Descuento",
      "SubTotal",
      "BaseImponible",
      "Impuesto",
      "ImpuestoAsumidoEmisorFabrica",
      "ImpuestoNeto",
      "MontoTotalLinea",
    ]);
  });

  it("should default BaseImponible to subTotal when omitted", () => {
    const result = buildLineaDetalleXml(baseLinea({ subTotal: 850 }));
    expect(result.BaseImponible).toBe(850);
  });

  it("should use the explicit baseImponible when provided", () => {
    const result = buildLineaDetalleXml(baseLinea({ baseImponible: 750 }));
    expect(result.BaseImponible).toBe(750);
  });

  it("should default ImpuestoAsumidoEmisorFabrica to 0 when the variant requires it", () => {
    const result = buildLineaDetalleXml(baseLinea(), DOCUMENT_VARIANTS.FacturaElectronica);
    expect(result.ImpuestoAsumidoEmisorFabrica).toBe(0);
  });

  it("should default ImpuestoNeto to 0 when the variant requires it", () => {
    const result = buildLineaDetalleXml(baseLinea(), DOCUMENT_VARIANTS.FacturaElectronica);
    expect(result.ImpuestoNeto).toBe(0);
  });

  it("should map CodigoComercial entries and omit them when the array is empty", () => {
    const withCodes = buildLineaDetalleXml(
      baseLinea({ codigoComercial: [{ tipo: "01", codigo: "A-1" }] }),
    );
    expect(withCodes.CodigoComercial).toEqual([{ Tipo: "01", Codigo: "A-1" }]);

    const withoutCodes = buildLineaDetalleXml(baseLinea({ codigoComercial: [] }));
    expect(withoutCodes).not.toHaveProperty("CodigoComercial");
  });

  it("should map Descuento entries through buildDescuentoXml and omit them when empty", () => {
    const withDiscount = buildLineaDetalleXml(
      baseLinea({ descuento: [{ montoDescuento: 100, codigoDescuento: "01" }] }),
    );
    expect(withDiscount.Descuento).toEqual([{ MontoDescuento: 100, CodigoDescuento: "01" }]);

    const withoutDiscount = buildLineaDetalleXml(baseLinea({ descuento: [] }));
    expect(withoutDiscount).not.toHaveProperty("Descuento");
  });

  it("should omit Impuesto when the tax array is empty", () => {
    const result = buildLineaDetalleXml(baseLinea({ impuesto: [] }));
    expect(result).not.toHaveProperty("Impuesto");
  });

  it("should not emit PartidaArancelaria for a Factura line even when present", () => {
    const result = buildLineaDetalleXml(
      baseLinea({ partidaArancelaria: "8471300000" }),
      DOCUMENT_VARIANTS.FacturaElectronica,
    );
    expect(result).not.toHaveProperty("PartidaArancelaria");
  });

  it("should emit PartidaArancelaria between NumeroLinea and CodigoCABYS for a Nota de Credito line", () => {
    const result = buildLineaDetalleXml(
      baseLinea({ partidaArancelaria: "8471300000" }),
      DOCUMENT_VARIANTS.NotaCreditoElectronica,
    );
    expect(result.PartidaArancelaria).toBe("8471300000");
    expect(Object.keys(result).slice(0, 3)).toEqual([
      "NumeroLinea",
      "PartidaArancelaria",
      "CodigoCABYS",
    ]);
  });

  it("should not emit ImpuestoAsumidoEmisorFabrica for a Nota de Credito line", () => {
    const result = buildLineaDetalleXml(
      baseLinea({ impuestoAsumidoEmisorFabrica: 10 }),
      DOCUMENT_VARIANTS.NotaCreditoElectronica,
    );
    expect(result).not.toHaveProperty("ImpuestoAsumidoEmisorFabrica");
  });

  it("should omit BaseImponible, ImpuestoNeto and ImpuestoAsumido for an Exportacion line", () => {
    const result = buildLineaDetalleXml(
      baseLinea({ baseImponible: 900, impuestoNeto: 117, impuestoAsumidoEmisorFabrica: 10 }),
      DOCUMENT_VARIANTS.FacturaElectronicaExportacion,
    );
    expect(result).not.toHaveProperty("BaseImponible");
    expect(result).not.toHaveProperty("ImpuestoNeto");
    expect(result).not.toHaveProperty("ImpuestoAsumidoEmisorFabrica");
    expect(result.CodigoCABYS).toBe("8399000000000");
  });

  it("should emit the reduced REP line structure in the REP XSD order", () => {
    const result = buildLineaDetalleXml(
      baseLinea({
        partidaArancelaria: "8471300000",
        codigoComercial: [{ tipo: "01", codigo: "A-1" }],
        descuento: [{ montoDescuento: 100, codigoDescuento: "01" }],
        baseImponible: 900,
      }),
      DOCUMENT_VARIANTS.ReciboElectronicoPago,
    );
    expect(Object.keys(result)).toEqual([
      "NumeroLinea",
      "Detalle",
      "MontoTotal",
      "SubTotal",
      "Impuesto",
      "ImpuestoNeto",
      "MontoTotalLinea",
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildResumenFacturaXml
// ---------------------------------------------------------------------------

describe("buildResumenFacturaXml", () => {
  it("should default CodigoTipoMoneda to CRC with exchange rate 1 when omitted", () => {
    const result = buildResumenFacturaXml(baseResumen());
    expect(result.CodigoTipoMoneda).toEqual({ CodigoMoneda: "CRC", TipoCambio: 1 });
  });

  it("should use the provided codigoTipoMoneda", () => {
    const result = buildResumenFacturaXml(
      baseResumen({ codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: 530.5 } }),
    );
    expect(result.CodigoTipoMoneda).toEqual({ CodigoMoneda: "USD", TipoCambio: 530.5 });
  });

  it("should emit only CodigoTipoMoneda and the required totals for a bare resumen", () => {
    const result = buildResumenFacturaXml(baseResumen());
    expect(Object.keys(result)).toEqual([
      "CodigoTipoMoneda",
      "TotalVenta",
      "TotalVentaNeta",
      "TotalComprobante",
    ]);
    expect(result.TotalVenta).toBe(1000);
    expect(result.TotalVentaNeta).toBe(1000);
    expect(result.TotalComprobante).toBe(1130);
  });

  it("should emit optional totals when defined, including zero values", () => {
    const result = buildResumenFacturaXml(
      baseResumen({ totalServGravados: 1000, totalServExentos: 0, totalIVADevuelto: 0 }),
    );
    expect(result.TotalServGravados).toBe(1000);
    expect(result.TotalServExentos).toBe(0);
    expect(result.TotalIVADevuelto).toBe(0);
  });

  it("should emit the NoSujeto totals added in v4.4", () => {
    const result = buildResumenFacturaXml(
      baseResumen({ totalServNoSujeto: 100, totalMercNoSujeta: 200, totalNoSujeto: 300 }),
    );
    expect(result.TotalServNoSujeto).toBe(100);
    expect(result.TotalMercNoSujeta).toBe(200);
    expect(result.TotalNoSujeto).toBe(300);
  });

  it("should map TotalDesgloseImpuesto entries with Codigo, CodigoTarifaIVA and TotalMontoImpuesto", () => {
    const result = buildResumenFacturaXml(
      baseResumen({
        totalDesgloseImpuesto: [
          { codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 130 },
          { codigo: "02", totalMontoImpuesto: 50 },
        ],
      }),
    );
    expect(result.TotalDesgloseImpuesto).toEqual([
      { Codigo: "01", CodigoTarifaIVA: "08", TotalMontoImpuesto: 130 },
      { Codigo: "02", TotalMontoImpuesto: 50 },
    ]);
  });

  it("should not emit TotalDesgloseImpuesto when empty", () => {
    const result = buildResumenFacturaXml(baseResumen({ totalDesgloseImpuesto: [] }));
    expect(result).not.toHaveProperty("TotalDesgloseImpuesto");
  });

  it("should map MedioPago entries with TipoMedioPago, MedioPagoOtros and TotalMedioPago", () => {
    const result = buildResumenFacturaXml(
      baseResumen({
        medioPago: [
          { tipoMedioPago: "01", totalMedioPago: 500 },
          { tipoMedioPago: "99", medioPagoOtros: "Trueque", totalMedioPago: 630 },
        ],
      }),
    );
    expect(result.MedioPago).toEqual([
      { TipoMedioPago: "01", TotalMedioPago: 500 },
      { TipoMedioPago: "99", MedioPagoOtros: "Trueque", TotalMedioPago: 630 },
    ]);
  });

  it("should not emit MedioPago when empty", () => {
    const result = buildResumenFacturaXml(baseResumen({ medioPago: [] }));
    expect(result).not.toHaveProperty("MedioPago");
  });

  it("should emit a fully-populated resumen in the v4.4 XSD order with TotalComprobante last", () => {
    const result = buildResumenFacturaXml({
      codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: 530.5 },
      totalServGravados: 1,
      totalServExentos: 2,
      totalServExonerado: 3,
      totalServNoSujeto: 4,
      totalMercanciasGravadas: 5,
      totalMercanciasExentas: 6,
      totalMercExonerada: 7,
      totalMercNoSujeta: 8,
      totalGravado: 9,
      totalExento: 10,
      totalExonerado: 11,
      totalNoSujeto: 12,
      totalVenta: 13,
      totalDescuentos: 14,
      totalVentaNeta: 15,
      totalDesgloseImpuesto: [{ codigo: "01", codigoTarifaIVA: "08", totalMontoImpuesto: 16 }],
      totalImpuesto: 16,
      totalImpAsumEmisorFabrica: 17,
      totalIVADevuelto: 18,
      totalOtrosCargos: 19,
      medioPago: [{ tipoMedioPago: "01", totalMedioPago: 20 }],
      totalComprobante: 21,
    });
    expect(Object.keys(result)).toEqual([
      "CodigoTipoMoneda",
      "TotalServGravados",
      "TotalServExentos",
      "TotalServExonerado",
      "TotalServNoSujeto",
      "TotalMercanciasGravadas",
      "TotalMercanciasExentas",
      "TotalMercExonerada",
      "TotalMercNoSujeta",
      "TotalGravado",
      "TotalExento",
      "TotalExonerado",
      "TotalNoSujeto",
      "TotalVenta",
      "TotalDescuentos",
      "TotalVentaNeta",
      "TotalDesgloseImpuesto",
      "TotalImpuesto",
      "TotalImpAsumEmisorFabrica",
      "TotalIVADevuelto",
      "TotalOtrosCargos",
      "MedioPago",
      "TotalComprobante",
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildOtrosCargosXml
// ---------------------------------------------------------------------------

describe("buildOtrosCargosXml", () => {
  it("should return a bare array of charges with no OtroCargo wrapper", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "06", detalle: "Impuesto de servicio", montoCargo: 5000 },
    ]);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([
      { TipoDocumentoOC: "06", Detalle: "Impuesto de servicio", MontoCargo: 5000 },
    ]);
  });

  it("should emit elements in the v4.4 XSD order when all optionals are present", () => {
    const cargo: OtroCargo = {
      tipoDocumento: "99",
      tipoDocumentoOtros: "Cargo especial",
      identificacionTercero: { tipo: "02", numero: "3101999999" },
      nombreTercero: "Transportes ABC",
      detalle: "Flete internacional",
      porcentaje: 5,
      montoCargo: 15000,
    };
    const result = buildOtrosCargosXml([cargo]);
    expect(Object.keys(result[0] ?? {})).toEqual([
      "TipoDocumentoOC",
      "TipoDocumentoOTROS",
      "IdentificacionTercero",
      "NombreTercero",
      "Detalle",
      "PorcentajeOC",
      "MontoCargo",
    ]);
  });

  it("should include TipoDocumentoOTROS when present", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "99", tipoDocumentoOtros: "Cargo especial", detalle: "Otro", montoCargo: 1 },
    ]);
    expect(result[0]?.TipoDocumentoOTROS).toBe("Cargo especial");
  });

  it("should map IdentificacionTercero as a Tipo/Numero structure", () => {
    const result = buildOtrosCargosXml([
      {
        tipoDocumento: "04",
        identificacionTercero: { tipo: "01", numero: "105550123" },
        detalle: "Cobro de un tercero",
        montoCargo: 3000,
      },
    ]);
    expect(result[0]?.IdentificacionTercero).toEqual({ Tipo: "01", Numero: "105550123" });
  });

  it("should include NombreTercero when present", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "04", nombreTercero: "Juan Perez", detalle: "Cobro", montoCargo: 500 },
    ]);
    expect(result[0]?.NombreTercero).toBe("Juan Perez");
  });

  it("should emit PorcentajeOC when zero", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "02", detalle: "Timbre", porcentaje: 0, montoCargo: 0 },
    ]);
    expect(result[0]?.PorcentajeOC).toBe(0);
  });

  it("should not include PorcentajeOC when undefined", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "02", detalle: "Timbre", montoCargo: 20 },
    ]);
    expect(result[0]).not.toHaveProperty("PorcentajeOC");
  });

  it("should map multiple charges preserving order", () => {
    const result = buildOtrosCargosXml([
      { tipoDocumento: "01", detalle: "Cargo 1", montoCargo: 1000 },
      { tipoDocumento: "02", detalle: "Cargo 2", montoCargo: 2000 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.TipoDocumentoOC).toBe("01");
    expect(result[1]?.TipoDocumentoOC).toBe("02");
  });
});

// ---------------------------------------------------------------------------
// buildInformacionReferenciaXml
// ---------------------------------------------------------------------------

describe("buildInformacionReferenciaXml", () => {
  it("should map only TipoDocIR and FechaEmisionIR for a bare reference", () => {
    const result = buildInformacionReferenciaXml([baseReferencia()]);
    expect(result).toEqual([{ TipoDocIR: "01", FechaEmisionIR: "2026-06-15T08:00:00-06:00" }]);
  });

  it("should emit elements in the v4.4 XSD order when all optionals are present", () => {
    const result = buildInformacionReferenciaXml([
      baseReferencia({
        tipoDoc: "99",
        tipoDocOtros: "Documento interno",
        numero: "50624082500310123456700100001010000000099199999999",
        codigo: "99",
        codigoOtros: "Ajuste especial",
        razon: "Correccion del monto",
      }),
    ]);
    expect(Object.keys(result[0] ?? {})).toEqual([
      "TipoDocIR",
      "TipoDocRefOTRO",
      "Numero",
      "FechaEmisionIR",
      "Codigo",
      "CodigoReferenciaOTRO",
      "Razon",
    ]);
    expect(result[0]).toEqual({
      TipoDocIR: "99",
      TipoDocRefOTRO: "Documento interno",
      Numero: "50624082500310123456700100001010000000099199999999",
      FechaEmisionIR: "2026-06-15T08:00:00-06:00",
      Codigo: "99",
      CodigoReferenciaOTRO: "Ajuste especial",
      Razon: "Correccion del monto",
    });
  });

  it("should map multiple references preserving order", () => {
    const result = buildInformacionReferenciaXml([
      baseReferencia({ tipoDoc: "01", razon: "Razon 1" }),
      baseReferencia({ tipoDoc: "03", codigo: "02", razon: "Razon 2" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.TipoDocIR).toBe("01");
    expect(result[1]?.TipoDocIR).toBe("03");
    expect(result[1]?.Codigo).toBe("02");
  });
});

// ---------------------------------------------------------------------------
// buildOtrosXml
// ---------------------------------------------------------------------------

describe("buildOtrosXml", () => {
  it("should map a single OtroContenido as a text node", () => {
    const otros: OtroContenido[] = [{ contenido: "<MiTag>valor</MiTag>" }];
    expect(buildOtrosXml(otros)).toEqual({
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
    expect(items[0]?.["#text"]).toBe("contenido-1");
    expect(items[2]?.["#text"]).toBe("contenido-3");
  });
});

// ---------------------------------------------------------------------------
// buildStandardDocumentBody
// ---------------------------------------------------------------------------

describe("buildStandardDocumentBody", () => {
  it("should map the required v4.4 root fields", () => {
    const result = buildStandardDocumentBody(baseFields());
    expect(result.Clave).toBe("50624082600310123456700100001010000000001199999999");
    expect(result.ProveedorSistemas).toBe("3101234567");
    expect(result.CodigoActividadEmisor).toBe("620100");
    expect(result.NumeroConsecutivo).toBe("00100001010000000001");
    expect(result.FechaEmision).toBe("2026-08-24T10:30:00-06:00");
    expect(result.CondicionVenta).toBe("01");
    expect(result).toHaveProperty("Emisor");
    expect(result).toHaveProperty("DetalleServicio");
    expect(result).toHaveProperty("ResumenFactura");
  });

  it("should not emit MedioPago at the root (moved into ResumenFactura in v4.4)", () => {
    const result = buildStandardDocumentBody(
      baseFields({
        resumenFactura: baseResumen({
          medioPago: [{ tipoMedioPago: "01", totalMedioPago: 1130 }],
        }),
      }),
    );
    expect(result).not.toHaveProperty("MedioPago");
    const resumen = result.ResumenFactura as Record<string, unknown>;
    expect(resumen.MedioPago).toEqual([{ TipoMedioPago: "01", TotalMedioPago: 1130 }]);
  });

  it("should emit a fully-populated Factura root in the v4.4 XSD order", () => {
    const result = buildStandardDocumentBody(
      baseFields({
        codigoActividadReceptor: "721001",
        receptor: baseReceptor(),
        condicionVenta: "99",
        condicionVentaOtros: "Pago contra entrega",
        plazoCredito: "30",
        otrosCargos: [{ tipoDocumento: "06", detalle: "Impuesto de servicio", montoCargo: 100 }],
        informacionReferencia: [baseReferencia()],
        otros: [{ contenido: "extra" }],
      }),
      DOCUMENT_VARIANTS.FacturaElectronica,
    );
    expect(Object.keys(result)).toEqual([
      "Clave",
      "ProveedorSistemas",
      "CodigoActividadEmisor",
      "CodigoActividadReceptor",
      "NumeroConsecutivo",
      "FechaEmision",
      "Emisor",
      "Receptor",
      "CondicionVenta",
      "CondicionVentaOtros",
      "PlazoCredito",
      "DetalleServicio",
      "OtrosCargos",
      "ResumenFactura",
      "InformacionReferencia",
      "Otros",
    ]);
  });

  it("should not include Receptor when absent", () => {
    const result = buildStandardDocumentBody(baseFields());
    expect(result).not.toHaveProperty("Receptor");
  });

  it("should not emit CodigoActividadReceptor for a Tiquete even when provided", () => {
    const result = buildStandardDocumentBody(
      baseFields({ codigoActividadReceptor: "721001" }),
      DOCUMENT_VARIANTS.TiqueteElectronico,
    );
    expect(result).not.toHaveProperty("CodigoActividadReceptor");
  });

  it("should include CondicionVentaOtros and PlazoCredito when present", () => {
    const result = buildStandardDocumentBody(
      baseFields({
        condicionVenta: "02",
        condicionVentaOtros: "Condicion especial",
        plazoCredito: "60",
      }),
    );
    expect(result.CondicionVentaOtros).toBe("Condicion especial");
    expect(result.PlazoCredito).toBe("60");
  });

  it("should wrap line items in DetalleServicio.LineaDetalle built with the variant", () => {
    const result = buildStandardDocumentBody(baseFields(), DOCUMENT_VARIANTS.FacturaElectronica);
    const detalle = result.DetalleServicio as { LineaDetalle: Record<string, unknown>[] };
    expect(detalle.LineaDetalle).toHaveLength(1);
    expect(detalle.LineaDetalle[0]?.CodigoCABYS).toBe("8399000000000");
  });

  it("should emit OtrosCargos as a bare array at the root", () => {
    const result = buildStandardDocumentBody(
      baseFields({
        otrosCargos: [{ tipoDocumento: "06", detalle: "Impuesto de servicio", montoCargo: 100 }],
      }),
    );
    expect(result.OtrosCargos).toEqual([
      { TipoDocumentoOC: "06", Detalle: "Impuesto de servicio", MontoCargo: 100 },
    ]);
  });

  it("should not include OtrosCargos, InformacionReferencia or Otros when absent or empty", () => {
    const absent = buildStandardDocumentBody(baseFields());
    expect(absent).not.toHaveProperty("OtrosCargos");
    expect(absent).not.toHaveProperty("InformacionReferencia");
    expect(absent).not.toHaveProperty("Otros");

    const empty = buildStandardDocumentBody(
      baseFields({ otrosCargos: [], informacionReferencia: [], otros: [] }),
    );
    expect(empty).not.toHaveProperty("OtrosCargos");
    expect(empty).not.toHaveProperty("InformacionReferencia");
    expect(empty).not.toHaveProperty("Otros");
  });

  it("should emit the reduced REP root in the REP XSD order", () => {
    const result = buildStandardDocumentBody(
      baseFields({
        codigoActividadReceptor: "721001",
        receptor: baseReceptor({ identificacion: { tipo: "01", numero: "101230456" } }),
        condicionVentaOtros: "Condicion especial",
        plazoCredito: "30",
        otrosCargos: [{ tipoDocumento: "06", detalle: "Cargo", montoCargo: 100 }],
        informacionReferencia: [baseReferencia({ tipoDoc: "01", codigo: "04" })],
        otros: [{ contenido: "extra" }],
      }),
      DOCUMENT_VARIANTS.ReciboElectronicoPago,
    );
    expect(Object.keys(result)).toEqual([
      "Clave",
      "ProveedorSistemas",
      "NumeroConsecutivo",
      "FechaEmision",
      "Emisor",
      "Receptor",
      "CondicionVenta",
      "DetalleServicio",
      "ResumenFactura",
      "InformacionReferencia",
    ]);
  });

  it("should use minimal Emisor and Receptor structures for a REP body", () => {
    const result = buildStandardDocumentBody(
      baseFields({
        emisor: baseEmisor({
          nombreComercial: "MiMarca",
          telefono: { codigoPais: "506", numTelefono: "88887777" },
        }),
        receptor: baseReceptor({
          identificacion: { tipo: "01", numero: "101230456" },
          correoElectronico: "cliente@test.com",
          ubicacion: { provincia: "1", canton: "01", distrito: "01", otrasSenas: "Calle 1" },
        }),
      }),
      DOCUMENT_VARIANTS.ReciboElectronicoPago,
    );
    expect(Object.keys(result.Emisor as Record<string, unknown>)).toEqual([
      "Nombre",
      "Identificacion",
      "CorreoElectronico",
    ]);
    expect(Object.keys(result.Receptor as Record<string, unknown>)).toEqual([
      "Nombre",
      "Identificacion",
      "CorreoElectronico",
    ]);
  });

  it("should build REP lines with the reduced line structure", () => {
    const result = buildStandardDocumentBody(baseFields(), DOCUMENT_VARIANTS.ReciboElectronicoPago);
    const detalle = result.DetalleServicio as { LineaDetalle: Record<string, unknown>[] };
    expect(detalle.LineaDetalle[0]).not.toHaveProperty("CodigoCABYS");
    expect(detalle.LineaDetalle[0]).not.toHaveProperty("Cantidad");
    expect(detalle.LineaDetalle[0]).not.toHaveProperty("UnidadMedida");
    expect(detalle.LineaDetalle[0]).not.toHaveProperty("PrecioUnitario");
    expect(detalle.LineaDetalle[0]).not.toHaveProperty("BaseImponible");
  });
});
