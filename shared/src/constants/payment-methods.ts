/**
 * Payment method names (Medio de Pago) for electronic documents.
 *
 * El catálogo `PaymentMethod` es generado desde `codes.json`
 * (`shared/src/generated/payment-method.ts`); este mapa de nombres
 * legibles es curaduría manual — el candidato a migrarlo es un futuro
 * `names.json` (ver table-map.mjs).
 */
import { PaymentMethod } from "../generated/payment-method.js";

/** Human-readable names for payment methods. */
export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
  [PaymentMethod.EFECTIVO]: "Efectivo",
  [PaymentMethod.TARJETA]: "Tarjeta",
  [PaymentMethod.CHEQUE]: "Cheque",
  [PaymentMethod.TRANSFERENCIA]: "Transferencia - Depósito bancario",
  [PaymentMethod.RECAUDADO_TERCEROS]: "Recaudado por terceros",
  [PaymentMethod.SINPE_MOVIL]: "SINPE Móvil",
  [PaymentMethod.PLATAFORMA_DIGITAL]: "Plataforma Digital",
  [PaymentMethod.OTROS]: "Otros",
} as const;
