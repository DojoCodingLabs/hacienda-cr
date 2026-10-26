## Why

The `hacienda-cr` repo has grown across `shared/` and four ESM TypeScript packages (SDK, CLI, MCP) plus dependency direction `shared → SDK → {CLI, MCP}`. Public functions, Zod input schemas, XML builders, constants, and adapter inputs carry inconsistent or missing docstrings and rationale comments. Non-obvious boundaries (exact-FE ordinary IVA13/full-payment case, credit-term 1–5 digit validation, read-only retained-schema boundary, strict pre-auth filters) live only in `docs/` and commit messages, so onboarding and review are slower and regressions risk slipping past CI gates (formatting, lint, types, builds, offline tests).

## What Changes

- Add/repair docstrings on public functions, schemas, and constants across `shared/`, `packages/sdk/`, `packages/cli/`, `packages/mcp/`.
- Add inline rationale comments at non-obvious behavioral boundaries (credit terms, exact-FE ordinary case, retained schema, pre-auth filters).
- Consolidate documentation so behavior contracts (`README.md`, `AGENTS.md`, package `AGENTS.md`, `docs/*`) are easy to find and consistent with the code.
- No runtime behavior, API surface, XSD conformance, signature logic, or dependency changes.

## Capabilities

### New Capabilities

- (none — this is a pure documentation/comments change; no spec-level behavior is introduced)

### Modified Capabilities

- (none — no spec-level requirement changes; behavior is intentionally unchanged)

## Impact

- Affected: source files with public exports in `shared/`, `packages/sdk/`, `packages/cli/`, `packages/mcp/`; documentation files `README.md`, `AGENTS.md`, `packages/*/AGENTS.md`, `docs/*`.
- No public API, dependency, or system changes. Because behavior does not change, no spec files are needed; the change opts out of specs via `skip_specs: true` in `.openspec.yaml`.
