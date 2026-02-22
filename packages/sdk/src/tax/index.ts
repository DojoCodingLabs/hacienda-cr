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
