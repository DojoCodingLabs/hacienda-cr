## 1. Docstrings on public surface

- [x] 1.1 Add/repair docstrings on public exports in `shared/` (types, Zod schemas, constants, enums)
- [x] 1.2 Add/repair docstrings on public exports in `packages/sdk/` (auth, tax calculation, clave, XML, signing, config, Hacienda HTTP API)
- [x] 1.3 Add/repair docstrings on public exports in `packages/cli/` (`hacienda` command)
- [x] 1.4 Add/repair docstrings on public exports in `packages/mcp/` (SDK tools and resources over MCP stdio)

## 2. Inline rationale comments at behavioral boundaries

- [x] 2.1 Credit-term validation boundary (positive 1–5 digit days for 02/10 and any present term)
- [x] 2.2 Exact-FE ordinary IVA13/full-payment case boundary
- [x] 2.3 Read-only retained-schema/calculator boundary
- [x] 2.4 Strict pre-auth filter validation

## 3. Documentation consolidation

- [x] 3.1 Align `README.md` with code behavior contracts
- [x] 3.2 Align root `AGENTS.md` and package `AGENTS.md` files
- [x] 3.3 Review `docs/*` (history contract, credit-term contract, security boundaries) for consistency with code

## 4. Verification

- [x] 4.1 Run `pnpm verify` formatting and lint on changed files
- [x] 4.2 Confirm no runtime behavior, public API, XSD conformance, or signature logic changes were introduced
