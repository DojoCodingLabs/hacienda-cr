---
"@dojocoding/hacienda-sdk": minor
---

Expose the exact decimal kernel as additive aliases.

`multiplyExactDecimal`, `percentExactDecimal`, `sumExactDecimal` and
`EXACT_MONEY_SCALE` re-export the reviewed `multiply`, `percent`, `sum` and
`MONEY_SCALE` primitives. They let `hacienda draft` reuse the exact kernel
without duplicating arithmetic. The existing primitives keep their behaviour.
