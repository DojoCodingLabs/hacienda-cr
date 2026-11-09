## 1. Runtime and source

- [x] 1.1 Align exact official policy identifier/digest, precomputed-digest emission and manifest checks.
- [x] 1.2 Correct only reviewed catalog deviations while preserving 0.4.2 identity guards and aliases.
- [x] 1.3 Verify independent canonical/reference/RSA and negative tamper cases.
- [x] 1.4 Complete full verification, packed consumers and independent review (merged SDK PR70).
- [x] 1.5 Prepare reviewed version/release and verify registry artifacts before application adoption. Release PR #72 produced `v0.5.0`; Facturador verified the four registry tarballs, provenance, signatures and installed consumers before adoption (`sdk-consumer-release-readiness.md`).

## 2. Separate acceptance

- [x] 2.1 Implement the pinned whole-root verifier with explicit leaf pins and safe failures; released in 0.5.0. Institutional pin provenance/rotation approval remains tracked separately in `authenticate-hacienda-responses`.
- Exact monetary DTO serialization/full valid-domain migration and separately authorized real fiscal acceptance are tracked in `exact-monetary-dto-and-fiscal-acceptance`, not in this change.
