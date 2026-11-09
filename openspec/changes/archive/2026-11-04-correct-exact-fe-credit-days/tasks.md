## Implementation and verification

- [x] Enforce positive 1–5 digit current credit terms for 02/10 and any present term, preserving valid lexemes.
- [x] Add explicit retained schema/calculator with shared exact arithmetic, no retained XML/sign/POST builder and unchanged legacy Number behavior.
- [x] Reject wrong-family 09/11/13 in current exact FE, preserve prior 09/11 denial and historical 13 read-only compatibility; retain other valid FE conditions.
- [x] Cover missing/zero/all-zero/1/leading-zero/99999/overflow, valid other conditions, Python Decimal and native XSD.
- [x] Preserve actual published 0.8 unsigned XML fixtures and prove synthetic signed custody remains structural/read-only while current construction refuses invalid terms.
- [x] Complete repository verification, coverage, packed consumers and advisory readback; retain the high node-forge and moderate uuid advisories explicitly.
- [x] Obtain independent root/security review of the exact source and artifact-facing contract. Independent security reviewed the source and version/artifact changes alongside PR #83; root separately ran the full source verify and rehashed all four prepared tarballs (`facturador-dojo/docs/testing/sdk-090-adoption.md`).

## Separate release and adoption

- [x] Review the coordinated 0.9.0 version/artifact PR before tag/provenance publication. Version PR #84 merged as `d6b6475`; annotated tag `v0.9.0` points to it; registry bytes, SLSA provenance/signatures and fresh consumers were verified in `facturador-dojo/docs/testing/sdk-090-adoption.md`.
- [x] Adopt only verified published packages with new current rules/proof tuples and explicit retained producer/byte binding; preserve actual historical field omission and GET/archive identity. Facturador PR #133 adopted the verified 0.9.0 artifacts and forward rules tuple; related retained/replay acceptance is recorded in `sdk-090-adoption.md`.
