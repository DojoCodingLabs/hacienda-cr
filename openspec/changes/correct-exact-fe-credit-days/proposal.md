# Correct exact FE credit terms without erasing historical custody

## Why

The published exact FE contract accepts zero credit days for condition 02 and
omits the required term check for condition 10. The official current Hacienda
annex page 25 requires positive credit days for both; optional integer XSD shape
alone cannot enforce the rule. Tightening a shared current API must not prevent
independently bound historical originals from being read or calculated.

## What changes

Enforce current exact FE term requirements while preserving valid lexemes. Add
an explicitly read-only retained schema/calculator with the former term shape,
sharing the same bounded BigInt arithmetic. Preserve legacy Number behavior;
add no retained XML builder, signing/transport API or current permissive flag.

## Impact

Shared/SDK exports, exact-builder/schema/byte-custody/native/Decimal tests and
packed ESM/type consumers. A minor Changeset plans the coordinated 0.9.0 family;
release/version/artifact review and Facturador adoption remain separate. No live
fiscal effect, source rewrite or publication is part of this change.

The same current-only boundary rejects REP-only sale conditions 09/11 and FEC-only 13, per the official annex page 70 notes 20/22/24. Retained and legacy Number APIs preserve their prior source contract.
