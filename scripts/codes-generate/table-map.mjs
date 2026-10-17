// Registro explícito de parejas tabla→export del catálogo generado.
//
// Editable a mano cuando Hacienda publica un código nuevo: ampliar `keys`
// con la clave revisada (nunca inventada) y regenerar con `pnpm
// spec:generate`. El generador valida la paridad código↔clave en ambos
// sentidos y falla nombrando tabla y código; `namesFrom` declarará la
// fuente de nombres legibles cuando exista names.json (fase futura).
//
// Correcciones sancionadas (requisito «Correcciones sancionadas de paridad con
// cita de fuente primaria» del spec codes-generation): la paridad por defecto
// exige mismas claves y valores que la tabla escrita a mano reemplazada. Una
// corrección es la única excepción admitida y se declara en la entrada con
// `corrections`, cada una con:
//   - `kind`: "remove-value" | "remove-key" | "rename-key" | "replace-value"
//   - `code`: código afectado
//   - `from` / `to`: valor o clave anterior y nuevo (rename-key/replace-value)
//   - `report`: cita del informe de conformidad del repo (sección/fila)
//   - `source`: cita de la fuente primaria (PDF/XSD con página o tipo)
//   - `changeset`: Changeset publicado que declara el rompimiento
// `pnpm spec:generate` aplica y reporta cada corrección por tabla, clave y
// cita; una corrección incompleta, contradictoria o sin Changeset failiza el
// comando sin escribir salida parcial. Un desvío no declarado sigue fallando
// bajo el requisito de paridad.
//
// Sin pareja deliberada — se reporta en cada spec:generate, no se adivina:
// - TipoDocReferenciaType / REFERENCE_DOC_TYPES — el XSD vendorizado del set
//   vigente (2024/v4.4) no contiene los 19-20 (revisión abril 2026 pendiente
//   de vendorizar).
// - CodigoReferenciaType / REFERENCE_CODES — ídem, faltan 13-16.
// - REP_REFERENCE_CODES — ídem, XSD del REP; 2026 aporta 13-17.
//
// Transición al set 2026 (informe A1 §6.4): las tres constantes ya coinciden
// exactamente con la revisión `2026/v4.4`, **obligatoria desde 2026-11-01**,
// y divergen del set vigente 2024 y del PDF de Anexos
// (REFERENCE_DOC_TYPES 21 vs 19; REFERENCE_CODES 16 vs 12;
// REP_REFERENCE_CODES 17 vs 12). Por eso quedan sin emparejar: emparejarlas
// hoy forzaría una corrección contra un XSD que el repo aún no vendoriza.
// Contradicción entre fuentes oficiales, declarada sin resolver: el código
// `02` es «Corrige monto» en el PDF Anexos Nota 9 (p. 72) y «Corrige texto de
// ocumento de referencia» [sic] en el XSD 2026; el SDK sigue el XSD. Erratas
// oficiales 2026 citadas literalmente (02 «documento», 05 «contigencia»): el
// SDK las escribe correctamente (diffs de descripción, no de significado).
const A2_CHANGESET = ".changeset/a2-spec-as-data-corrections.md";

