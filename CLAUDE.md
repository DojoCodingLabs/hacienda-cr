# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript SDK, CLI & MCP Server for Costa Rica Electronic Invoicing (Comprobantes Electrónicos) against the Ministerio de Hacienda API v4.4. Three-layer architecture: SDK (core library) → CLI (`hacienda` binary) → MCP Server (AI-accessible tools).

See `MASTER_PLAN.md` for full architecture, backlog, spikes (S-01 through S-06), and dependency graph.

## Commands

```bash
pnpm install                    # Install dependencies
pnpm build                      # Build all packages (turbo, respects dependency graph)
pnpm test                       # Run all tests
pnpm lint                       # Lint all packages
pnpm format                     # Check formatting (format:fix to auto-fix)
pnpm typecheck                  # Type-check all packages
pnpm clean                      # Remove all dist/ directories

# Single package
pnpm --filter @hacienda-cr/sdk build
pnpm --filter @hacienda-cr/sdk test
pnpm --filter @hacienda-cr/sdk test clave.spec.ts   # Single test file
```

**Build order matters:** Turbo handles this automatically — `shared` builds first, then `sdk`, then `cli`/`mcp`. Always run `pnpm build` before `pnpm test` on a fresh clone.

## Monorepo Structure

```
packages/
├── sdk/       # @hacienda-cr/sdk — Core: auth, XML, signing, API client, tax calc
├── cli/       # @hacienda-cr/cli — `hacienda` binary (citty framework)
└── mcp/       # @hacienda-cr/mcp — MCP Server (@modelcontextprotocol/sdk)
shared/        # @hacienda-cr/shared — Types, Zod schemas, constants, enums
```

**Dependency flow:** `shared` ← `sdk` ← `cli` / `mcp`. The SDK is the foundation — CLI and MCP wrap it.

## Architecture

### SDK modules (`packages/sdk/src/`)

| Module       | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `auth/`      | OAuth2 ROPC token management, .p12 credential loading          |
| `api/`       | Typed HTTP client wrapping Hacienda REST endpoints             |
| `clave/`     | 50-digit clave numérica builder and parser                     |
| `xml/`       | XML generation (fast-xml-parser), v4.4 XSD validation          |
| `signing/`   | XAdES-EPES digital signature with .p12 keys (xadesjs/xmldsigjs)|
| `documents/` | Builders for all 7 document types                              |
| `config/`    | Config file management (~/.hacienda-cr/config.toml), sequences |
| `tax/`       | Tax calculation: rounding, line items, IVA math                |
| `logging/`   | Structured logger with levels (DEBUG→SILENT), text/JSON output |

Each module uses barrel exports via `index.ts`. The SDK root `src/index.ts` re-exports 190+ symbols organized by domain.

### Shared package (`shared/src/`)

- `constants/` — Document types, tax codes, currencies, payment methods, ID types, provinces, sale conditions, environments, XAdES policy config
- `types/` — Type definitions for clave, API, documents, config
- `schemas/` — Zod schemas for validation (clave, factura, identification, emisor, etc.)

### CLI (`packages/cli/src/`)

Uses citty framework. Commands: `auth login|status|switch`, `submit`, `status`, `list`, `get`, `sign`, `validate`, `lookup`, `draft`. All commands support `--json` for machine-readable output.

### MCP Server (`packages/mcp/src/`)

Exposes SDK as MCP tools: `create_invoice`, `check_status`, `list_documents`, `get_document`, `lookup_taxpayer`, `draft_invoice`. Plus resources for schemas and reference data.

## Domain Context

### Hacienda API Environments

| Env        | API Base                                                   | IDP Realm  | Client ID  |
| ---------- | ---------------------------------------------------------- | ---------- | ---------- |
| Sandbox    | `api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/` | `rut-stag` | `api-stag` |
| Production | `api.comprobanteselectronicos.go.cr/recepcion/v1/`         | `rut`      | `api-prod` |

### Clave Numérica

50-digit key: `[506][DDMMYY][12-digit taxpayer ID][4-digit branch][4-digit POS][4-digit doc type][10-digit sequence][1-digit situation][8-digit security code]`.

### XAdES-EPES Signing

All XML signed with XAdES-EPES v1.3.2+ using taxpayer .p12 certificate (RSA 2048 + SHA-256). Policy hash (SHA-1): `Ohixl6upD6av8N7pEvDABhEL6hM=`.

### Credentials

Config: `~/.hacienda-cr/config.toml`. Secrets always via env vars (`HACIENDA_PASSWORD`, `HACIENDA_P12_PIN`, `HACIENDA_P12_PATH`), never in config files.

## Conventions

- **Files:** kebab-case (`token-manager.ts`)
- **Types/Classes:** PascalCase
- **Functions/Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- **Tests:** `*.spec.ts` colocated with source, integration tests use `*.integration.spec.ts`
- **Imports:** Use `type` keyword for type-only imports (`@typescript-eslint/consistent-type-imports` enforced)
- **Unused vars:** Prefix with `_` (ESLint allows `_`-prefixed unused vars)
- **Quotes:** Double quotes (Prettier enforced)
- **Validation:** Zod schemas for all public API inputs
- **XML:** fast-xml-parser for generation and parsing
- **Config format:** TOML for human-facing config (smol-toml)
- **Module format:** ESM only (`"type": "module"` everywhere), no CJS

## Build & Test Details

- **tsup** builds each package to ESM in `dist/`. CLI adds `#!/usr/bin/env node` banner. MCP bundles workspace deps but externalizes third-party.
- **Vitest** with globals enabled (no need to import `describe`/`it`/`expect`). V8 coverage provider.
- **TypeScript** targets ES2023, strict mode, `noUncheckedIndexedAccess: true`.
- **Turbo** caches build outputs (`dist/**`) and test coverage (`coverage/**`). Lint/typecheck depend on `^build`.

## Key Dependencies

| Package                    | Purpose                          |
| -------------------------- | -------------------------------- |
| `zod`                      | Runtime validation + type inference |
| `fast-xml-parser`          | XML generation and parsing       |
| `xadesjs` / `xmldsigjs`   | XAdES-EPES digital signing       |
| `node-forge`               | Cryptographic operations         |
| `@xmldom/xmldom`           | DOM implementation for XML       |
| `smol-toml`                | TOML config parsing              |
| `citty`                    | CLI framework (unjs)             |
| `@modelcontextprotocol/sdk`| MCP Server framework             |

## Implementation Notes

- Token lifecycle: access token ~5min (cache in memory, refresh 30s before expiry), refresh token ~10hrs (persist to disk)
- All XML must validate against vendored v4.4 XSD schemas before submission
- Critical path: monorepo setup → types/clave → XML builder (Factura) → signing → API submission → end-to-end test
- Spikes S-01 through S-06 in MASTER_PLAN.md must be resolved before their dependent milestones
