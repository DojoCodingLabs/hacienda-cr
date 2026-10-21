---
"@dojocoding/hacienda-cli": minor
---

Keep `hacienda draft` money in bounded decimal text.

The interactive draft no longer calculates with `number` or a local `round5`:
quantities and unit prices are parsed as bounded decimal text, line and tax
amounts are computed with the SDK's BigInt kernel (5 decimals, HALF_UP), and
the summary is an exact integer sum. Draft JSON now stores `cantidad` and every
monetary field as text, so values survive JSON without binary rounding.

`hacienda submit` and `hacienda validate` detect these drafts and validate them
with the exact path, including the same XSD check as legacy Number documents.
Existing Number invoices keep the published schema, validator and XML builder
unchanged.
