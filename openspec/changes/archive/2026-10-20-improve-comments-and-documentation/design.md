## Context

Repo is four ESM TypeScript packages with dependency direction `shared → SDK → {CLI, MCP}`, plus CLI and MCP import shared directly. Public surface lives in `shared/` (types, Zod schemas, constants, enums), `packages/sdk/` (auth, tax calc, clave, XML, signing, config, Hacienda HTTP API), `packages/cli/` (the `hacienda` command), `packages/mcp/` (SDK tools/resources over MCP stdio). Docstrings and rationale comments are inconsistent or missing on public functions, schemas, XML builders, and adapter inputs; non-obvious boundaries (exact-FE ordinary IVA13/full-payment case, credit-term 1–5 digit validation, read-only retained-schema boundary, strict pre-auth filters) live only in `docs/` and commit messages. CI gate `pnpm verify` runs formatting, lint, types, builds, offline tests, script regressions, and installed-package checks; requires native `xmllint`, disables live credential tests.

See `proposal.md` for motivation — not restated here.

## Goals / Non-Goals

**Goals:**

- Consistent, discoverable docstrings on public functions, Zod schemas, XML builders, constants, and adapter inputs across `shared/`, `packages/sdk/`, `packages/cli/`, `packages/mcp/`.
- Inline rationale comments at non-obvious behavioral boundaries so the _why_ travels with the code.
- Documentation files (`README.md`, `AGENTS.md`, package `AGENTS.md`, `docs/*`) consistent with code and easy to find.
- Change passes the formatting and lint portions of `pnpm verify`; no behavior change.

**Non-Goals:**

- No runtime behavior, public API, XSD conformance, signature logic, or dependency changes.
- No new capabilities; no spec-level requirement changes (hence `skip_specs: true`).
- No line-by-line implementation spec or per-file comment inventory.

## Decisions

**1. Scope docstrings to public exports + non-obvious boundaries, not every private helper.**

- Rationale: keeps effort bounded and preserves signal-to-noise; documenting every private helper adds noise for little review value.
- Alternative considered: document all functions. Rejected — too broad, low value, high churn.

**2. Use JSDoc-style comments consistent with existing colocated code.**

- Rationale: matches repo conventions (strict TypeScript, ESM, `.js` relative imports, type-only imports) and requires no new tooling.
- Alternative considered: introduce a doc-generation pipeline. Rejected — adds dependency/build complexity for a docs-only change.

**3. Consolidate guidance into existing docs files; no new documentation site.**

- Rationale: single source of truth, avoids fragmentation across `docs/`, `README.md`, and `AGENTS.md` files.
- Alternative considered: new dedicated docs site. Rejected — fragmentation, extra maintenance.

**4. `skip_specs: true` in `.openspec.yaml`.**

- Rationale: pure documentation/comments change introduces no spec-level behavior; spec-driven requires at least one capability or an explicit opt-out. Do not invent a requirement just to satisfy validation.

## Risks / Trade-offs

- [Risk] Docstrings drift from code over time → Mitigation: keep comments co-located and concise; review as part of PR.
- [Risk] Over-commenting obscures the code → Mitigation: document rationale and non-obvious boundaries only; do not restate obvious code.
- [Risk] Inconsistent comment style across packages → Mitigation: follow colocated conventions; let `pnpm verify` lint catch formatting issues.

## Migration Plan

No runtime migration (no behavior change). Apply through the normal PR/reflow workflow; verify the changed files pass `pnpm verify` formatting and lint before merge. Rollback is trivial: revert the documentation/comments commit.

## Open Questions

- Whether to add an ESLint rule enforcing docstrings on public exports (deferrable; does not change the specs, approach, or task breakdown — can be decided in a follow-up).
