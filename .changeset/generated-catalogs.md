---
"@dojocoding/hacienda-shared": minor
"@dojocoding/hacienda-sdk": minor
"@dojocoding/hacienda-cli": minor
"@dojocoding/hacienda-mcp": minor
---

Generate TypeScript code catalogs from `codes.json` (single source of truth)

`shared/src/generated/` now holds the code catalogs rendered from the vendored
XSD enumerations in `packages/sdk/schemas/codes.json`, via the new
`pnpm spec:generate` command (full mode re-extracts first; `-- --no-extract`
renders from the committed `codes.json`). Generated files carry a
`NO EDITAR` first-line header and are never edited by hand.

Public API is unchanged: a parity-freeze test pins every migrated export's
name and values byte-for-byte (an intentional value change requires a
`major`). Migrated: `PaymentMethod`, `SaleCondition`, `TaxCode`,
`IvaRateCode`, `MensajeReceptorCode`, `SituationCode`, `IdentificationType`,
`ProvinceCode`, `CURRENCY_CODES`, `DISCOUNT_CODES`, `OTHER_CHARGE_TYPES`,
`EXONERATION_INSTITUTIONS`, plus new additive exports
`COMMERCIAL_CODE_TYPES`/`CommercialCodeType` and
`TRANSACTION_TYPES`/`TransactionType` (previously inline literal sets in
schemas/types). Curated companions (`*_NAMES`, derived subsets,
`ExonerationType`, `UNITS_OF_MEASURE`, `DocumentTypeCode`, `REFERENCE_*`,
XAdES and environments) remain hand-written in `shared/src/constants/`;
pairings live in `scripts/codes-generate/table-map.mjs`.

Verification locks: `pnpm verify` regenerates in `--no-extract` mode and
fails on any committed drift, and a new ESLint rule rejects hand-written
1-2 digit catalog literals outside documented exclusions.

Semver note (D9): this is additive-only; renaming or changing the value of
an existing export would be `major`. The `linked` group keeps the four
versions synchronized.
