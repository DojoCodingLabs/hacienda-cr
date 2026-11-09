## Context

FE and TE already achieved real sandbox acceptance through the corrected sandbox host (PR #126/#128). The SDK has exact source contracts for NC, ND and FEC. REP remains blocked by the unresolved partial-payment oracle in `exact-rep-source` and no REP POST is permitted until that oracle is independently reviewed. The manual runner currently covers only FE. This change defines how human and AI cooperate to prepare, submit once, and evidence the remaining families without changing runtime contracts. FE and TE acceptance is recorded in `docs/testing/sandbox-403-debug.md` (resolution section).

## Goals / Non-Goals

**Goals:**

- Prepare valid synthetic data for NC, ND and FEC; REP data preparation is gated on the `exact-rep-source` oracle.
- Extend runner or use an equivalent controlled SDK path while preserving one POST, no automatic retry, and status-by-clave reconciliation.
- Preserve complete redacted evidence per run.
- Record accepted/rejected outcomes and traceable follow-up attempts.

**Non-Goals:**

- No production activation, trust pins, or family enablement.
- No new fiscal runtime behavior or package publication.
- No automatic orchestration of submissions.

## Decisions

- **Human owns secrets and final send decision.** AI prepares data, XML, and checks; human controls credentials and the submit command.
- **One run directory per execution.** Each directory contains `order.json`/`document.json`, signed XML, original request, Hacienda response, SDK/package versions, hashes, and redacted diagnostics. A family may have multiple run directories (e.g. NC total and NC partial) because the runner uses exclusive `wx` file names.
- **Extend runner incrementally.** Add family-specific preparation/validation while retaining the existing FE contract.
- **Reference accepted FE first.** NC and ND require an accepted FE clave that shares issuer, environment and currency; REP is blocked by `exact-rep-source` and cannot run until its oracle is reviewed; FEC may run independently.
- **Rejected outcomes are evidence.** A rejection with documented cause is retained and used to correct data or contracts.
- **FE reference verification.** The clave does not carry currency; the run SHALL verify issuer identity, environment and currency against the private FE XML/response (or fail closed if unavailable). No reference is fabricated.
- **Reviewed sandbox values.** The runner SHALL assert host `api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`, IdP token URL `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token` and client id `api-stag`. Evidence SHALL record the host actually used and annotate the discrepancy with the v4.4 annex host `api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1`.

## Risks / Trade-offs

- Invalid synthetic data may cause avoidable rejections. Mitigation: preflight validation and exact source contracts.
- Reference catalog tension (#123 vs #120) may invalidate references. Mitigation: resolve catalog before sending reference-dependent families.
- Runner extension may accidentally weaken one-POST guarantee. Mitigation: reuse the same submit/status implementation.
- Evidence may be overinterpreted as production readiness. Mitigation: explicit production boundary in specs.

## Migration Plan

Not applicable. This is an operational acceptance process; no deployment or data migration is performed.

## Open Questions

- Which exact runner extension strategy is simplest: add family modes or a generic SDK submit wrapper?
- REP waits for the reviewed partial-payment oracle in `exact-rep-source`; no structural acceptance run proceeds first.
