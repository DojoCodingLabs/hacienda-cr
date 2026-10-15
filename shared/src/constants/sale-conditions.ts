/**
 * Sale condition codes (Condicion de Venta) for electronic documents.
 *
 * v4.4 set per the official XSD enumeration: 01-08, 10, 12-15, 99
 * (codes 09 and 11 do not exist in v4.4). Code 99 requires the
 * free-text CondicionVentaOtros companion field.
 */

/** Sale condition codes. */
export const SaleCondition = {
  /** Contado (cash / immediate payment) */
  CONTADO: "01",
  /** Credito (credit) */
  CREDITO: "02",
  /** Consignacion */
  CONSIGNACION: "03",
  /** Apartado */
  APARTADO: "04",
  /** Arrendamiento con opcion de compra */
  ARRENDAMIENTO_OPCION_COMPRA: "05",
  /** Arrendamiento en funcion financiera */
  ARRENDAMIENTO_FUNCION_FINANCIERA: "06",
  /** Cobro a favor de un tercero */
  COBRO_FAVOR_TERCERO: "07",
  /** Servicios prestados al Estado */
  SERVICIOS_ESTADO: "08",
  /** Pago del servicio prestado al Estado — Recibo Electronico de Pago only */
  PAGO_SERVICIO_ESTADO: "09",
  /** Venta a credito en IVA hasta 90 dias (Articulo 27, LIVA) */
  VENTA_CREDITO_IVA_90_DIAS: "10",
  /** Pago de venta a credito en IVA hasta 90 dias — Recibo Electronico de Pago only */
  PAGO_VENTA_CREDITO_IVA_90_DIAS: "11",
  /** Venta de mercancia no nacionalizada */
  VENTA_MERCANCIA_NO_NACIONALIZADA: "12",
  /** Venta de bienes usados no contribuyente */
  VENTA_BIENES_USADOS_NO_CONTRIBUYENTE: "13",
  /** Arrendamiento operativo */
  ARRENDAMIENTO_OPERATIVO: "14",
  /** Arrendamiento en funcion financiera (leasing financiero) */
  ARRENDAMIENTO_FINANCIERO: "15",
  /** Otros (requiere CondicionVentaOtros) */
  OTROS: "99",
} as const;

export type SaleCondition = (typeof SaleCondition)[keyof typeof SaleCondition];

/**
 * Sale conditions accepted by the Recibo Electronico de Pago XSD — the REP
 * enumeration only admits the two payment codes.
 */
export const REP_SALE_CONDITIONS = [
  SaleCondition.PAGO_SERVICIO_ESTADO,
  SaleCondition.PAGO_VENTA_CREDITO_IVA_90_DIAS,
] as const;

/** Human-readable names for sale conditions. */
export const SALE_CONDITION_NAMES: Record<SaleCondition, string> = {
  [SaleCondition.CONTADO]: "Contado",
  [SaleCondition.CREDITO]: "Crédito",
  [SaleCondition.CONSIGNACION]: "Consignación",
  [SaleCondition.APARTADO]: "Apartado",
  [SaleCondition.ARRENDAMIENTO_OPCION_COMPRA]: "Arrendamiento con opción de compra",
  [SaleCondition.ARRENDAMIENTO_FUNCION_FINANCIERA]: "Arrendamiento en función financiera",
  [SaleCondition.COBRO_FAVOR_TERCERO]: "Cobro a favor de un tercero",
  [SaleCondition.SERVICIOS_ESTADO]: "Servicios prestados al Estado",
  [SaleCondition.PAGO_SERVICIO_ESTADO]: "Pago del servicio prestado al Estado (REP)",
  [SaleCondition.VENTA_CREDITO_IVA_90_DIAS]: "Venta a crédito en IVA hasta 90 días",
  [SaleCondition.PAGO_VENTA_CREDITO_IVA_90_DIAS]:
    "Pago de venta a crédito en IVA hasta 90 días (REP)",
  [SaleCondition.VENTA_MERCANCIA_NO_NACIONALIZADA]: "Venta de mercancía no nacionalizada",
  [SaleCondition.VENTA_BIENES_USADOS_NO_CONTRIBUYENTE]: "Venta de bienes usados no contribuyente",
  [SaleCondition.ARRENDAMIENTO_OPERATIVO]: "Arrendamiento operativo",
  [SaleCondition.ARRENDAMIENTO_FINANCIERO]: "Arrendamiento en función financiera (leasing)",
  [SaleCondition.OTROS]: "Otros",
} as const;
