## Why

FE and TE already have real Hacienda sandbox acceptance (PR #126/#128 in this repo), recorded in `docs/testing/sandbox-403-debug.md` (resolution section: a factura and a tiquete reached terminal `aceptado` via `api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`). NC, ND, FEC and REP still lack terminal sandbox evidence. REP is additionally blocked by the unresolved partial-payment oracle in `exact-rep-source` and cannot be submitted until that oracle is independently reviewed. The gap is not only code: it requires valid synthetic data, correct references, one controlled POST per case, and durable artifact preservation. A human+AI cooperative plan is needed so each family is prepared, sent once, and evidenced without leaking secrets or implying production readiness.

## What Changes

- Define a cooperative human+AI workflow for obtaining real sandbox acceptance evidence for NC, ND, FEC and REP.
- Specify per-family prerequisites: valid emisor/receptor data, references to an accepted FE where required, valid CABYS/activity, branch/terminal/consecutive coordination.
- Extend the sandbox runner or use an equivalent controlled submission path that preserves the one-POST, no-automatic-retry, status-by-clave contract.
- Require the runner and any equivalent controlled submission path that implements the assertion to assert the sandbox host, IdP token URL and client id before sending, and to fail closed with `SANDBOX_ENDPOINT_MISMATCH` on any mismatch. The SDK runtime requirements are unchanged.
- Require artifact preservation for every run: clave, original request, signed XML, Hacienda response, versions, hashes, and redacted diagnostics.
- Require explicit handling of accepted vs rejected outcomes, including cause documentation and traceable follow-up attempts.
- Keep production targets, trust pins, and family enablement disabled until evidence is reviewed.
- Treat REP as blocked: no REP POST is permitted until the partial-payment oracle in `exact-rep-source` is independently reviewed; REP preparation tasks remain gated.

## Capabilities

### New Capabilities

- `sandbox-acceptance-evidence`: human+AI cooperative process and evidence requirements for real sandbox acceptance of NC, ND, FEC and REP.

### Modified Capabilities

None. This change defines an operational acceptance process and evidence contract; it does not alter existing SDK runtime requirements.

## Impact

- SDK sandbox tooling and documentation (`scripts/validate-sdk-sandbox.mjs`, `docs/testing/sdk-sandbox-validation.md`, `docs/testing/sandbox-403-debug.md`).
- Exact family source contracts already merged/open (#86-#93) used as inputs. Supporting/gate PRs: #123 (reference catalog), #124 (HALF_UP monetary rounding, affects amounts in general), #132 (service integration readiness).
- Issue tracking lives in DojoCodingLabs/facturador-dojo: #12 (open, "Replace SDK live pipeline placeholder with real sandbox acceptance") and related #30/#13 evidence gates (open). In this repo those numbers refer to merged PRs and must not be used as issue references.
- No package publication, credential, certificate, or production activation is included.
- If the runner adopts the `sandbox-evidence-bundle` capability (from the evidence branch), this change extends it rather than duplicating it; naming reconciliation is tracked in task 2.9.
