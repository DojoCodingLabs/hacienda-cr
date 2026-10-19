# Proposal: add-spec-drift-workflow

## Why

`spec:check` detects drift between the vendored v4.4 document set (XSD, PDFs and auxiliaries under `packages/sdk/schemas/`) and what Hacienda publishes, but only when someone remembers to run it. The main spec and README already promise that `lastSyncedAt` will gain "última ejecución del job" semantics once a scheduled job exists; without that job, drift can sit unnoticed until a release or an incident surfaces it (INDENT 5.4, 7 — fase 1).

## What Changes

- Add a monthly GitHub Actions workflow that runs `pnpm spec:check` on a schedule (plus manual dispatch).
- On detected drift (exit 1), the job opens a GitHub issue labeled `spec-drift` with the full `spec:check` report pasted in the body.
- If an open issue for the same drift already exists (same report fingerprint), the job comments the new report on that issue instead of opening a duplicate.
- The job never changes `currentSet`, never commits, never opens a PR, and never runs `spec:update` — reporting only.
- If the report channel fails (label, issue or comment via `gh`), the job fails with a clear error instead of going green — a failed report is "couldn't report", never "no drift".
- A declared surface that is unreachable fails the job: the job preserves the stderr of `spec:check` verbatim, and `spec:check`'s canary messages always name the surface; if **any** surface fails (canary short-circuit — see design D10), the job fails and never reports "sin cambios".

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `spec-integrity`: add requirements for the scheduled drift-detection job (monthly run, issue reporting with fingerprint dedup, no-mutation guarantees, unreachable-surface failure semantics).

## Impact

- New workflow file under `.github/workflows/` (e.g. `spec-drift.yml`); no runtime package code changes.
- GitHub repository settings: `GITHUB_TOKEN` with `issues: write`; the `spec-drift` label (auto-created if missing).
- Relies on the public Hacienda surfaces already declared in `packages/sdk/schemas/manifest.json`; no credentials required.
- Documentation: `docs/testing.md` / schemas README note that `lastSyncedAt` job semantics begin with this workflow (phase 1 of the INDENT job; phase 2 remains human-run `spec:update`).
