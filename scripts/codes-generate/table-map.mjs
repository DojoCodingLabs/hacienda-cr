// Registro explícito de parejas tabla→export del catálogo generado.
//
// Editable a mano cuando Hacienda publica un código nuevo: ampliar `keys`
// con la clave revisada (nunca inventada) y regenerar con `pnpm
// spec:generate`. El generador valida la paridad código↔clave en ambos
// sentidos y falla nombrando tabla y código; `namesFrom` declarará la
// fuente de nombres legibles cuando exista names.json (fase futura).
//
// Sin pareja deliberada — se reporta en cada spec:generate, no se adivina:
// - UnidadMedidaType / UNITS_OF_MEASURE — curado; ambos conservan U+2126.
// - TipoExoneracionType / ExonerationType — catálogo curado y aliases históricos.
// - TipoDocReferenciaType / REFERENCE_DOC_TYPES — el XSD vendorizado bajo
//   2026/v4.4 SÍ contiene los 19-20 (revisión abril 2026); codes.json
//   permanece en el set 2024/v4.4 porque faltan los auxiliares de ese set.
//   La paridad queda bloqueada por
//   packages/sdk/src/xml/reference-catalog.spec.ts mientras codes.json no se
//   regenera.
// - CodigoReferenciaType / REFERENCE_CODES — ídem (13-16 presentes en el
//   XSD 2026 vendorizado).
// - DocumentTypeCode — catálogo de la clave, no una enumeración del XSD.
// Alias deprecados de la API publicada: nombres heredados de un código
// canónico que el XSD no enumera. No son códigos del catálogo y por eso no
// entran en la paridad de valor (no hay tabla que los pardee); se declaran
// aquí para que la prueba de paridad los verifique contra la API publicada
// y para que un alias nuevo exija una decisión consciente.
export const ALIASES = [
  {
    exportName: "DocumentTypeCode",
    alias: "COMPRA_PAGO",
    canonical: "FACTURA_ELECTRONICA_COMPRA",
    reason: "Nombre heredado de la factura electrónica de compra, publicado en la API.",
  },
  {
    exportName: "DocumentTypeCode",
    alias: "GASTO_VIAJE",
    canonical: "FACTURA_ELECTRONICA_EXPORTACION",
    reason: "Nombre heredado de la factura electrónica de exportación, publicado en la API.",
  },
];

