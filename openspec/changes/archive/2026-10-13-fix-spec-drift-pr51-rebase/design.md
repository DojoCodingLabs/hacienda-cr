# Design: fix-spec-drift-pr51-rebase

## Context

`feat/add-spec-drift-workflow` currently reads as `5dbefbe` (#50's pre-squash tip) ←
`3aa88de` (workflow + docs) ← `7d1ae03` (UTF-8-safe truncation). `origin/main` is now
`a8afe2e`, the squash merge of #50, so:

- `git merge-base origin/main feat/add-spec-drift-workflow` = `c82a07d` (#49).
- `git diff origin/main feat/add-spec-drift-workflow --stat` = 25 files / +2335/−23 —
  almost all of it #50's own content that main already has in reviewed form.
- `git cherry origin/main feat/add-spec-drift-workflow` marks **all six** branch
  commits as unapplied: the squash merge changed every patch-id, so git cannot tell
  that `fb8148d`, `3c805c9`, `6e2433b` and `5dbefbe` are already on main.
- The only content main genuinely lacks is in `3aa88de` and `7d1ae03`:
  `.github/workflows/spec-drift.yml` (+142), `docs/testing.md` (+19),
  `packages/sdk/schemas/README.md` (+14/−2).

Constraints: `.github/workflows/spec-drift.yml` is `schedule` + `workflow_dispatch`
only, so nothing runs until it lands on the default branch; `openspec/` is
gitignore-scoped (`.git/info/exclude`), so spec artifacts never travel in the PR.
Motivation is in `proposal.md` — Why.

## Goals / Non-Goals

**Goals:**

- PR #51 diff = the drift workflow plus the two documentation hunks it documents,
  with nothing from #50 in it.
- The UTF-8-safe truncation survives the history rewrite byte-for-byte.
- A repeatable verification that the rebuilt branch contains no #50 content and no
  unrelated churn (`docs/npm-downloads.json`).

**Non-Goals:**

- Merging #51, or making the workflow actually run in this repo.
- Phase 2 (a job that runs `spec:update`) and any change to `lastSyncedAt` semantics.
- Re-basing the branches stacked on top (#52/#53) — that happens after #51 merges.
- Re-reviewing #50's content; main's squashed version is authoritative.

## Decisions

**D1 — Rebuild from `origin/main` and cherry-pick two commits, instead of
`git rebase origin/main`.** The naive rebase replays six commits whose patch-ids no
longer match main, producing add/add conflicts on every file under
`scripts/spec-watch/`. Resolving those "as they come" risks silently reverting main's
review hardening (redirect/https checks, download caps) — exactly the class of silent
loss the previous rebase of this branch was rewritten to avoid. Rebuilding
(`git checkout -B <branch> origin/main` + cherry-pick) makes the result explicit and
verifiable. Alternative considered: `git rebase --onto origin/main 5dbefbe` — same
six-commit replay problem for the base commits below `5dbefbe`; rejected.

**D2 — Replay exactly `3aa88de` then `7d1ae03`, in that order.** `3aa88de` adds the
workflow and both doc hunks; `7d1ae03` patches the truncation branch of that same
file. Cherry-picking them out of order either conflicts or loses the fix. Verified
afterwards by asserting the workflow body still pipes through
`iconv -f UTF-8 -t UTF-8 -c`.

**D3 — Keep the `iconv -c` truncation, not a newline-boundary cut.** `head -c 61440 |
iconv -f UTF-8 -t UTF-8 -c` drops the incomplete trailing sequence, and `iconv`
exits 1 when it discards one, so the pipe is wrapped to tolerate that status — the
body file is fully written before the failure, and the truncation note plus
fingerprint marker are appended after. Alternative considered: truncating at the last
newline before the limit (`awk`/`perl`) — also correct, but adds a second parsing
tool to a shell step that currently needs only coreutils + iconv; rejected as more
code for the same observable outcome.

**D4 — The docs hunks stay in the PR.** The review phrased the target as "diff is
just `.github/workflows/spec-drift.yml`", but the `docs/testing.md` section (how to
dispatch the job manually, phase-2 boundary) and the `packages/sdk/schemas/README.md`
job note are part of `3aa88de` and are the only place those promises are written
down. Alternative considered: reverting the README/`testing.md` hunks to make the diff
workflow-only — rejected: it would leave main's README saying "semantics will change
when the scheduled job exists" while the job exists, which is the contradiction the
spec delta in `specs/spec-integrity/spec.md` resolves.

**D5 — Let `docs/npm-downloads.json` disappear via the rebuild, no manual revert.**
That 22-line diff is main's newer scheduled-regeneration output compared against the
branch's stale snapshot; rebuilding on `origin/main` restores main's version for free.
The task list asserts it is absent from the final diff rather than touching it.

**D6 — `--force-with-lease`, not `--force`.** The lease fails if someone else pushed
to the PR branch since the last fetch, which is the only guardrail while rewriting a
branch other agents may have checked out. Alternative considered: close #51 and open
a fresh PR — rejected: it discards the review thread that contains this change's
findings.

**D7 — One `MODIFIED` requirement in the delta, not an `ADDED` one.** No new behavior
is introduced; the `lastSyncedAt` documentation requirement is clarified so it stays
true once phase 1 exists. `ADDED` would have created a second, competing statement of
the same semantics.

**D8 — No Changeset.** Nothing published changes: the diff is a CI workflow plus
docs, and no workspace package's behavior or build output moves.

## Risks / Trade-offs

- [Rebuild drops the UTF-8 fix by cherry-picking in the wrong order] → replay order is
  fixed (D2) and the verification step greps the built branch for the `iconv` line.
- [A later `main` move re-conflicts the docs hunks] → `docs/testing.md` and the schemas
  README are exactly the files #50 touched; if #51 waits for another merge, re-run the
  cherry-picks rather than hand-merging.
- [Stacked branches (#52/#53) point at the old `feat/add-spec-drift-workflow` tip] →
  expected; they rebase after #51 merges. Doing it now would rewrite more PRs than
  this change owns.
- [`--force-with-lease` still rewrites history others may have checked out] → the
  lease plus a note in the PR is the accepted cost of fixing the base; collaborators
  re-fetch instead of merging.
- [The workflow's issue API calls can fail (token, rate limit, label)] → already
  handled in the workflow: every `gh` failure exits 2 and never prints "sin cambios"
  (requirement in the spec, unchanged here).
- [The spec delta touches a large requirement paragraph] → the delta copies the whole
  requirement block verbatim except the `lastSyncedAt` sentence and its scenario, so
  archive-time merge stays mechanical.

## Migration Plan

1. Rebuild the branch in a scratch ref from `origin/main`, cherry-pick `3aa88de` and
   `7d1ae03`, and verify the resulting diff is exactly the three files (workflow,
   `docs/testing.md`, `packages/sdk/schemas/README.md`) with the `iconv` truncation
   present.
2. `--force-with-lease` push to `feat/add-spec-drift-workflow`; PR #51 flips from
   conflicting to mergeable and CI re-runs on the new head.
3. Reconcile the local `spec-integrity` main spec from the delta in this change (the
   `openspec/` tree is local-only, so this is a documentation-of-record step, not a
   repo commit).
4. Rollback: `git reflog` on the old tip (`7d1ae03`) and
   `git push --force-with-lease origin 7d1ae03:feat/add-spec-drift-workflow` restores
   the previous state; nothing on `main` is touched at any point.

## Open Questions

- Whether the monthly run should notify through a channel more reliable than GitHub's
  per-user email (the docs already flag this as a known gap). Answering it would add a
  notification requirement, so it stays out of this change and out of the tasks.
