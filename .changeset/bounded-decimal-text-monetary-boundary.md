---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
---

Add the bounded decimal-text monetary boundary and the exact monetary kernel.

`@dojocoding/hacienda-shared` publishes the decimal-text primitives
(`MONEY_SCALE`, `MAX_MONEY_SCALED`, `MONETARY_TEXT_PATTERN`,
`parseMonetaryText`, `normalizeMonetaryInput`, `formatScaledDecimal`,
`scaledFromNumber`, `scaledFromPlainDecimal`, `isPositiveMonetaryText`,
`MonetaryValueError`) and the boundary schemas `MonetaryTextSchema`,
`MoneyInputSchema`, `MontoSchema` and `MontoPositiveSchema`. The boundary
accepts the legacy JSON `number` or a bounded decimal text and normalizes to
bounded decimal text; it never normalizes to `Number`, and it rejects
`Infinity`, `NaN`, exponential notation, out-of-bound values and precision
beyond the field scale, naming the cause.

`@dojocoding/hacienda-sdk` extends the monetary kernel with `parse`, `text`,
`fromNumber`, `multiply`, `percent` and `ratio`. The published primitives
`scaled`, `round`, `money` and `sum` keep their exact behaviour, so the
published 0.9.0 byte and calculation baseline is unchanged.

The public monetary `Number` DTOs, `calculateLineItemTotals`,
`calculateInvoiceSummary`, `FacturaElectronica` and the CLI/MCP adapters are
unchanged: the exact decimal-text path stays additive, as the branch contract
requires. Adopting decimal text is opt-in and is described in `MIGRATION.md`.
Offline exactness does not establish real Hacienda acceptance.
