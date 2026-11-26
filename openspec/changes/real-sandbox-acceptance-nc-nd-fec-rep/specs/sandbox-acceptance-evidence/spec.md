## Purpose

Defines the cooperative human+AI process and evidence contract for obtaining real Hacienda sandbox acceptance of NC, ND, FEC and REP without exposing secrets or implying production readiness.

## ADDED Requirements

### Requirement: Per-family synthetic preparation

The process SHALL prepare a distinct synthetic operation for each fiscal family before any submission. NC and ND SHALL reference an already accepted FE that shares the same issuer identity, the same environment (sandbox), and the same currency as the new operation.

#### Scenario: NC references an accepted FE

- **WHEN** an NC run is prepared
- **THEN** it references the clave of an accepted FE and includes a valid reason/reference combination

#### Scenario: Reference FE shares issuer, environment and currency

- **WHEN** an NC or ND run is prepared
- **THEN** the referenced FE has the same issuer identity, sandbox environment and currency; otherwise preparation fails closed and no reference is fabricated. REP is excluded until its oracle is reviewed.

### Requirement: FEC ordinary domestic IVA13 scope

FEC SHALL use a valid supplier/buyer identity pair and references supported by the current exact source contract. For this change FEC is limited to the ordinary domestic IVA13 case. Other FEC regimes (used personal goods, special primary contracts) are separate changes and are out of scope here. FEC SHALL reject unsupported regimes.

#### Scenario: FEC uses supported references

- **WHEN** an FEC run is prepared
- **THEN** it uses only references supported by the current exact source contract and rejects unsupported regimes

### Requirement: REP blocked by partial-payment oracle

REP SHALL reference an accepted FE and a verified payment, but REP preparation and submission remain blocked until the partial-payment oracle in `exact-rep-source` is independently reviewed.

#### Scenario: REP blocked until oracle review

- **WHEN** a REP run is attempted
- **THEN** preparation fails closed and no POST is performed until the partial-payment oracle in `exact-rep-source` is independently reviewed

### Requirement: Sandbox destination assertion

Any path used to submit a run SHALL assert the sandbox host, IdP token URL and client id against the reviewed sandbox values before sending. On any mismatch it SHALL refuse to send and return `SANDBOX_ENDPOINT_MISMATCH`. A run SHALL NOT be submitted through a path that omits this assertion. The SDK runtime requirements are unchanged by this requirement.

#### Scenario: Mismatched host blocks submission

- **WHEN** the configured API base URL, IdP token URL or client id does not match the reviewed sandbox values
- **THEN** submission is refused with `SANDBOX_ENDPOINT_MISMATCH` and no POST is performed

#### Scenario: Reviewed sandbox values

- **WHEN** evidence is recorded for a run
- **THEN** it cites the reviewed sandbox host (`api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`), IdP token URL (`https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token`) and client id (`api-stag`), and notes the discrepancy with the v4.4 annex host (`api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1`)

### Requirement: One controlled submission per run

The process SHALL submit each run exactly once. It SHALL NOT automatically retry after timeout, error, or unknown acknowledgement.

#### Scenario: Ambiguous acknowledgement reconciles same clave

- **WHEN** a submission acknowledgement is lost or ambiguous
- **THEN** the same run identity and original request are preserved and reconciled by clave before any new submission

#### Scenario: Definitive rejection allows new run identity

- **WHEN** a submission receives a definitive rejected or error outcome
- **THEN** a new run identity may be used for a corrected attempt, and the prior attempt is retained as evidence

#### Scenario: Repeated attempt guard

- **WHEN** a second submit is attempted against an existing run identity without prior status reconciliation
- **THEN** it is refused with `PREVIOUS_SUBMISSION_REQUIRES_STATUS` and no POST is performed

### Requirement: Artifact preservation

Every run SHALL preserve, outside version control, a private retained bundle containing the clave, original request, signed XML, Hacienda response, SDK/package versions, hashes, and redacted diagnostics.

#### Scenario: Rejected outcome is retained

- **WHEN** Hacienda returns rejected or error
- **THEN** the run artifacts are retained and the cause is documented without deleting or replacing prior attempts

#### Scenario: Private bundle vs shared evidence

- **WHEN** evidence is shared externally
- **THEN** the shared evidence excludes credentials, certificates, PINs, tokens, signed XML and raw responses, and is limited to metadata, request IDs, hashes and redacted diagnostics; the private bundle retains the full artifacts

### Requirement: Console output

For a submission result, console output SHALL contain only status and identity hash.

#### Scenario: Redacted console

- **WHEN** the runner reports a submission result
- **THEN** it prints only status and identity hash, and no response bodies, tokens or secrets. Preflight, auth and sign keep their existing minimal fields.

### Requirement: Evidence custody and host discrepancy

Evidence SHALL record the custody location, responsible owner and retention expectation for the run directory, and SHALL record the sandbox host actually used. Because the host that currently answers (`api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1`) differs from the host published in the v4.4 annex (`api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1`), evidence SHALL annotate that discrepancy instead of treating a successful run as confirmation of the documented host.

#### Scenario: Host discrepancy annotated

- **WHEN** a run completes
- **THEN** the evidence records the sandbox host actually used and annotates the discrepancy with the v4.4 annex host

### Requirement: Family ordering and dependencies

NC and ND SHALL NOT be submitted before a valid accepted FE reference exists. REP is additionally blocked by `exact-rep-source` and SHALL NOT be submitted until its partial-payment oracle is reviewed. FEC MAY be submitted independently. Each family SHALL be evidenced separately; mixed-family runs are prohibited.

#### Scenario: ND waits for accepted FE

- **WHEN** no accepted FE reference is available
- **THEN** ND preparation fails closed and does not fabricate a reference

#### Scenario: FEC independent

- **WHEN** an FEC run is prepared
- **THEN** it does not require an accepted FE reference and is evidenced independently

### Requirement: Secret and credential handling

Credentials, certificates, PINs, tokens, signed XML, and raw responses SHALL NOT be committed. Evidence shared externally SHALL be redacted and limited to metadata, request IDs, and hashes.

#### Scenario: Redacted escalation evidence

- **WHEN** evidence is shared with an operator or reviewer
- **THEN** it excludes credentials, tokens, P12/PIN, issuer details, and signed XML unless an appropriate private channel is explicitly used

### Requirement: Production boundary

Real sandbox acceptance SHALL NOT enable production targets, trust pins, worker activation, or family enablement. Those remain separate gates requiring reviewed evidence.

#### Scenario: Sandbox acceptance does not activate production

- **WHEN** a family receives sandbox accepted status
- **THEN** production targets and trust configuration remain unchanged until independent review
