---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

Raise `engines.node` from `>=22` to `>=22.12`. The XAdES signing dependencies (xadesjs/xmldsigjs 3) require Node `^20.19 || >=22.12`, so the declared range now matches what actually runs. The four linked packages move together.
