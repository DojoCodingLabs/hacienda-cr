# Proposal: fix-spec-drift-pr51-rebase

## Why

PR #51 (`ci: monthly spec-drift reporting workflow`) carries the whole drift-reporting
job, but its branch `feat/add-spec-drift-workflow` is still based on the pre-#50
history (`merge-base = c82a07d`), so its diff against `main` shows all of #50's files
(`scripts/spec-watch/*`, `package.json`, `manifest.json`…) instead of just the drift
workflow. The review's only blocker — "merge #50 first, then rebase" — is now clear
(`origin/main` = `a8afe2e`, `Feat/add spec watch commands (#50)`), and the review's
lower-confidence finding (`head -c 61440` can cut a multi-byte UTF-8 character in
half) is already fixed on the branch tip, but that fix has to survive the rebase
instead of being silently dropped.

## What Changes

- Rebuild `feat/add-spec-drift-workflow` on top of `origin/main` by replaying **only**
  the two commits main does not have (`3aa88de` — workflow + docs, `7d1ae03` —
  UTF-8-safe truncation). The four pre-squash #50 commits still on the branch are
  **not** replayed: main already contains their reviewed, squashed form, and replaying
  them produces add/add conflicts on `scripts/spec-watch/*`.
- Preserve the UTF-8-safe truncation of the issue body: cut at a valid character
  boundary with `head -c … | iconv -f UTF-8 -t UTF-8 -c`, tolerating `iconv`'s non-zero
  status under `set -euo pipefail`, and keep the explicit truncation note plus the
  fingerprint marker after the cut.
- Land the two documentation hunks that travel with the workflow: the
  "Scheduled drift job (phase 1)" section in `docs/testing.md` and the drift-job /
  `lastSyncedAt` notes in `packages/sdk/schemas/README.md`.
- Reconcile the `lastSyncedAt` wording in `packages/sdk/schemas/README.md` with the
  spec: the warning must be that semantics change when a job runs `spec:update`
  (phase 2), not "when the scheduled job exists" — phase 1 exists and only runs
  `spec:check`.
- Drop the unrelated `docs/npm-downloads.json` churn from the PR by rebuilding on
  `origin/main` (it disappears on its own; verify it is absent from the final diff).
- Force-push with `--force-with-lease` so PR #51 goes from conflicting to mergeable.

Out of scope: merging #51 itself, phase 2 (a job that runs `spec:update`), and the
branches stacked on this one (#52/#53) — they re-rebase after #51 merges.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `spec-integrity`: clarify the `lastSyncedAt` documentation requirement and its
  scenario so they describe phase 1 landing — the README keeps the "last `spec:update`
  run" semantics and warns that they change to "última ejecución del job" once a job
  **runs `spec:update`**, since the phase-1 job (check-only) exists by then. The
  requirements for the monthly workflow, issue reporting with fingerprint dedup and
  the UTF-8-safe truncation already exist in the spec from the archived
  `add-spec-drift-workflow` / `fix-spec-drift-workflow-rebase` changes and do not
  change here.

## Impact

- **CI**: one new workflow file, `.github/workflows/spec-drift.yml` (schedule +
  `workflow_dispatch`; `contents: read`, `issues: write`; no Hacienda credentials). It
  only starts running after #51 merges; manual runs go through
  `gh workflow run spec-drift.yml --ref <branch>`.
- **Docs**: `docs/testing.md` (+19), `packages/sdk/schemas/README.md` (+14/−2).
- **Git**: `feat/add-spec-drift-workflow` history rewritten and force-pushed; PR #51
  diff shrinks from 25 files to 3.
- **No** package/runtime code, `manifest.json`, vendored schema, or lockfile changes;
  no Changeset (CI + documentation only).
- **Local OpenSpec**: one `spec-integrity` requirement reconciliation; no new
  requirements.
