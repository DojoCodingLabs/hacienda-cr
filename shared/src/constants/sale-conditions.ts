/**
 * Sale condition helpers (Condicion de Venta) for electronic documents.
 *
 * El catálogo `SaleCondition` es generado desde `codes.json`
 * (`shared/src/generated/sale-condition.ts`); el subconjunto REP y el mapa
 * de nombres legibles son curaduría manual.
 */
import { SaleCondition } from "../generated/sale-condition.js";

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
