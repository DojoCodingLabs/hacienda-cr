/**
 * Sale condition codes (Condicion de Venta) for electronic documents.
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
  /** Servicios prestados al Estado a credito */
  SERVICIOS_ESTADO_CREDITO: "08",
  /** Pago del servicio prestado al Estado */
  PAGO_SERVICIO_ESTADO: "09",
  /** Otros (especificar) */
  OTROS: "99",
} as const;

export type SaleCondition = (typeof SaleCondition)[keyof typeof SaleCondition];

/** Human-readable names for sale conditions. */
export const SALE_CONDITION_NAMES: Record<SaleCondition, string> = {
  [SaleCondition.CONTADO]: "Contado",
  [SaleCondition.CREDITO]: "Crédito",
  [SaleCondition.CONSIGNACION]: "Consignación",
  [SaleCondition.APARTADO]: "Apartado",
  [SaleCondition.ARRENDAMIENTO_OPCION_COMPRA]: "Arrendamiento con opción de compra",
  [SaleCondition.ARRENDAMIENTO_FUNCION_FINANCIERA]: "Arrendamiento en función financiera",
  [SaleCondition.COBRO_FAVOR_TERCERO]: "Cobro a favor de un tercero",
  [SaleCondition.SERVICIOS_ESTADO_CREDITO]: "Servicios prestados al Estado a crédito",
  [SaleCondition.PAGO_SERVICIO_ESTADO]: "Pago del servicio prestado al Estado",
  [SaleCondition.OTROS]: "Otros",
} as const;
