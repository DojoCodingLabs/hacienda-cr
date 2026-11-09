## 0. Base and integration

- [ ] 0.1 Rebase the working tree onto `origin/main` (446e6a7) so the change sees the FE/TE sandbox acceptance recorded in `docs/testing/sandbox-403-debug.md` and merged PRs #126/#128.
- [ ] 0.2 Integrate ONLY the evidence tooling from `feat/sandbox-evidence-coherent-rehearsal` (cherry-pick `8e420bc` restricted to `scripts/sandbox-outcome.mjs`, `scripts/coherent-reference-rehearsal.mjs` and the evidence-bundle portions of `scripts/validate-sdk-sandbox.mjs`). Explicitly exclude runtime changes from `3b2cba9` (#124), `16845ae` (#123) and `104b976` (exact DTOs/CLI), which are tracked separately. Verify `pnpm verify` passes after integration. If the `sandbox-evidence-bundle` capability is adopted, reconcile `document.json`/`invoice.json` and `manifest.json` naming with it (task 2.9).
- [x] 0.3 Rebuild shared and SDK (`pnpm build`) before running the runner or tests.
- [ ] 0.4 Decide whether to adopt the `sandbox-evidence-bundle` capability: if adopted, declare it as a modified capability and reconcile artifact naming (task 2.9); if not, do not integrate the bundle portions of the runner.

## 1. Preparation and References

- [ ] 1.1 Confirm the accepted FE clave and response to be used as reference for NC and ND, verifying it shares issuer identity, sandbox environment and currency with each new operation. Use `scripts/coherent-reference-rehearsal.mjs` to generate coherent references by construction. REP remains blocked by `exact-rep-source`.
- [ ] 1.2 Resolve the reference catalog tension between PR #123 and #120, and gate on PR #124 (monetary rounding to HALF_UP) for ALL families (including FEC, which is independent but still carries amounts), before any run.
- [ ] 1.3 Prepare a redacted synthetic data checklist for emisor, receptor, activity, CABYS, branch, terminal and consecutive.

## 2. Runner and Evidence Contract

- [ ] 2.1 Decide and document the runner extension strategy for NC, ND, FEC and REP (family modes vs. generic SDK submit wrapper).
- [x] 2.2 Implement runner modes for NC, ND and FEC: family detection from `document.json` (with `invoice.json` backward compatibility), shared-schema validation, exact builder selection, signing, XSD validation, and submission. REP remains blocked by `exact-rep-source`.
- [ ] 2.3 Preserve the one-POST, no-automatic-retry, status-by-clave contract in any extension, including `maxRetries: 0`, exclusive `wx` files and `PREVIOUS_SUBMISSION_REQUIRES_STATUS`.
- [ ] 2.4 Define the run directory layout and required artifact list (one directory per execution, not per family): `document.json`/`invoice.json`, `unsigned.xml`, `signed.xml`/`validation-signed.xml`, `validation-signature.json`, `request.body.json`/`validation-request.json`, `validation-attempt.json`, `validation-result.json`, `manifest.json`, `response.raw.json` when available.
- [ ] 2.5 Demonstrate the fail-closed one-POST guarantee: a deliberate second submit against an existing run identity is refused with `PREVIOUS_SUBMISSION_REQUIRES_STATUS` (not `SANDBOX_ENDPOINT_MISMATCH`) and recorded as evidence.
- [ ] 2.6 Demonstrate the fail-closed endpoint assertion: a deliberate run with mismatched host/IdP/client id is refused with `SANDBOX_ENDPOINT_MISMATCH`, performs no POST, and is recorded as evidence. Use a test seam or injected config (the runner currently reads constants from `getEnvironmentConfig`), not edits to constants.
- [ ] 2.7 Align runner console output for submission results to status and identity hash only (no response bodies, tokens or secrets); preflight/auth/sign keep their existing minimal fields.
- [ ] 2.8 Record SDK/package versions and hashes in the manifest for each run, including the hash of the accepted FE XML/response used as reference.
- [ ] 2.9 Reconcile the runner artifact contract with `sandbox-evidence-bundle` (if adopted): document how `document.json` relates to `invoice.json`, and how `manifest.json` maps to that spec's required files.
- [x] 2.10 Add offline regression tests for the runner and integrated tooling: `document.json`/`invoice.json` detection, NC/ND/FEC modes, manifest/verify, `PREVIOUS_SUBMISSION_REQUIRES_STATUS` on second submit, and `SANDBOX_ENDPOINT_MISMATCH` on bad host/IdP/client id (via a test seam or injected config). Integrate the branch's `sandbox-outcome.test.mjs` and `coherent-reference-rehearsal.test.mjs`.

## 3. NC Acceptance

- [ ] 3.1 Prepare and validate a total NC run referencing the accepted FE.
- [ ] 3.2 Prepare and validate a partial NC run with explicit positive credit lines.
- [ ] 3.3 Submit one NC run (the total case from 3.1) using its own run directory and preserve status/response artifacts. The partial case from 3.2, if submitted, requires a separate run directory (exclusive `wx` files).
- [ ] 3.4 Document the NC outcome and any follow-up correction.

## 4. ND Acceptance

- [ ] 4.1 Prepare an ND increment referencing the accepted FE.
- [ ] 4.2 Validate line-by-line delta correlation and positive allocations.
- [ ] 4.3 Submit one ND run and preserve status/response artifacts.
- [ ] 4.4 Document the ND outcome and any follow-up correction.

## 5. FEC Acceptance

- [ ] 5.0 Document which reference (99, 06, 07 or 14) the independent FEC run uses, per `ExactFecInputSchema` (1-10 references).
- [ ] 5.1 Prepare the ordinary domestic IVA13 FEC synthetic case (other FEC regimes are out of scope for this change).
- [ ] 5.2 Validate supplier/buyer identity, activity and supported references.
- [ ] 5.3 Submit one FEC run and preserve status/response artifacts.
- [ ] 5.4 Document the FEC outcome and any follow-up correction.

## 6. REP Acceptance

- [ ] 6.1 Record that REP is blocked by `exact-rep-source` until its partial-payment oracle is independently reviewed; no REP POST is permitted before that.
- [ ] 6.2 (blocked) Prepare a REP case with accepted FE reference and verified payment, only after the oracle is reviewed.
- [ ] 6.3 (blocked) Validate payment/tax allocation rules against the reviewed oracle.
- [ ] 6.4 (blocked) Submit one REP run and preserve status/response artifacts, only after the oracle is reviewed.
- [ ] 6.5 Document the REP outcome and any follow-up correction, or record that REP was not run.

## 7. Evidence and Boundaries

- [ ] 7.0 Update `docs/testing/sdk-sandbox-validation.md`, which still states that the runner only signs FE and that real submission is pending.
- [ ] 7.0a Add negative evidence cases: ND prepared without an accepted FE reference (must fail closed) and REP attempted before oracle review (must be refused), each recorded as evidence.
- [ ] 7.1 Collect redacted evidence for every accepted or rejected family, recording custody location, owner, retention and the sandbox host actually used (including the discrepancy with the v4.4 annex host).
- [ ] 7.2 Update DojoCodingLabs/facturador-dojo issue #12 with family-level outcomes and artifact references (do not use hacienda-cr PR numbers as issue references).
- [ ] 7.3 Confirm production targets, trust pins and family enablement remain disabled.
