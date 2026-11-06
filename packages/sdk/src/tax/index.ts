/**
 * Tax calculation module — IVA computation, line item totals,
 * and invoice summary aggregation.
 */

export {
  round5,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  type LineItemTaxInput,
  type LineItemInput,
  type CalculatedLineItem,
  type InvoiceSummary,
} from "./calculator.js";

/**
 * Exact decimal kernel primitives, exposed for additive consumers that keep
 * monetary values as bounded decimal text. These are representation-neutral
 * arithmetic helpers; they do not define tax policy or document identity.
 */
export {
  multiply as multiplyExactDecimal,
  percent as percentExactDecimal,
  sum as sumExactDecimal,
  MONEY_SCALE as EXACT_MONEY_SCALE,
} from "./exact-decimal.js";

export {
  calculateDecimalDocument,
  calculateDecimalLineItemTotals,
  calculateDecimalInvoiceSummary,
  calculateDecimalRepLine,
  calculateDecimalTaxAmount,
  type DecimalLineSource,
  type DecimalCalculatedLine,
} from "./decimal-document.js";