export const TABLE_MAP = [
  {
    // Catálogo oficial de tipos de comprobante de la clave numerica (ANEXOS
    // V4.4 p. 65 inciso c; `Nota3/TipoComprobanteDocumentoAsociado` ya en
    // codes.json). El SDK tenía 9 claves desplazadas; las correcciones
    // sancionadas declaran el desvío (informe A1 §6.1).
    tableKeys: ["Nota3/TipoComprobanteDocumentoAsociado"],
    exportName: "DocumentTypeCode",
    shape: "object",
    keys: {
      "01": "FACTURA_ELECTRONICA",
      "02": "NOTA_DEBITO_ELECTRONICA",
      "03": "NOTA_CREDITO_ELECTRONICA",
      "04": "TIQUETE_ELECTRONICO",
      "05": "CONFIRMACION_ACEPTACION",
      "06": "CONFIRMACION_ACEPTACION_PARCIAL",
      "07": "CONFIRMACION_RECHAZO",
      "08": "FACTURA_ELECTRONICA_COMPRA",
      "09": "FACTURA_ELECTRONICA_EXPORTACION",
      10: "RECIBO_ELECTRONICO_PAGO",
    },
    corrections: [
      {
        kind: "rename-key",
        code: "05",
        from: "FACTURA_ELECTRONICA_COMPRA",
        to: "CONFIRMACION_ACEPTACION",
        report: "docs/conformity-report.md §6.1 (fila 1)",
        source: "ANEXOS V4.4 p. 65 inciso c",
        changeset: A2_CHANGESET,
      },
      {
        kind: "rename-key",
        code: "06",
        from: "FACTURA_ELECTRONICA_EXPORTACION",
        to: "CONFIRMACION_ACEPTACION_PARCIAL",
        report: "docs/conformity-report.md §6.1 (fila 1)",
        source: "ANEXOS V4.4 p. 65 inciso c",
        changeset: A2_CHANGESET,
      },
      {
        kind: "rename-key",
        code: "07",
        from: "RECIBO_ELECTRONICO_PAGO",
        to: "CONFIRMACION_RECHAZO",
        report: "docs/conformity-report.md §6.1 (fila 1)",
        source: "ANEXOS V4.4 p. 65 inciso c",
        changeset: A2_CHANGESET,
      },
      {
        kind: "remove-key",
        code: "08",
        from: "COMPRA_PAGO",
        report: "docs/conformity-report.md §6.1 (fila 1)",
        source: "ANEXOS V4.4 p. 65 inciso c (sin respaldo en ninguna fuente)",
        changeset: A2_CHANGESET,
      },
      {
        kind: "remove-key",
        code: "09",
        from: "GASTO_VIAJE",
        report: "docs/conformity-report.md §6.1 (fila 1)",
        source: "ANEXOS V4.4 p. 65 inciso c (sin respaldo en ninguna fuente)",
        changeset: A2_CHANGESET,
      },
      {
        kind: "replace-value",
        code: "10",
        key: "RECIBO_ELECTRONICO_PAGO",
        from: "07",
        to: "10",
        report: "docs/conformity-report.md §6.1 (fila 1)",
        source: "ANEXOS V4.4 p. 65 inciso c",
        changeset: A2_CHANGESET,
      },
    ],
    namesFrom: null,
  },
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
    // Taxonomía oficial de exoneraciones (XSD TipoExoneracionType, 01–11 + 99).
    // El SDK declaraba un «12» sin respaldo en ninguna fuente (informe A1 §6.2)
    // y la etiqueta del 06 era «Transitorio IX» en vez del sentido oficial.
    tableKeys: ["TipoExoneracionType"],
    exportName: "ExonerationType",
    shape: "object",
    keys: {
      "01": "COMPRAS_AUTORIZADAS",
      "02": "VENTAS_EXENTAS_DIPLOMATICOS",
      "03": "AUTORIZADO_LEY_ESPECIAL",
      "04": "EXENCIONES_DGH",
      "05": "TRANSITORIO_V",
      "06": "SERVICIOS_TURISTICOS_ICT",
      "07": "TRANSITORIO_XVII",
      "08": "ZONA_FRANCA",
      "09": "SERVICIOS_COMPLEMENTARIOS_EXPORTACION",
      10: "CORPORACIONES_MUNICIPALES",
      11: "DGH_IMPUESTO_LOCAL_CONCRETA",
      99: "OTROS",
    },
    corrections: [
      {
        kind: "remove-value",
        code: "12",
        from: "EXONERACION_12",
        report: "docs/conformity-report.md §6.2 (fila 10)",
        source: "ANEXOS V4.4 Nota 10.1 p. 74; XSD TipoExoneracionType 01–11 + 99",
        changeset: A2_CHANGESET,
      },
      {
        kind: "rename-key",
        code: "06",
        from: "TRANSITORIO_IX",
        to: "SERVICIOS_TURISTICOS_ICT",
        report: "docs/conformity-report.md §6.2 (fila 10)",
        source: "ANEXOS V4.4 Nota 10.1 p. 74; XSD TipoExoneracionType (06)",
        changeset: A2_CHANGESET,
      },
    ],
    namesFrom: null,
  },
  {
    // Unidades de medida oficiales (XSD UnidadMedidaType, 101 valores). El SDK
    // usaba «Ω» U+03A9 (omega griega); las fuentes usan U+2126 (signo ohm),
    // homógrafo con bytes distintos (informe A1 §6.3).
    tableKeys: ["UnidadMedidaType"],
    exportName: "UNITS_OF_MEASURE",
    shape: "array",
    keyType: "UnitOfMeasure",
    // El tipo `UnitOfMeasure` lo re-deriva constants/tax-codes.ts, donde la
    // const curada de accessors comparte el nombre con el tipo.
    emitType: false,
    corrections: [
      {
        kind: "replace-value",
        code: "\u2126",
        from: "\u03a9",
        to: "\u2126",
        report: "docs/conformity-report.md §6.3 (fila 11)",
        source: "PDF Anexos Nota 15 pp. 76–79; XSD UnidadMedidaType",
        changeset: A2_CHANGESET,
      },
    ],
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
