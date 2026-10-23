## Implementation

- [x] Add bounded whole-root verifier with explicit leaf pins and exact context.
- [x] Add safe error taxonomy and SDK barrel exports.
- [x] Preserve unchanged official schema bytes and verify recorded OVI digest.
- [x] Test native independent signed fixture, tampering, wrapping and trust failures.
- [x] Add actual installed-tarball consumer verification.
- [x] Complete full verification and independent source review (merged SDK PR71).

## Operational acceptance

- [ ] Independently approve institutional public pin provenance/rotation and revocation policy.
- [ ] Verify real authorized institutional response fixtures before production activation.
- [x] Review and publish a package release; do not merge unreviewed Money changes. PR #71 merged and release PR #72 published `v0.5.0` with the verifier; the changelog records that the unmerged Money migration was not imported.
