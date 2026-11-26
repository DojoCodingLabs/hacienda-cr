---
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-mcp": minor
---

Add an opt-in decimal HALF_UP rounding mode for the legacy Number calculators. The default stays `"legacy-tofixed"`, so existing output is byte-identical.

- SDK: `createLegacyCalculator({ roundingMode })` returns `round5`, `calculateTaxAmount`, `calculateLineItemTotals` and `calculateInvoiceSummary` bound to `"legacy-tofixed"` (default, `Number.toFixed(5)`) or `"half-up"` (Anexos y Estructuras v4.4, p. 13-14). New exports: `round5HalfUp`, `LEGACY_ROUNDING_MODES`, `DEFAULT_LEGACY_ROUNDING_MODE` and the `LegacyRoundingMode`, `LegacyCalculationOptions` and `LegacyCalculator` types. The standalone functions keep their signatures and bytes.
- `"half-up"` changes only exact sixth-decimal halves, for example `0.999 × 1802.455` (`1800.65254` → `1800.65255`), 13% IVA on `80074.1975` (`10409.64567` → `10409.64568`) and `20.203515` (`20.20351` → `20.20352`). It throws `MonetaryValueError` for `NaN`/`±Infinity`; `"legacy-tofixed"` still passes them through.
- MCP: `create_invoice` accepts `roundingMode` (default `"legacy-tofixed"`).
- The exact `calculateDecimal*` path already rounds HALF_UP and remains the recommended path. `"legacy-tofixed"` may stop being the default only in a future major (1.0). See MIGRATION.md.
