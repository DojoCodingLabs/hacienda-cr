---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-mcp": minor
---

Fix IVA tax code 08 (IVA Régimen de Bienes Usados, factor): its amount is now
`factorCalculoIVA × subtotal` on every path. This changes the output and the
validation of documents that use code 08. Documents without code 08 keep their
bytes.

Anexos y Estructuras v4.4: p. 37 (Codigo) "Al utilizar el código 08, se debe
utilizar para el cálculo de factor del IVA por el subtotal"; p. 39
(FactorCalculoIVA, Decimal 5,4) the factor "Debe expresarse en formato
decimal" and is validated as present for 08 "caso contario se rechazará";
p. 42 (Monto) "se obtiene de la multiplicación del factor por el subtotal".
The 2024 and 2026 v4.4 XSDs declare `Tarifa` and `FactorCalculoIVA`
`minOccurs="0"`, factor `totalDigits 5`, `fractionDigits 4`.

- Legacy Number (`calculateTaxAmount`, `calculateLineItemTotals`,
  `createLegacyCalculator` in both rounding modes): `LineItemTaxInput` gains
  `factorCalculoIVA`. Code 08 is taxed on the subtotal (not the base
  imponible), rounded with the calculator's rounder, and the calculated
  `Impuesto` carries `factorCalculoIVA`. Code 08 without a factor now throws
  (it used to compute `tarifa` on the base imponible). Signatures are
  unchanged.
- Exact `DecimalDocument*`: `subtotal × factor` on scaled integers, HALF_UP to
  5 decimals. `DecimalTaxInputSchema` no longer requires `tarifa` for 08 and
  requires `factorCalculoIVA` instead.
- `validateFacturaInput` checks the 08 amount against factor × subtotal; a
  `tarifa` on 08 is informational and no longer enters the check.
- MCP `create_invoice` accepts `factorCalculoIVA` on a tax (required for 08).
- `ImpuestoSchema.factorCalculoIVA` now enforces the XSD's 4 decimals.
- Fail closed where the Anexo is silent (open questions in docs/roadmap.md,
  P0-4c): exoneración on code 08 and `factorCalculoIVA` on any code other than
  08 are rejected by the calculators, the exact schema and the validator.
