---
"@dojocoding/hacienda-sdk": minor
---

Add document generation coverage: random generator, XML parser, golden corpus and property tests.

The SDK now ships a `fast-check` generator that produces structurally valid
documents for all seven comprobante types, a `parseDocumentXml` parser (the
faithful inverse of the builders, exported from the package root), a golden
corpus with one known-good document and its expected bytes per type, and a
property battery that checks generated documents against the official XSD,
against the SDK's own input validation, and for the build → parse → build
fixed point.

The golden bytes are the review artifact of a change in the XML output: they are
regenerated deliberately (`GOLDEN_CORPUS_UPDATE=1`) and never edited by hand.
The exhaustive property pass runs in `pnpm verify` through `pnpm test:properties`,
with configurable budgets (`PROPERTY_RUNS`, `XSD_RUNS`) and without credentials
or network. The public monetary contracts are unchanged: the generator, parser
and corpus speak the type each builder declares.
