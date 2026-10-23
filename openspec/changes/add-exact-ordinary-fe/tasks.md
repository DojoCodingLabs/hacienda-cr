## Implementation

- [x] Add strict public string input/calculated schemas without changing legacy APIs.
- [x] Implement bounded BigInt ordinary IVA13 calculation and exact XML text.
- [x] Cover maximum precision, JSON, native XSD, Python oracle and negative boundaries.
- [x] Verify fresh installed artifacts and complete repository verification.
- [x] Independent review of public contract, precision and provenance evidence: [root review and ten focused independent checks](https://github.com/DojoCodingLabs/hacienda-cr/pull/73#issuecomment-6243462218), merged SDK PR73.

## Separate acceptance

- [x] Adopt the reviewed published API in the application with its immutable validation contract. Facturador adopted the exact 0.6.0 registry artifacts, signed tuple and app consumer checks (`facturador-dojo/docs/testing/sdk-060-exact-consumer.md`); the app pin later advanced through 0.7–0.9.
- [ ] Review other fiscal cases before expanding this explicitly ordinary case.
- [x] Publish only after explicit release review/authorization. Release PR #74 produced tag `v0.6.0`; registry integrities, SLSA provenance and installed consumers were independently verified before app adoption.
