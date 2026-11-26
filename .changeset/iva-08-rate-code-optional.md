---
"@dojocoding/hacienda-shared": patch
"@dojocoding/hacienda-sdk": patch
---

Stop requiring `codigoTarifaIVA` for IVA tax code 08 (IVA Régimen de Bienes
Usados, factor).

Anexos y Estructuras v4.4, p. 38, says `CodigoTarifaIVA` "Se convierte en
obligatorio para los Códigos 01, 07. de la nota 8", and every vendored v4.4 XSD
(2024 and 2026) declares it `minOccurs="0"`. `validateFacturaInput` and the
exact `DecimalTaxInputSchema` now require it only for codes 01 and 07, so valid
used-goods documents are no longer rejected. Code 08 still requires
`factorCalculoIVA` (p. 39). Codes 01 and 07 without a rate code are still
rejected.

The legacy `number` validator's 0.001 comparison tolerance is now an internal,
named and documented constant (`LEGACY_NUMBER_TOTALS_TOLERANCE`, not exported
from the package). It is an implementation tolerance
for binary floats, not a Hacienda rule: the Anexo publishes no numeric
tolerance. Its value is unchanged, so no previously accepted input is
rejected. The exact `Decimal*` / `Exact*` paths already compare at 5 decimals
with no tolerance; new regressions pin that a 0.00001 difference is rejected.
