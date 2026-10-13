// NO EDITAR — generado por `pnpm spec:generate` desde packages/sdk/schemas/codes.json y scripts/codes-generate/table-map.mjs; las ediciones manuales se pierden y las detecta el candado de verify.

export const SaleCondition = {
  /** Contado */
  CONTADO: "01",
  /** Crédito */
  CREDITO: "02",
  /** Consignación */
  CONSIGNACION: "03",
  /** Apartado */
  APARTADO: "04",
  /** Arrendamiento con opción de compra */
  ARRENDAMIENTO_OPCION_COMPRA: "05",
  /** Arrendamiento en función financiera */
  ARRENDAMIENTO_FUNCION_FINANCIERA: "06",
  /** Cobro a favor de un tercero */
  COBRO_FAVOR_TERCERO: "07",
  /** Servicios prestados al Estado a crédito */
  SERVICIOS_ESTADO: "08",
  /** Venta a crédito en IVA hasta 90 días (Artículo 27, LIVA) */
  VENTA_CREDITO_IVA_90_DIAS: "10",
  /** Venta Mercancía No Nacionalizada */
  VENTA_MERCANCIA_NO_NACIONALIZADA: "12",
  /** Venta Bienes Usados No Contribuyente */
  VENTA_BIENES_USADOS_NO_CONTRIBUYENTE: "13",
  /** Arrendamiento Operativo */
  ARRENDAMIENTO_OPERATIVO: "14",
  /** Arrendamiento Financiero */
  ARRENDAMIENTO_FINANCIERO: "15",
  /** Otros */
  OTROS: "99",
  /** Pago del servicios prestado al Estado */
  PAGO_SERVICIO_ESTADO: "09",
  /** Pago de venta a crédito en IVA hasta 90 días (Artículo 27, LIVA) */
  PAGO_VENTA_CREDITO_IVA_90_DIAS: "11",
} as const;

export type SaleCondition = (typeof SaleCondition)[keyof typeof SaleCondition];
