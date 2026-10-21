/**
 * Monetary primitives barrel export.
 *
 * Bounded decimal text representation of the public monetary type.
 */

export {
  MONEY_SCALE,
  MONEY_FACTOR,
  MAX_MONEY_SCALED,
  MIN_MONEY_SCALED,
  MONETARY_TEXT_PATTERN,
  MonetaryValueError,
  scaledFromPlainDecimal,
  formatScaledDecimal,
  scaledFromNumber,
  parseMonetaryText,
  normalizeMonetaryInput,
  isPositiveMonetaryText,
} from "./decimal-text.js";
