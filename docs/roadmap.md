# hacienda-cr: roadmap to bulletproof production issuance

Drafted 2026-11-26 against `origin/main` 0cc8be7 and updated the same day. Keep it current as items land. npm `latest` = 0.13.0 for
shared/sdk/cli/mcp (`npm view`); 0.14.0 is in progress; `@dojocoding/hacienda-mock` is not
on npm. "Bulletproof" here means a real business can issue every document family to
Hacienda production without silent compliance errors, duplicate or lost documents, or
unverified trust decisions. **Inference** is marked as such; everything else cites a file,
a run or an issue.

## 1. Executive summary

1. FE and TE are the only families with live evidence: SDK 0.12.1 reached `aceptado` in
   sandbox (`docs/testing/sandbox-403-debug.md` §Resolution). NC, ND and FEC have no live run yet, and REP and MR are not ready to submit.
2. The schema authority is stale. `packages/sdk/schemas/manifest.json` still says
   `currentSet: "2024/v4.4"`, with `nextSet` effective 2026-11-01. The 2026 revision has been mandatory since then (#120 audit).
3. Delivery recovery has one unsafe contract. `reconcileByClave` maps a 404 to
   "safe to resubmit", which contradicts the integration guide. A few validator rules (codigoTarifaIVA for 08, the 0.001 tolerance) and the legacy rounding (#124) are correctness risks.
4. The process gates are weak. `main` has no branch protection (API: "Branch not protected"). Spec files are excluded from `tsc`. The nightly mutation run fails on every recorded run. Publishing still uses `NPM_TOKEN`.
5. Path: 0.15 fixes compliance and recovery, 0.16 proves NC/ND/FEC in sandbox and hardens the gates, 0.17–0.19 cover MR/REP, multi-tenancy and the trust policy, and 1.0 requires live evidence for every family plus human sign-offs.

## 2. Readiness scorecard

Green = live sandbox evidence and no known correctness blocker. Yellow = builds and passes
offline XSD/oracle checks, but has gaps or no live evidence. Red = cannot be issued safely today.

| Capability           | Rating | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Citation                                                                                                 |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| FE                   | Yellow | Accepted in sandbox (0.12.1). The exact path supports only ordinary IVA13 with full payment. The legacy Number path rounds with `toFixed` (#124 held). `DetalleSurtido`/`DatosImpuestoEspecifico` are unmodeled. No production run.                                                                                                                                                                                                                                                                                                                       | `sandbox-403-debug.md`; AGENTS.md "Exact ordinary FE boundary"; PR #124; `v4.4-compliance.md` Open Q4    |
| TE                   | Yellow | Accepted in sandbox (0.12.1). Same rounding and legacy-path caveats as FE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `sandbox-403-debug.md`; `docs/exact-te.md`                                                               |
| NC                   | Yellow | Exact total/partial builders exist; no sandbox run (tasks 3.1–3.4 open). The reference catalog consolidated in #150.                                                                                                                                                                                                                                                                                                                                                                                                                                      | `openspec/changes/real-sandbox-acceptance-nc-nd-fec-rep/tasks.md` §3                                     |
| ND                   | Yellow | Exact builder exists; no sandbox run (§4 open). App-authority and age policy are unproven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | same tasks.md §4; `add-exact-domestic-nd/tasks.md`                                                       |
| FEC                  | Red    | It is unverified whether the POST `emisor` should be the supplier or the buyer: `validate-sdk-sandbox.mjs:213` uses `emisor: issuer`, while the rehearsal builds the clave from the buyer (`coherent-reference-rehearsal.mjs:768`). The validator requires codigoTarifaIVA for IVA 08 (`validator.ts:69-73,224`), which is over-strict. The special and used-goods FEC sources still lack independent review. No sandbox run.                                                                                                                             | `add-exact-domestic-fec`, `special-fec-primary-contracts`, `add-used-personal-goods-fec` tasks.md        |
| REP                  | Red    | The partial-payment monetary oracle is unresolved. Primary sources rule out a generic proportional cash-to-IVA rule. Sandbox tasks 6.1–6.4 are blocked by policy.                                                                                                                                                                                                                                                                                                                                                                                         | `docs/rep-monetary-oracle-research.md`; `exact-rep-source/tasks.md` (6 open)                             |
| MensajeReceptor      | Red    | An XML builder exists, but `SubmissionRequest` has no `consecutivoReceptor` (`shared/src/types/api.ts:12-36`) and nothing in SDK src mentions it. The research found no receiver-specific outcome oracle.                                                                                                                                                                                                                                                                                                                                                 | `docs/mr-transport-correlation-research.md`; `add-exact-recipient-message/tasks.md` (4 open)             |
| Signing              | Yellow | The XAdES-EPES policy URI and SHA-256 were reviewed on 2026-10-17. node-forge advisories now have fixes (≥1.4.1/1.4.4); floors raised in the 0.14.0 deps PR (GHSA-jc66 PKCS#12 MAC forgery, GHSA-6qrw RSA DigestInfo forgery). PKCS#12 parser replacement is undecided (#119). Chain and revocation are not checked.                                                                                                                                                                                                                                      | `shared/src/constants/xades-policy.ts`; `docs/security-hardening.md`; `docs/forge-reachability-audit.md` |
| Transport/auth       | Yellow | Sandbox host corrected to `api-sandbox…/recepcion/v1`, which differs from the annex (`shared/src/constants/environments.ts:17-19`). POST is never replayed. Token and request deadlines are fixed on main: the token timer covers the whole call (`token-manager.ts:249-329`) and `fetchWithTimeout` is exported. The service-mode timeout bounds (D7) and the total budget are not done.                                                                                                                                                                 | `service-integration-readiness/tasks.md` 3.5/3.6                                                         |
| Delivery/recovery    | Red    | `reconcileByClave` returns `not_found` on 404 and its JSDoc says "safe to resubmit" (`packages/sdk/src/api/submission.ts:202-248`). The guide says a lone 404 "no confirma que el POST nunca llegó", and an immediate 404 may mean "no indexado todavía" (`docs/production-integration.md`, retry table). Sandbox answers an unknown clave with **400** plus `x-error-cause` (`sandbox-403-debug.md`). Nothing rejects a retry with different bytes for the same clave (task 4.6). The callback parser now matches the `ind-estado`/`respuesta-xml` keys. | as cited                                                                                                 |
| Persistence/sequence | Yellow | The SDK `getNextSequence` key is `documentType-branch-pos`, with no issuer or environment (`sequence-store.ts:193`; `production-integration.md` §Consecutivos). MCP already scopes by environment and issuer through `nextIssuerSequence` (`packages/mcp/src/tools/issuer-sequence.ts`). It uses a local file lock only. There is no durable store or outbox.                                                                                                                                                                                             | as cited                                                                                                 |
| Multi-tenant         | Yellow | `Scope` and `fingerprintScope` exist. MCP derives scope from the profile, so callers cannot pass one. There is no service mode, and `StoredDocument` has no tenant field.                                                                                                                                                                                                                                                                                                                                                                                 | `service-integration-readiness/tasks.md` 1.5–1.7                                                         |
| CLI                  | Yellow | `submit` supports only the FE schema. The draft defaults `proveedorSistemas` to the issuer's cédula (`packages/cli/src/commands/draft.ts:404`, Open Q1). The `status` text is stale (#120 comment). Coverage was 34% statements as of 2026-10-21. The packed `sign` check was added in #116.                                                                                                                                                                                                                                                              | `production-integration.md` table; `sdk-audit-2026-10-21.md`                                             |
| MCP                  | Yellow | `create_invoice` stops at unsigned XML and consumes a sequence. There are no hostile-message redaction tests (task 2.4). The `create_invoice` text is stale (#120).                                                                                                                                                                                                                                                                                                                                                                                       | `architecture.md`; `service-integration-readiness/tasks.md` 2.4                                          |
| Release/supply chain | Yellow | Provenance is enabled (`id-token: write`), but `NODE_AUTH_TOKEN: secrets.NPM_TOKEN` is still set (`.github/workflows/publish.yml:34,93`). `main` is unprotected. CI runs only on push to main and on PRs to main (`ci.yml:3-7`). Stacked PRs never ran CI (review notes).                                                                                                                                                                                                                                                                                 | `.github/workflows/*`                                                                                    |
| Testing              | Yellow | `pnpm verify` gate, xmllint, Python Decimal oracle and packed consumers are in place. But `**/*.spec.ts` is excluded from every package's tsconfig. Mutation (input) fails: `input-limits.ts` 60.71% < 65% floor, with no success in the 36 recorded runs (the oldest visible is 2026-11-12 or earlier). `refuerzo-testing-proyecto` has 0 of 49 tasks done.                                                                                                                                                                                              | `packages/*/tsconfig.json:8`; `gh run list --workflow mutation.yml`                                      |

## 3. Workstreams

Size: S ≤ 1 day, M ≤ 1 week, L > 1 week. "Dep" lists the items each depends on.

### P0: blocks safe production issuance, or is a correctness/compliance risk

**P0-1 Schema authority: make 2026/v4.4 current (salvage of #120)**

- Problem: the manifest declares `currentSet: "2024/v4.4"` and `nextSet.effectiveFrom: 2026-11-01`. That date has passed. The build already embeds the 2026 XSDs (`architecture.md`; `schemas/README.md:133-136`), so the declared authority no longer matches runtime behavior. The CLI `status` and MCP `create_invoice` texts are stale. #118 has an open question.
- Evidence: `packages/sdk/schemas/manifest.json`; #120 hold comment (Hacienda PDF of 2026-04-21; live NotaCredito XSD SHA-256 `b7ed3347…` equals the vendored 2026 copy).
- Deliverable: set `currentSet = "2026/v4.4"`, keep 2024 in `sets[]`, record the provenance (PDF URL, Bitácora 22/04/2026, live-XSD hashes), fix the stale CLI/MCP strings, and close #118. Then close #120 (an explicit 2024 opt-in is optional, P2).
- Acceptance: `pnpm spec:check` passes, and the manifest test asserts the current set. A golden test checks that the 2026 XSD bytes match the recorded hashes. CLI/MCP snapshot tests confirm the new text.
- Size: S. Dep: none.

**P0-2 Fix the reconcile 404 contract** _(docs/JSDoc contradiction fixed in #152 b82fd93; runtime mapping of sandbox 400 + `not_found_yet` semantics still open)_

- Problem: `reconcileByClave` treats a 404 as proof that Hacienda never received the document and invites a resubmit. The integration guide treats a 404 as possible indexing lag. In sandbox, an unknown clave returns 400 with `x-error-cause`, not 404, so the helper would report `unknown` there. Its behavior is untested against real responses (inference).
- Evidence: `submission.ts:202-248`; `production-integration.md` (retry table, "Un 404 aislado…" and the §Scope bullet that contradicts it); `sandbox-403-debug.md`.
- Deliverable: return `not_found_yet` (or `not_found` plus `observedAt`) without the "safe to resubmit" claim. Leave the resubmit decision to the caller, with a documented minimum reconciliation window. Map the sandbox 400 "no ha sido recibido" response explicitly. Fix both doc sections so they agree.
- Acceptance: unit tests for 404, 400 with x-error-cause, 5xx, timeout and clave mismatch. The docs carry no contradictory guidance. Changeset (behavior change).
- Size: S–M. Dep: none.

**P0-3 Reject a resubmit with different bytes for the same clave**

- Problem: nothing stops an integrator from sending changed XML under an existing clave after an uncertain outcome.
- Evidence: `service-integration-readiness/tasks.md` 4.6 (open).
- Deliverable: a submission-identity guard that hashes the signed bytes per clave. It ships as an SDK helper plus a store hook, and the sandbox runner already has the equivalent (`PREVIOUS_SUBMISSION_REQUIRES_STATUS`).
- Acceptance: a test proves a second submit with a different hash is refused before any network call, and that the same hash after `not_found_yet` is allowed only through an explicit API.
- Size: M. Dep: P0-2.

**P0-4 Remove over-strict and unbacked validator rules**

- Problem: (a) `IVA_TAX_CODES` includes `08` (IVA bienes usados), and the validator requires `codigoTarifaIVA` for every one of them. Per the Anexo/XSD review, it is mandatory only for 01/07, so valid used-goods documents are rejected. (b) `amountsEqual` accepts differences under 0.001 with no official backing. That can pass totals Hacienda would reject at 5 decimals (inference) or mask rounding bugs.
- Evidence: `packages/sdk/src/xml/validator.ts:57-58,69-73,224`; `calculator.ts:226` and `decimal-document.ts:38` carry the same set.
- Deliverable: limit the requirement to 01/07, with an Anexo page citation. Replace the tolerance with exact 5-decimal comparison (or the documented Hacienda tolerance, if a primary source is found), keeping a separate, named legacy-Number tolerance if needed.
- Acceptance: regression tests for 08 without codigoTarifaIVA (accepted), 01 without it (rejected), and totals off by 0.00001 (rejected on the exact path). XSD/xmllint conformance still passes.
- Size: S (a), M (b). Dep: (b) interacts with P0-5.

**P0-5 Rounding decision (#124)**

- Problem: the legacy Number calculators round with `toFixed`, not HALF_UP. Exact sixth-decimal halves diverge in 0.32% of 13% IVA cases on 5-decimal bases and 2.9% of 3-decimal quantity × price cases (2M-case fuzz). `round5(NaN)` changes from NaN to throwing.
- Evidence: PR #124 hold comment; AGENTS.md says to preserve legacy bytes.
- Deliverable: either `roundingMode: "half-up"` as an opt-in on the legacy calculators, or an explicitly breaking legacy-bytes release. In both cases, add golden tests that pin the old and new bytes, plus guidance pointing production users to the exact `Decimal*` path (already HALF_UP).
- Acceptance: golden tests for both modes, a migration note, a changeset, and #124 rebased and merged or closed.
- Size: M. Dep: a maintainer decision (§5).

**P0-6 Real sandbox acceptance for NC, ND and FEC (REP stays blocked)**

- Problem: 37 open tasks. The runner's fail-closed guards `PREVIOUS_SUBMISSION_REQUIRES_STATUS` and `SANDBOX_ENDPOINT_MISMATCH` have no regression tests or demonstrations (2.5, 2.6, 2.10c).
- Evidence: `openspec/changes/real-sandbox-acceptance-nc-nd-fec-rep/tasks.md` §0–§7.
- Deliverable: offline tests for both guards first. Then one NC total, one ND and one ordinary IVA13 FEC run, each referencing the accepted FE, with redacted evidence bundles (`scripts/sandbox-bundle.mjs`). Update `docs/testing/sdk-sandbox-validation.md` (7.0).
- Acceptance: each family has a terminal Hacienda status stored in a verified bundle (`VALID`). Negative cases (7.0a) are recorded. Production targets stay disabled (7.3).
- Size: L. Dep: P0-1, P0-4a, P0-7 (FEC), sandbox credentials (§5).

**P0-7 FEC party semantics in the POST**

- Problem: it is unverified whether Hacienda expects the FEC POST `emisor` to be the supplier or the buyer. The runner and the rehearsal construct it differently (see scorecard).
- Evidence: `scripts/validate-sdk-sandbox.mjs:213`; `scripts/coherent-reference-rehearsal.mjs:684,768`; `add-exact-domestic-fec/tasks.md` "Establish live FEC party/acceptance".
- Deliverable: determine the rule from a primary source (API doc or Anexo), or from a single controlled sandbox run. Encode it in one SDK helper (`buildSubmissionRequest(document)`) so CLI, MCP and the runner stop composing it by hand.
- Acceptance: a helper unit test per family, and an FEC sandbox run accepted with the encoded rule.
- Size: M. Dep: sandbox credentials.

**P0-8 Make CI a real gate**

- Problem: `main` has no branch protection. CI triggers only on push to main and on PRs targeting main, so stacked PRs merged without CI (#142–#145). Merges are "Proof-only CLEAN".
- Evidence: `gh api …/branches/main/protection` gives 404; `.github/workflows/ci.yml:3-7`; review process notes.
- Deliverable: a ruleset that requires the CI check on `main`, with no bypass, plus `pull_request` for all base branches (or `merge_group`).
- Acceptance: a test PR without green CI cannot merge, and a stacked PR shows CI runs.
- Size: S. Dep: repo admin (§5).

**P0-9 Gate unsupported families explicitly (REP, MR transport)**

- Problem: until their oracles exist, a REP or MR submission through the SDK is unsafe. The REP producer and the MR POST (`consecutivoReceptor`) are not implemented, and nothing tells a caller that.
- Evidence: `rep-monetary-oracle-research.md`; `mr-transport-correlation-research.md`; `shared/src/types/api.ts`.
- Deliverable: a support matrix exported from the SDK (`getFamilySupport()`) and the README. Submitting family 09/10 (REP) or an MR without the required fields fails with a typed `UNSUPPORTED_FAMILY` error.
- Acceptance: a test proves the refusal happens before signing or POST. CLI and MCP surface the same matrix.
- Size: S. Dep: none.

### P1: required for 1.0

**P1-1 MensajeReceptor transport.** Add `consecutivoReceptor` to the submission type, plus an MR-specific outcome model that never infers MR acceptance from the original FE and never repeats an ambiguous POST. Evidence: `mr-transport-correlation-research.md` §Conclusion. Acceptance: a sandbox MR run with evidence bundle. Size L. Dep: P0-2/P0-3, sandbox credentials.

**P1-2 REP exact producer and oracle.** Implement 08→09 and 10→11, the reduced line and summary, and cumulative-payment authority, following `exact-rep-source/tasks.md`. Evidence: `rep-monetary-oracle-research.md` (RLIVA 40 bis: partial payments first discharge deferred tax). Acceptance: reviewed oracle, accountant sign-off, then sandbox tasks 6.2–6.5. Size L. Dep: accountant (§5).

**P1-3 Sequence scoping in the SDK.** Add `getNextIssuerSequence(scope, …)` to the SDK (move the MCP logic there), switch the CLI to it, and add a `SequenceStore` interface so a DB-backed atomic reserve can be plugged in. Evidence: `sequence-store.ts:193`; `issuer-sequence.ts`; `production-integration.md` §Consecutivos. Acceptance: two issuers or environments in one config dir never collide. The legacy-migration refusal is preserved. Size M.

**P1-4 Finish service-integration readiness.** Covers tasks 1.5–1.7 (scope in MCP tools, service-mode missing-scope rejection, tenant in `StoredDocument`), 2.4 (hostile redaction tests for CLI JSON and MCP), and 3.5/3.6 (1000–300000 ms bound, total operation budget). Evidence: `service-integration-readiness/tasks.md`. Size M. Dep: P1-3.

**P1-5 Response and callback trust.** Get independent approval of the pinned Hacienda signer certificate provenance, rotation and revocation. Verify against real authorized response fixtures. Ship a `parseAndVerifyCallback()` convenience that requires pins. The structural parser alone is documented as untrusted. Evidence: `authenticate-hacienda-responses/tasks.md` (2 open); `packages/sdk/src/api/callback.ts:8`. Size M. Dep: real fixtures (§5).

**P1-6 Typecheck test files.** Add a `tsconfig.spec.json` per package (or `vitest --typecheck`) to `pnpm verify`, then fix the errors that surface. Evidence: `packages/*/tsconfig.json:8`, `shared/tsconfig.json:8`. Acceptance: CI fails on a deliberate type error in a spec. Size M (error backlog unknown).

**P1-7 Repair the mutation nightly.** `input` job: `src/xml/input-limits.ts` scores 60.71% against a 65% floor (`scripts/verify-mutation-report.mjs:37`). Add killing tests rather than lowering the floor, and alert on failure. Evidence: mutation run of 2026-11-26. Size S.

**P1-8 Supply chain.** Finish npm trusted publishing (OIDC), remove `NPM_TOKEN` (`publish.yml:93`), and enforce provenance. Decide on PKCS#12 (#119, measure the real corpus, evaluate pkijs) to retire node-forge and close #69. Size S (OIDC) + L (#119). Dep: npm org admin.

**P1-9 ProveedorSistemas default.** The CLI draft sets it to the issuer's cédula, but the Anexo says it is the software provider's ID (`v4.4-compliance.md` Open Q1; `draft.ts:404`). Add a `provider_id` config and require it in production profiles. Size S.

**P1-10 Open compliance questions.** (a) Does `ImpuestoNeto` include non-IVA taxes (Open Q2)? (b) Code-99 free-text companion refines (Open Q3). (c) The alphanumeric cédula jurídica format rule (`v4.4-compliance.md` "Remaining"). Each needs a primary-source answer, then tests. Size M. Dep: Hacienda/accounting answers for (a); Registro Nacional for (c).

**P1-11 Retire independent-review debt.** The special-FEC (#91) and used-goods FEC (#93) sources are merged but have no independent review (`special-fec-primary-contracts`, `add-used-personal-goods-fec` tasks.md). Run a scoped review and record the outcome. Size M.

**P1-12 Coverage and refuerzo-testing.** Execute `openspec/changes/refuerzo-testing-proyecto` (49 tasks: coverage attribution, shared schema specs, CLI handlers, thresholds). The CLI was 34% and shared 57% statements on 2026-10-21 (`sdk-audit-2026-10-21.md`). Size L.

**P1-13 Accounting and production gates.** Tasks 1.2b and 1.5 (synthetic fixtures and accountant sign-off), 2.4 (retention period per Decreto 44739-H art. 13 / MH-DGT-RES-0027-2024; the "5 años" figure was removed as unverified in #133), and 2.5 (production checklist). Evidence: `accounting-production-gates/tasks.md`. Size M. Dep: accountant/legal.

### P2: hardening and developer experience

- **P2-1** The pnpm 12.10.1 shim fails with ENOEXEC on macOS. Document a workaround or pin a working version. Also, `COREPACK_ENABLE_AUTO_PIN=0` breaks the CLI `history.spec` redaction test (`pr-review-2026-11-26.md`). Verify whether #148 fixed that. Size S.
- **P2-2** Flaky `scripts/sandbox-example.test.mjs` (15 s timeout under load). Size S.
- **P2-3** CI runtime and Biome evaluation (#147). Size M.
- **P2-4** Model `DetalleSurtido` and `DatosImpuestoEspecifico`, or reject them explicitly (Open Q4). Size M.
- **P2-5** CLI submit for the other families via the P0-7 helper. MCP sign/submit handoff stays out of scope unless requested. Size M.
- **P2-6** Publish `@dojocoding/hacienda-mock`, or mark it private. Size S.
- **P2-7** Optional explicit 2024/v4.4 opt-in for historical validation (from #120). Size S.
- **P2-8** Close or archive stale openspec changes once #85 is resolved (`finalize-exact-domestic-v1-family-contracts`, 10 open). Size S.
- **P2-9** Clear the remaining audit item: ExcelJS→uuid moderate, dev-only (`sdk-audit-2026-10-21.md`). Size S.

## 4. Suggested release sequence

| Release              | Scope                                                                                            | Exit evidence                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 0.14.0 (in progress) | Already-merged consolidations (#122, #134, #148, #150, #151, #135, #149)                         | Published per `docs/releasing.md`, and a published-release record                           |
| 0.15.0               | P0-1, P0-2, P0-4a, P0-9, P1-7, P1-9; P0-8 applied out-of-band                                    | `pnpm verify` and a green mutation run; manifest says 2026; reconcile tests; support matrix |
| 0.16.0               | P0-3, P0-4b, P0-5 (opt-in path), P0-7, P1-6; sandbox guard tests (P0-6 offline part)             | Golden rounding tests; spec typecheck in CI; FEC party rule cited                           |
| 0.17.0               | P0-6 live NC/ND/FEC runs; P1-3, P1-4; P1-8 OIDC                                                  | Three accepted sandbox bundles; tokenless publish run                                       |
| 0.18.0               | P1-1 MR transport; P1-5 trust policy; P1-11 reviews; P1-10 answers                               | MR sandbox bundle; approved pin policy                                                      |
| 0.19.0 / 1.0.0-rc    | P1-2 REP; P1-12 coverage; P1-13 accounting sign-off; legacy-rounding breaking switch (if chosen) | REP sandbox bundle; accountant sign-off                                                     |
| 1.0.0                | Freeze the public API; remove deprecated legacy defaults                                         | See below                                                                                   |

**1.0 must mean:**

1. Every family (FE, TE, NC, ND, FEC, REP, MR) has at least one accepted sandbox bundle produced by the released version.
2. At least one supervised production issuance per family, or an explicit documented exclusion signed off by the maintainer.
3. Schema authority is current, with provenance.
4. No unbacked tolerances or over-strict rules.
5. Recovery never invites a blind resubmit.
6. Numbering is scoped by issuer and environment in every adapter.
7. Response trust uses an approved pin policy.
8. The CI gate is enforced by a ruleset; spec files are typechecked; the mutation nightly is green.
9. Publishing uses OIDC only.
10. Accounting and legal retention gates are signed off.

## 5. Items that need a human or external party

| Item                                                                                                                                           | Who                                        | Blocks                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------- |
| Live sandbox credentials (rut-stag user/password, P12 + PIN) and explicit authorization for each POST (AGENTS.md: credentials ≠ authorization) | Maintainer / taxpayer                      | P0-6, P0-7, P1-1, P1-2 |
| Production credentials, a supervised first production issuance, and the production checklist                                                   | Business owner                             | 1.0, task 2.5          |
| Rounding policy decision (opt-in or breaking release) for #124                                                                                 | Maintainer                                 | P0-5                   |
| Accountant review of synthetic fixtures and derived entries; REP partial-payment mapping; ImpuestoNeto semantics                               | Contador público autorizado                | P1-2, P1-10a, P1-13    |
| Legal confirmation of the retention period (Decreto 44739-H art. 13, MH-DGT-RES-0027-2024)                                                     | Legal / tax advisor                        | P1-13 (2.4)            |
| Approval of Hacienda signer-cert pin provenance, rotation and revocation; real response fixtures                                               | Security reviewer + maintainer             | P1-5                   |
| Repository ruleset requiring CI                                                                                                                | GitHub org/repo admin                      | P0-8                   |
| npm trusted publisher configuration and removal of `NPM_TOKEN`                                                                                 | npm org admin                              | P1-8                   |
| Effective dates and format of alphanumeric cédulas jurídicas (the spec said ~Q4 2026 but gave no source)                                       | Registro Nacional / Hacienda communication | P1-10c                 |
| Redistribution rights for the vendored government PDFs/RAR (`schemas/README.md` "Unverified assumptions")                                      | Legal                                      | Repo hygiene           |
| Independent reviewer for special FEC (#91) and used-goods FEC (#93)                                                                            | Second engineer                            | P1-11                  |
| FEC POST party rule, if no primary source settles it: Hacienda support query                                                                   | Maintainer → Hacienda                      | P0-7                   |

## Corrections to the brief's context

- The nightly mutation run has not just failed since 2026-11-24. It failed on every one of the 36 runs `gh` lists (the oldest visible is 2026-11-12) because of the `input-limits.ts` floor.
- "Numbering not scoped by issuer/environment" holds for the SDK `getNextSequence` and the CLI. MCP already uses `nextIssuerSequence`, which is keyed by environment and issuer.
- The #139 token-timeout regression and the #138 callback-key mismatch look fixed on main: the token timer wraps the full call, `fetchWithTimeout` is exported, and the parser uses `ind-estado`/`respuesta-xml`. That conclusion comes from reading the source only, not from running tests.

## Addenda (orchestrator, 2026-11-26)

- Add a CI dependency gate (`pnpm audit --prod`, fail on high) plus Renovate/Dependabot; 0.14.0 was nearly published against a lockfile carrying node-forge/zod/MCP-transitive highs.
- Require CI status checks via branch protection on main; add `pull_request` CI for non-main bases or forbid gh-stack bases (stacked PRs never ran CI and cannot be retargeted once their base merges).

## Status log

- 2026-11-26: the main ruleset "main: CI gate" is active (PR required, 3 CI checks required, no force-push or deletion). CI runs for every PR base. A prod-dependency audit gate and Dependabot were added (#155). The download counter moved to the `metrics` branch. Together these cover P0-8 except spec typechecking (P1-6) and the mutation fix (P1-7), which are in progress.
- 2026-11-26: 0.14.0 is tagged. Its publish is blocked by a rejected `NPM_TOKEN` (run 45887607362); resume per docs/releasing.md once the credential is fixed.
