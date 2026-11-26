---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
---

Correct two exact-family rules against Anexos v4.4.

**Discounts cascade on the remaining base.** In every current exact
calculator (FE, TE, total and partial NC, ND, FEC, FEC foreign service, FE
replacement and FEC used-personal goods), each line discount now applies to the
base that remains after the previous discount. Percentages are rounded HALF_UP
to five decimals; absolute amounts are carried unchanged. Only lines where a
percentage discount follows another discount change; for them `montoDescuento`,
`subTotal`, `baseImponible`, tax and totals differ. Example: a line
of 100 with two 10% discounts was 10.00000 + 10.00000 (subtotal 80.00000,
total 90.40000) and is now 10.00000 + 9.00000 (subtotal 81.00000, total
91.53000). Callers that computed `medioPago` from the old rule must recompute
it, or the payment reconciliation rejects the document. A discount that
consumes the whole remaining base still throws the same `RangeError`.

`calculateRetainedExactFe` keeps its frozen historical rule: every percentage
is computed on the line gross, and the line is rejected with the same
`RangeError` as before when the sum of the discounts reaches the gross.

**`medioPago` is conditional.** It is required unless the governing sale
condition is 02, 08 or 10. When present it still holds 1–4 allocations that
must equal the invoice total. When it is absent or empty, the calculated summary
has no `medioPago` and the XML has no `MedioPago` node. The governing condition
is the document's own for FE, TE, FEC, FEC foreign service and FE replacement,
the original's for total NC, partial NC and ND, and the literal 13 (never
exempt) for FEC used-personal goods.

This is a type-level change. `medioPago` is now optional in `ExactFeInput`,
`ExactTeInput`, `ExactFecInput`, `ExactFecForeignServiceIva13Input`,
`ExactNcPartialInput` and `ExactNdInput`, and in the FE they carry (`original`
of `ExactNcTotalInput`, `ExactNcPartialInput` and `ExactNdInput`; `replacement`
of `ExactFeReplacementInput`). It is also optional in
`ExactFeSummarySchema`, so `ExactFeCalculated["resumenFactura"]["medioPago"]`
and the calculated types derived from it may be `undefined`. Code that reads
`resumenFactura.medioPago` must handle that case. The FEC used-personal goods
calculated summary still requires at least one allocation.

New shared export: `RetainedExactFeCalculatedSchema` (and the
`RetainedExactFeCalculated` type), which requires the non-empty historical
allocation of the retained calculator's output. The broad
`ExactFeCalculatedSchema` decoder still reads historical zero allocations.
