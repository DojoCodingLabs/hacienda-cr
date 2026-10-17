# SDK correction and validation iterations — 2026-10-15

Status: **production readiness remains unproven**. The implementation has substantive fixes and repeated offline verification. Real sandbox authentication and signing succeed; receipt submission and status queries return HTTP 403. No production fiscal request was made.

This report supersedes the execution counts and open-defect status in the earlier robustness audit and sandbox report. Those documents remain historical records.

## Changes under verification

- Reconcile clave owner, date in Costa Rica, fiscal document type, and consecutivo in builders, FE input validation, and raw XML validation. Purchase invoices use the buyer as the clave owner; receiver messages retain the original document key.
- Correct FEC/08, FEE/09, REP/10, reference catalogs, tariff/percentage relationships, current activity formatting, and coherent fixtures.
- Preserve the current main branch’s vendored official XSD bytes, provenance manifest, generator and integrity gate. The original investigation confirmed that current `.xsd` files differ from legacy `.xsd.xml` resources.
- Invalidate MCP authenticated clients when resolved identity, environment, certificate configuration, password, or PIN changes. Concurrent identical authentication is deduplicated.
- Scope MCP numbering by environment and issuer. Refuse silently restarting counters when unassigned legacy counters exist; migrate and seed the issuer series first.
- Apply 30-second per-attempt HTTP and OAuth deadlines, including native response-body consumption, and reject redirects. Mutations have no automatic retries by default; recover ambiguous submissions by querying the same clave.
- Harden diagnostics and add ordinary regression cases. Earlier expected-failure tests included incorrect imports that caused TypeErrors rather than proving the claimed integrity defect. They have been replaced with correctly constructed passing regressions; expected failures are not counted as resolved evidence.

## Iterations and evidence

1. Focused input, identity, fixture, XSD, catalog, cache, numbering and transport regression suites. Native localhost tests verify that a 307 redirect never reaches the credential destination, stalled requests terminate, and response-body stalls terminate.
2. Complete package tests, typechecks and lint exposed an obsolete test treating REP/10 as invalid, plus type-only import and non-null assertion lint failures. These failures were retained in the run log and corrected before the next full pass.
3. A synthetic FE was prepared using the sandbox certificate identity and public registered-activity/CABYS reference lookups. The first preparation caught a receiver-identification omission; local validation was strengthened. The next preparation passed input validation, signing, cryptographic verification with the signing dependency, and current XSD validation.
4. One signed FE POST to the documented sandbox reception endpoint returned 403. Repeated fresh-authentication GETs for the **same preserved key** also returned 403. Lowercase `bearer` and a trailing slash did not change this result. No second POST or replacement identity was used to hide this failure.

Authentication returned HTTP 200. Reception errors contained an API-gateway authorization-format diagnostic, rather than Hacienda's signed acceptance/rejection response. This suggests routing/authorization-layer rejection, but the cause is **not established**. It is not evidence of document acceptance or fiscal rejection.

The [current Hacienda v4.4 annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), page 97, still explicitly documents `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/`. We did not send credentials to guessed alternative hosts or disable TLS verification.

## Current-main PR validation

The fixes were reconciled onto repository main at `d3c4aff`; 57 newer upstream commits were preserved. Already-merged username, schema, cancellation, response-size, signing and submission safeguards were retained rather than replaced by older local implementations.

| Verification                                                  | Result                                                                                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Shared package tests                                          | 229 pass                                                                                                              |
| SDK package tests                                             | 1,046 pass, four live cases intentionally skipped                                                                     |
| CLI package tests                                             | 71 pass                                                                                                               |
| MCP package tests                                             | 47 pass                                                                                                               |
| Package suite total                                           | **1,393 pass**, four skipped                                                                                          |
| Script regression suite                                       | **118 pass**, including sandbox runner guards                                                                         |
| Installed-package consumer checks                             | Pass: metadata, strict TypeScript, packaged sandbox preparation, native ESM SDK, CLI validation/dry-run and MCP stdio |
| Formatting, lint, typecheck, build, official schema integrity | Pass                                                                                                                  |

The first installed-package pass caught a newly required fixture identity helper missing from its consumer harness; the harness now resolves that helper through the installed public SDK and passes. Live reception remains blocked as documented below. No production request was made while preparing this PR.

## Historical offline results before rebasing onto current main

These counts refer to the original validation checkout at base commit `4d7430b`, before the fixes were reconciled with the newer repository main. They must not be presented as the current PR verification result.

The final complete uncached run passed all 16 build-dependency/test/typecheck/lint jobs: Shared 114, SDK 854, CLI 70, MCP 46 tests, totaling 1,084 passing tests and three deliberately skipped live-authentication cases. No `it.fails` remain. Four separate runner guard tests also pass.

A subsequent diagnostic-boundary review added one CLI regression proving that a configured PIN matching fiscal digits does not change successful XML or claves. The final CLI re-run contains 71 passing tests, bringing the verified package total to **1,085**, plus four runner guards. Relevant CLI typecheck/lint and MCP lint were repeated after this change. The skipped cases and private live attempts are reported separately, never counted as live acceptance.

## Private evidence and reproducibility

Credentials, certificate details, issuer context, signed XML, request body, original attempt marker and HTTP response bodies are retained outside Git, with private file permissions. OAuth response bodies and authorization headers are not saved by the runner. Console output contains only result codes, status and non-secret identity hashes.

Use the explicit runner described in [sandbox validation](sdk-sandbox-validation.md). A failed or interrupted `submit` must be followed by `status` on its original directory. Keep markers and original bytes; do not delete them to enable another POST.

The [403 investigation](sandbox-403-debug.md) reproduces the failure with native Node and system curl, verifies the token signature, and proves that AWS receives the Authorization header unchanged. It includes a sanitized operator escalation packet; the gateway configuration cause remains unconfirmed.

## Release gates still open

- Restore documented sandbox reception access and obtain a signed terminal acceptance for FE.
- Obtain individual live evidence for TE, NC, ND, FEC, FEE, REP and receiver messages with coherent references. Offline coverage is not a substitute.
- Add receiver-message semantic cross-checks beyond XSD and finish special IVA 07/08 and conditional reference rules; current ordinary IVA validation does not cover every tax regime.
- Independently verify XML signatures with a separate verifier, including tampering.
- Validate decimal edge cases and applicable accounting treatments with the contadora.
- Implement and exercise application-level durable outbox/reconciliation, transactional numbering, tenant isolation and recovery.

A successful local test suite does not close these gates. These changes are proposed source changes, not a published SDK release.