export const TABLE_MAP = [
  {
    // Medio de Pago: variante canónica de Factura; las 7 variantes por tipo de documento son idénticas en el set vigente (verificado al sembrar).
    tableKeys: ["FacturaElectronica/ResumenFactura/MedioPago/TipoMedioPago"],
    exportName: "PaymentMethod",
    shape: "object",
    keys: {
      99: "OTROS",
      "01": "EFECTIVO",
      "02": "TARJETA",
      "03": "CHEQUE",
      "04": "TRANSFERENCIA",
      "05": "RECAUDADO_TERCEROS",
      "06": "SINPE_MOVIL",
      "07": "PLATAFORMA_DIGITAL",
    },
    namesFrom: null,
  },
  {
    // Condicion de Venta: unión de las variantes por tipo de documento (el set vivo es la unión; una divergencia futura crece la unión y la generación exige revisar la clave).
    tableKeys: [
      "FacturaElectronica/CondicionVenta",
      "FacturaElectronicaCompra/CondicionVenta",
      "FacturaElectronicaExportacion/CondicionVenta",
      "NotaCreditoElectronica/CondicionVenta",
      "NotaDebitoElectronica/CondicionVenta",
      "ReciboElectronicoPago/CondicionVenta",
      "TiqueteElectronico/CondicionVenta",
    ],
    exportName: "SaleCondition",
    shape: "object",
    keys: {
      10: "VENTA_CREDITO_IVA_90_DIAS",
      11: "PAGO_VENTA_CREDITO_IVA_90_DIAS",
      12: "VENTA_MERCANCIA_NO_NACIONALIZADA",
      13: "VENTA_BIENES_USADOS_NO_CONTRIBUYENTE",
      14: "ARRENDAMIENTO_OPERATIVO",
      15: "ARRENDAMIENTO_FINANCIERO",
      99: "OTROS",
      "01": "CONTADO",
      "02": "CREDITO",
      "03": "CONSIGNACION",
      "04": "APARTADO",
      "05": "ARRENDAMIENTO_OPCION_COMPRA",
      "06": "ARRENDAMIENTO_FUNCION_FINANCIERA",
      "07": "COBRO_FAVOR_TERCERO",
      "08": "SERVICIOS_ESTADO",
      "09": "PAGO_SERVICIO_ESTADO",
    },
    namesFrom: null,
  },
  {
    tableKeys: ["CodigoImpuestoType"],
    exportName: "TaxCode",
    shape: "object",
    keys: {
      12: "IMPUESTO_CEMENTO",
      99: "OTROS",
      "01": "IVA",
      "02": "IMPUESTO_SELECTIVO_CONSUMO",
      "03": "IMPUESTO_UNICO_COMBUSTIBLES",
      "04": "IMPUESTO_BEBIDAS_ALCOHOLICAS",
      "05": "IMPUESTO_BEBIDAS_SIN_ALCOHOL",
      "06": "IMPUESTO_TABACO",
      "07": "IVA_CALCULO_ESPECIAL",
      "08": "IVA_BIENES_USADOS",
    },
    namesFrom: null,
  },
  {
    tableKeys: ["CodigoTarifaIVAType"],
    exportName: "IvaRateCode",
    shape: "object",
    keys: {
      10: "TARIFA_EXENTA",
      11: "CERO_SIN_CREDITO",
      "01": "EXENTO",
      "02": "REDUCIDA_1",
      "03": "REDUCIDA_2",
      "04": "REDUCIDA_4",
      "05": "TRANSITORIO_0",
      "06": "TRANSITORIO_4",
      "07": "TRANSITORIO_8",
      "08": "GENERAL_13",
      "09": "REDUCIDA_0_5",
    },
    namesFrom: null,
  },
  {
    tableKeys: ["MensajeReceptor/Mensaje"],
    exportName: "MensajeReceptorCode",
    shape: "object",
    keys: {
      1: "ACEPTADO",
      2: "ACEPTADO_PARCIALMENTE",
      3: "RECHAZADO",
    },
    namesFrom: null,
  },
  {
    tableKeys: ["Nota3/SituacionComprobante"],
    exportName: "SituationCode",
    shape: "object",
    keys: {
      1: "NORMAL",
      2: "CONTINGENCIA",
      3: "SIN_INTERNET",
    },
    namesFrom: null,
  },
  {
    // Tipo de Identificacion: unión de emisor, receptor y esquema base (idénticas hoy).
    tableKeys: [
      "IdentificacionType/Tipo",
      "MensajeHacienda/TipoIdentificacionEmisor",
      "MensajeHacienda/TipoIdentificacionReceptor",
    ],
    exportName: "IdentificationType",
    shape: "object",
    keys: {
      "01": "CEDULA_FISICA",
      "02": "CEDULA_JURIDICA",
      "03": "DIMEX",
      "04": "NITE",
      "05": "EXTRANJERO_NO_DOMICILIADO",
      "06": "NO_CONTRIBUYENTE",
    },
    namesFrom: null,
  },
  {
    tableKeys: ["CodificacionUbicacion/Provincia"],
    exportName: "ProvinceCode",
    shape: "object",
    keys: {
      1: "SAN_JOSE",
      2: "ALAJUELA",
      3: "CARTAGO",
      4: "HEREDIA",
      5: "GUANACASTE",
      6: "PUNTARENAS",
      7: "LIMON",
    },
    namesFrom: null,
  },
  {
    tableKeys: ["CodigoMonedaType/CodigoMoneda"],
    exportName: "CURRENCY_CODES",
    shape: "array",
    keyType: "CurrencyCode",
    // El tipo `CurrencyCode` lo re-deriva constants/currency-codes.ts, donde
    // la const curada de accessors comparte el nombre (misma fusión tipo+valor
    // que antes del split; exportarlo desde generated chocaría con constants).
    emitType: false,
    namesFrom: null,
  },
  {
    tableKeys: ["CodigoDescuentoType"],
    exportName: "DISCOUNT_CODES",
    shape: "array",
    keyType: "DiscountCode",
    namesFrom: null,
  },
  {
    tableKeys: ["TipoDocOtrosCargosType"],
    exportName: "OTHER_CHARGE_TYPES",
    shape: "array",
    keyType: "OtherChargeType",
    namesFrom: null,
  },
  {
    tableKeys: ["ExoneracionType/NombreInstitucion"],
    exportName: "EXONERATION_INSTITUTIONS",
    shape: "array",
    keyType: "ExonerationInstitution",
    namesFrom: null,
  },
  {
    // Tipos de CodigoComercial: la unión de la tabla base y las 5 variantes
    // TipoSurtido por documento (idénticas hoy; surfaced por el candado de
    // lint, que encontró los códigos escritos inline en schemas/tipos).
    tableKeys: [
      "CodigoType/Tipo",
      "FacturaElectronica/DetalleServicio/LineaDetalle/DetalleSurtido/LineaDetalleSurtido/CodigoComercialSurtido/TipoSurtido",
      "FacturaElectronicaExportacion/DetalleServicio/LineaDetalle/DetalleSurtido/LineaDetalleSurtido/CodigoComercialSurtido/TipoSurtido",
      "NotaCreditoElectronica/DetalleServicio/LineaDetalle/DetalleSurtido/LineaDetalleSurtido/CodigoComercialSurtido/TipoSurtido",
      "NotaDebitoElectronica/DetalleServicio/LineaDetalle/DetalleSurtido/LineaDetalleSurtido/CodigoComercialSurtido/TipoSurtido",
      "TiqueteElectronico/DetalleServicio/LineaDetalle/DetalleSurtido/LineaDetalleSurtido/CodigoComercialSurtido/TipoSurtido",
    ],
    exportName: "COMMERCIAL_CODE_TYPES",
    shape: "array",
    keyType: "CommercialCodeType",
    namesFrom: null,
  },
  {
    tableKeys: ["TipoTransaccionType"],
    exportName: "TRANSACTION_TYPES",
    shape: "array",
    keyType: "TransactionType",
    namesFrom: null,
  },
];
