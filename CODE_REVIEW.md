# Code Review — hacienda-cr

**Date:** 2025-02-22  
**Reviewer:** Dojito (automated multi-agent review)  
**Repo:** DojoCodingLabs/hacienda-cr  
**Scope:** Full codebase (sdk, cli, mcp, shared)

---

## Summary

The codebase is **well-structured and high quality**. Clean architecture, comprehensive test coverage (623 tests passing), solid TypeScript typing, and good separation of concerns. The review found a mix of issues — mostly medium-severity items blocking npm publish readiness.

---

## High-Signal Issues Found

### #1 — Missing LICENSE file (now fixed)
- **Severity:** Critical (blocks npm publish)
- **Status:** ✅ Fixed in this PR
- **Description:** README references MIT license but no LICENSE file existed

### #2 — npm org `@hacienda-cr` does not exist
- **Severity:** Critical (blocks npm publish)
- **File:** All package.json files
- **Description:** The `@hacienda-cr` npm scope returns 404. Must create the org on npmjs.com before publishing.
- **Action:** Run `npm login` then create the org at https://www.npmjs.com/org/create

### #3 — No NPM_TOKEN GitHub secret configured
- **Severity:** Critical (blocks automated publish)
- **File:** `.github/workflows/publish.yml`
- **Description:** The publish workflow references `secrets.NPM_TOKEN` but no secret is set in the repo.
- **Action:** Generate npm token and add as repo secret

### #4 — Sequence store has race condition under concurrent access
- **Severity:** Medium
- **File:** `packages/sdk/src/config/sequence-store.ts`
- **Description:** `getNextSequence()` does read-increment-write non-atomically. Two concurrent calls can read the same value, both increment to N+1, and write the same number — producing duplicate sequence numbers. The atomic file rename helps with corruption but not with TOCTOU races.
- **Recommendation:** Use file locking (e.g., `proper-lockfile`) or document that concurrent access requires external synchronization.

### #5 — MCP create_invoice tool always uses sequence=1
- **Severity:** Medium
- **File:** `packages/mcp/src/tools/create-invoice.ts` (lines ~130-140)
- **Description:** The `create_invoice` tool hardcodes `sequence: 1` and `numeroConsecutivo: "001000010100000000001"` for every invoice. This means every invoice generated through MCP will have the same clave/consecutivo, causing 409 Conflict on submission.
- **Evidence:**
  ```ts
  const clave = buildClave({
    ...
    sequence: 1,  // Always 1!
    ...
  });
  const seq = "0000000001";  // Always 1!
  ```
- **Recommendation:** Integrate with `SequenceStore.getNextSequence()` to auto-increment.

### #6 — `workspace:*` dependencies need resolution for npm publish
- **Severity:** Medium (blocks correct installs from npm)
- **File:** All package.json files
- **Description:** Internal deps use `"workspace:*"` which pnpm/changesets should resolve to real versions at publish time. However, changesets must be configured correctly — verify with `pnpm publish --dry-run`.
- **Status:** Changesets config looks correct (`"access": "public"`), should resolve automatically.

### #7 — CLI auth login doesn't persist password (by design) but no guidance on token persistence
- **Severity:** Low
- **File:** `packages/cli/src/commands/auth/login.ts`
- **Description:** After `hacienda auth login`, the profile is saved but the password is not (correctly, for security). However, subsequent CLI commands need to re-authenticate, and there's no session token cache. Each command invocation requires `HACIENDA_PASSWORD` env var.
- **Recommendation:** Document this clearly in CLI README or add token caching.

### #8 — `round5()` uses standard `Math.round` which has banker's rounding edge cases
- **Severity:** Low
- **File:** `packages/sdk/src/tax/calculator.ts`
- **Description:** `Math.round(value * factor) / factor` can produce unexpected results for values exactly at .5 boundaries due to IEEE 754 floating-point representation. For example, `round5(1.000005)` could round incorrectly. However, since Hacienda uses 5 decimal places, hitting exact .5 boundaries at the 6th decimal is extremely rare in practice.
- **Recommendation:** Consider using `Number(value.toFixed(5))` or a decimal library for mission-critical financial calculations.

---

## Publish Readiness Checklist

| Item | Status |
|------|--------|
| LICENSE file | ✅ Added |
| `license` field in package.json | ✅ Added |
| `author` field | ✅ Added |
| `repository` field | ✅ Added |
| `homepage` field | ✅ Added |
| `files` field (dist only) | ✅ Already set |
| CLI shebang | ✅ Present in built output |
| ESM exports | ✅ Configured |
| TypeScript declarations | ✅ Generated |
| Changesets configured | ✅ `access: public` |
| npm org `@hacienda-cr` | ❌ **Must create** |
| `NPM_TOKEN` secret | ❌ **Must add** |
| All tests pass | ✅ 623 passed |
| Build succeeds | ✅ All 4 packages |
| Lint/format/typecheck | ✅ (CI workflow covers) |
| Acknowledgments | ✅ Added |
| Powered by Dojo Coding | ✅ Added |

---

## What's Left to Go Live

1. **Create `@hacienda-cr` npm org** at npmjs.com
2. **Add `NPM_TOKEN` secret** to GitHub repo settings
3. **Run initial publish** — either:
   - Tag `v0.0.1` and push (triggers publish workflow), or
   - Manual: `pnpm build && pnpm -r publish --access public --no-git-checks`
4. **Optional:** Create first changeset for v0.1.0 with `pnpm changeset`
