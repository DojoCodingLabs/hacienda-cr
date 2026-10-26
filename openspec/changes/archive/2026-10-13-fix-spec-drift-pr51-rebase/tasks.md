# Tasks: fix-spec-drift-pr51-rebase

## 1. Rebuild `feat/add-spec-drift-workflow` on top of `main`

- [x] 1.1 `git fetch origin main`, record the current branch tip (`7d1ae03`) as the
      rollback point, and confirm `origin/main` is `a8afe2e` (`Feat/add spec watch
commands (#50)`) so the review's blocker is really gone
- [x] 1.2 Create a scratch ref from `origin/main`
      (`git checkout -B fix/spec-drift-rebuild origin/main`) and cherry-pick `3aa88de`
      (`ci: add monthly spec-drift reporting workflow`) — resolve nothing by hand
      unless the pick conflicts, and if it does, re-anchor on main's current text
      rather than the branch's older context
- [x] 1.3 Cherry-pick `7d1ae03` (`fix(ci): truncate the drift issue body at a UTF-8
boundary`) on top, in that order, and confirm the pick is clean
- [x] 1.4 Verify the rebuilt branch is _only_ #50 plus these two commits:
      `git log --oneline origin/main..HEAD` shows exactly two commits, and
      `git diff origin/main HEAD --stat` lists exactly `.github/workflows/spec-drift.yml`,
      `docs/testing.md`, `packages/sdk/schemas/README.md` — nothing under
      `scripts/spec-watch/`, no `package.json`, no `manifest.json`, and in particular
      no `docs/npm-downloads.json`
- [x] 1.5 Confirm the rebuilt workflow still contains the UTF-8-safe cut
      (`head -c "$MAX_BYTES" "$REPORT" | iconv -f UTF-8 -t UTF-8 -c`), the truncation
      note, the `<!-- spec-drift-fingerprint: … -->` marker, `permissions:
contents: read / issues: write`, the `0 12 1 * *` cron plus `workflow_dispatch`,
      the 15-minute timeout, and the `exit 2` operational-failure path
- [x] 1.6 Lint the workflow file statically (`actionlint` if installed, otherwise a
      YAML parse) so a history rewrite is not the moment a syntax slip lands

## 2. Check the rebuilt head against the spec and the repo gate

- [x] 2.1 Walk the drift-job requirements in `openspec/specs/spec-integrity/spec.md`
      (monthly run, no credentials, issue with report, fingerprint dedup, no-mutation,
      operational failure never says "sin cambios", UTF-8 cut) and point each one at
      the workflow step that satisfies it; the only delta in this change is the
      `lastSyncedAt` wording
- [x] 2.2 Confirm the `lastSyncedAt` bullet that lands in
      `packages/sdk/schemas/README.md` says the semantics change when a job **runs
      `spec:update`** (phase 2), matching the delta in
      `specs/spec-integrity/spec.md` — no spec/README contradiction ships
- [x] 2.3 `pnpm install --frozen-lockfile && pnpm verify` on the rebuilt head (CI
      re-runs the same gate on the new PR head; failing it locally before the push
      saves a review round-trip)
- [x] 2.4 Confirm no workspace package version, lockfile or Changeset is needed: the
      diff is CI + docs only

## 3. Publish the rewritten branch

- [x] 3.1 Push the rebuilt branch with `--force-with-lease` to
      `feat/add-spec-drift-workflow`; let the lease fail rather than clobbering any
      push made since the last fetch
- [x] 3.2 Confirm PR #51 now reports mergeable with the three-file diff, and leave a
      comment that answers the review: #50 merged (`a8afe2e`), branch rebuilt from
      `main` with only the workflow + docs commits, `head -c` replaced by the
      UTF-8-safe cut, docs hunks kept on purpose (see D4 in design.md)
- [x] 3.3 Confirm `main` is untouched (`git log origin/main -1` still `a8afe2e`) and
      that no other branch or PR was rewritten — the stacked branches (#52/#53) keep
      their current base and rebase after #51 merges
