## 1. Runtime and source

- [x] 1.1 Align exact official policy identifier/digest, precomputed-digest emission and manifest checks.
- [x] 1.2 Correct only reviewed catalog deviations while preserving0.4.2 identity guards and aliases.
- [x] 1.3 Verify independent canonical/reference/RSA and negative tamper cases.
- [x] 1.4 Complete full verification, packed consumers and independent review (merged SDK PR70).
- [x] 1.5 Prepare reviewed version/release and verify registry artifacts before application adoption. Release PR #72 produced `v0.5.0`; Facturador verified the four registry tarballs, provenance, signatures and installed consumers before adoption (`sdk-consumer-release-readiness.md`).

## 2. Separate acceptance

- [x] 2.1 Implement/review institutional response signature and explicit trust policy separately. PR #71 added the pinned whole-root verifier with explicit leaf pins and safe failures; released in 0.5.0. Institutional pin provenance/rotation approval remains open in `authenticate-hacienda-responses`.
- [ ] 2.2 Implement/review exact monetary DTO serialization and full valid-domain migration separately.
- [ ] 2.3 Collect separately authorized real fiscal acceptance; offline success never closes this gate.
