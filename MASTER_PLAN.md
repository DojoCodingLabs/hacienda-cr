# 🇨🇷 Hacienda CR — Master Plan

> TypeScript SDK, CLI & MCP Server for Costa Rica Electronic Invoicing (Comprobantes Electrónicos)

**Repo:** `DojoCodingLabs/hacienda-cr`
**Created:** 2025-07-27
**Status:** Planning

---

## Vision

A modular, open-source TypeScript stack for interacting with Costa Rica's Ministerio de Hacienda electronic invoicing API. Three layers, cleanly separated:

```
┌──────────────────────────────────┐
│  MCP Server                      │  AI agents create/query invoices
│  (wraps CLI programmatically)    │
├──────────────────────────────────┤
│  CLI (`hacienda`)                │  Human-friendly terminal interface
│  (wraps SDK)                     │
├──────────────────────────────────┤
│  SDK (`@hacienda-cr/sdk`)        │  Core library — auth, XML, signing, API
│  (wraps Hacienda REST API)       │
├──────────────────────────────────┤
│  Hacienda REST API (v4.4)        │  Government system
│  comprobanteselectronicos.go.cr  │
└──────────────────────────────────┘
```

**End goal:** Power a custom quotation system, accounting, CRM, and business operations — all built on top of this foundation.

---

## Architecture

### Monorepo Structure

```
hacienda-cr/
├── packages/
│   ├── sdk/                        # @hacienda-cr/sdk
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── token-manager.ts    # OAuth2 ROPC, auto-refresh, token cache
│   │   │   │   └── credentials.ts      # Username format builder, .p12 loader
│   │   │   ├── api/
│   │   │   │   ├── client.ts           # HTTP client (fetch-based, typed)
│   │   │   │   ├── recepcion.ts        # POST /recepcion, GET /recepcion/{clave}
│   │   │   │   ├── comprobantes.ts     # GET /comprobantes, GET /comprobantes/{clave}
│   │   │   │   └── supplementary.ts    # Economic activity lookup, exonerations
│   │   │   ├── clave/
│   │   │   │   ├── builder.ts          # 50-digit clave numérica generator
│   │   │   │   └── parser.ts           # Decode existing claves
│   │   │   ├── xml/
│   │   │   │   ├── builder.ts          # TS objects → XML (v4.4 compliant)
│   │   │   │   ├── schemas/            # v4.4 XSD files (vendored)
│   │   │   │   ├── validator.ts        # Validate against XSD before submission
│   │   │   │   └── types.ts            # TypeScript types mirroring XSD structures
│   │   │   ├── signing/
│   │   │   │   ├── xades.ts            # XAdES-EPES wrapper
│   │   │   │   └── p12.ts             # PKCS#12 key loading & management
│   │   │   ├── documents/
│   │   │   │   ├── factura.ts          # Factura Electrónica
│   │   │   │   ├── tiquete.ts          # Tiquete Electrónico
│   │   │   │   ├── nota-credito.ts     # Nota de Crédito Electrónica
│   │   │   │   ├── nota-debito.ts      # Nota de Débito Electrónica
│   │   │   │   ├── factura-compra.ts   # Factura Electrónica de Compra
│   │   │   │   ├── factura-exportacion.ts  # Factura de Exportación
│   │   │   │   └── recibo-pago.ts      # Recibo Electrónico de Pago (new in v4.4)
│   │   │   ├── config.ts              # Environment config (sandbox/prod)
│   │   │   └── index.ts               # Public API surface
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── cli/                        # @hacienda-cr/cli → `hacienda` binary
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login.ts        # Interactive credential setup
│   │   │   │   │   ├── status.ts       # Show token state, env, identity
│   │   │   │   │   └── switch.ts       # Toggle sandbox ↔ production
│   │   │   │   ├── submit.ts           # Submit invoice from JSON/YAML file
│   │   │   │   ├── status.ts           # Check clave status (with polling mode)
│   │   │   │   ├── list.ts             # List comprobantes (table output)
│   │   │   │   ├── get.ts              # Full comprobante details
│   │   │   │   ├── lookup.ts           # Economic activity / exoneration queries
│   │   │   │   ├── sign.ts             # Sign XML standalone (pipe-friendly)
│   │   │   │   ├── validate.ts         # Validate XML against XSD (dry run)
│   │   │   │   └── draft.ts            # Create invoice JSON from prompts
│   │   │   ├── output/
│   │   │   │   ├── table.ts            # Table formatter
│   │   │   │   └── json.ts             # JSON output mode
│   │   │   ├── config.ts              # ~/.hacienda-cr/ management
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── mcp/                        # @hacienda-cr/mcp
│       ├── src/
│       │   ├── tools/
│       │   │   ├── create-invoice.ts       # Build + sign + submit
│       │   │   ├── create-credit-note.ts   # Reference existing, submit NC
│       │   │   ├── create-debit-note.ts    # Reference existing, submit ND
│       │   │   ├── check-status.ts         # Poll submission status
│       │   │   ├── list-invoices.ts        # Query comprobantes
│       │   │   ├── get-invoice.ts          # Full details + Hacienda response
│       │   │   ├── lookup-activity.ts      # Economic activity query
│       │   │   ├── lookup-exoneration.ts   # Exoneration query
│       │   │   └── create-draft.ts         # Build invoice JSON without submitting
│       │   ├── resources/
│       │   │   ├── invoice-schema.ts       # Expose Zod schema as MCP resource
│       │   │   └── document-types.ts       # Reference for 7 document types
│       │   └── server.ts
│       └── package.json
│
├── shared/                         # Shared types & constants
│   ├── src/
│   │   ├── types/
│   │   │   ├── documents.ts        # All document type interfaces
│   │   │   ├── api.ts              # API request/response types
│   │   │   ├── clave.ts            # Clave components
│   │   │   └── config.ts           # Shared config types
│   │   ├── constants/
│   │   │   ├── environments.ts     # URLs, client IDs, realms
│   │   │   ├── document-types.ts   # Type codes, names
│   │   │   ├── tax-codes.ts        # IVA rates, exemption codes
│   │   │   └── activity-codes.ts   # CIIU 4 codes (v4.4 requirement)
│   │   └── index.ts
│   └── package.json
│
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── MASTER_PLAN.md
└── README.md
```

### Technology Stack

| Component         | Choice                               | Rationale                                         |
| ----------------- | ------------------------------------ | ------------------------------------------------- |
| Runtime           | Node.js 22+                          | LTS, native fetch, good crypto support            |
| Package manager   | pnpm + turborepo                     | Monorepo with shared types, parallel builds       |
| CLI framework     | `citty` (unjs)                       | Lightweight, TS-native, subcommand support        |
| XML generation    | `fast-xml-parser`                    | Proven, fast, bidirectional (parse + build)       |
| XAdES signing     | `haciendacostarica-signer` (or fork) | Battle-tested in CR ecosystem — **spike needed**  |
| XML validation    | `libxmljs2` or custom                | Validate against v4.4 XSDs before submission      |
| HTTP client       | Native `fetch` + thin wrapper        | No deps, typed responses                          |
| Schema validation | `zod`                                | Runtime validation, type inference, great DX      |
| MCP framework     | `@modelcontextprotocol/sdk`          | Official MCP SDK                                  |
| Config storage    | `~/.hacienda-cr/config.toml`         | TOML for human readability, `.p12` path reference |
| Testing           | `vitest`                             | Fast, native TS, monorepo-friendly                |
| Build             | `tsup`                               | Zero-config TS bundler                            |

---

## API Reference (Hacienda)

### Environments

| Env            | API Base                                                           | IDP Token URL                                                                                   | Client ID  |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------- |
| **Sandbox**    | `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/` | `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token` | `api-stag` |
| **Production** | `https://api.comprobanteselectronicos.go.cr/recepcion/v1/`         | `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token`      | `api-prod` |

### Endpoints

| Method | Path                    | Purpose                                   |
| ------ | ----------------------- | ----------------------------------------- |
| `POST` | `/recepcion`            | Submit invoice or receiver message        |
| `GET`  | `/recepcion/{clave}`    | Check submission status                   |
| `GET`  | `/comprobantes`         | List comprobantes (paginated, filterable) |
| `GET`  | `/comprobantes/{clave}` | Full document details + response XML      |

### Supplementary APIs

| Method | URL                                                        | Purpose                  |
| ------ | ---------------------------------------------------------- | ------------------------ |
| `GET`  | `https://api.hacienda.go.cr/fe/ae?identificacion={cedula}` | Economic activity lookup |
| `GET`  | _(TBD)_                                                    | Exoneration query        |

### Authentication Flow

```
POST {IDP_TOKEN_URL}
Content-Type: application/x-www-form-urlencoded

grant_type=password
&client_id={api-stag|api-prod}
&username=cpj-{type}-{number}@comprobanteselectronicos.go.cr
&password={auto-generated-password}

→ { access_token (JWT, ~5min), refresh_token (~10hrs), ... }
```

### Submission Payload

```json
{
  "clave": "50601072500012345678001000000010000000001199999999",
  "fecha": "2025-07-27T10:30:00-06:00",
  "emisor": {
    "tipoIdentificacion": "02",
    "numeroIdentificacion": "3101234567"
  },
  "receptor": {
    "tipoIdentificacion": "01",
    "numeroIdentificacion": "123456789"
  },
  "comprobanteXml": "<base64-encoded-signed-xml>",
  "callbackUrl": "https://optional-webhook.example.com/hacienda"
}
```

### Status Responses

| Status       | Meaning                         |
| ------------ | ------------------------------- |
| `recibido`   | Received, queued for processing |
| `procesando` | Currently being validated       |
| `aceptado`   | Accepted by Hacienda ✅         |
| `rechazado`  | Rejected (with reason) ❌       |
| `error`      | System error                    |

### 50-Digit Clave Numérica Structure

```
[506][DDMMYY][TTNNNNNNNNNNNN][CCCC][SSSS][TTTT][NNNNNNNNNN][S][CCCCCCCC]
 │     │         │              │     │     │       │        │     │
 │     │         │              │     │     │       │        │     └─ 8-digit security code
 │     │         │              │     │     │       │        └─ Situation (1=normal, 2=contingency, 3=no internet)
 │     │         │              │     │     │       └─ 10-digit sequence number
 │     │         │              │     │     └─ Document type code
 │     │         │              │     └─ Point of sale (4 digits)
 │     │         │              └─ Branch/sucursal (4 digits)
 │     │         └─ Taxpayer ID padded to 12 digits
 │     └─ Emission date DDMMYY
 └─ Country code (506 = Costa Rica)
```

### XAdES-EPES Signing Requirements

- **Standard:** XAdES-EPES v1.3.2+
- **Signature type:** Enveloped (embedded in XML)
- **Key format:** PKCS#12 (.p12), RSA 2048 + SHA-256
- **Canonicalization:** C14n-20010315
- **Policy identifier:** `https://tribunet.hacienda.go.cr/docs/esquemas/2016/v4.1/Resolucion_Comprobantes_Electronicos_DGT-R-48-2016.pdf`
- **Policy hash (SHA-1):** `Ohixl6upD6av8N7pEvDABhEL6hM=`

---

## Milestones

### 🏁 M0 — Project Bootstrap

> Foundation: repo structure, tooling, CI

### 🔐 M1 — Auth & Config

> OAuth2 token management, environment switching, credential storage

### 🔑 M2 — Clave & Core Types

> 50-digit key generation, shared types, constants

### 📝 M3 — XML Generation (Factura Electrónica)

> Build valid v4.4 XML from TypeScript objects — single document type

### ✍️ M4 — XAdES-EPES Signing

> Digital signature pipeline with .p12 keys

### 🚀 M5 — API Client & Submission

> Submit signed invoices, poll status, retrieve responses

### 💻 M6 — CLI v1

> Human-friendly CLI wrapping the SDK

### 🤖 M7 — MCP Server v1

> AI-accessible tools wrapping the CLI/SDK

### 📄 M8 — All Document Types

> Expand beyond Factura to all 7 document types

### 🏢 M9 — Production Readiness

> Hardening, error handling, logging, docs

---

## Backlog

### 🔬 Spikes (Research / De-risking)

| ID       | Title                                 | Description                                                                                                                             | Milestone | Estimate | Dependencies |
| -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | ------------ |
| **S-01** | **Audit `haciendacostarica-signer`**  | Evaluate npm package: v4.4 support, policy hash compatibility, API surface, maintenance status. Determine if we wrap, fork, or rewrite. | M0        | 2h       | —            |
| **S-02** | **Audit `facturar-costa-rica-lib`**   | Evaluate npm package (v2.0.11-alpha): XML generation quality, type coverage, v4.4 support. Determine what we can reuse.                 | M0        | 2h       | —            |
| **S-03** | **XSD → TypeScript type generation**  | Evaluate tools (`xsd2ts`, `cxsd`, manual Zod) for generating TS types from Hacienda's v4.4 XSD schemas. Pick approach.                  | M0        | 3h       | —            |
| **S-04** | **Sandbox credential setup**          | Register on ATV portal, generate sandbox credentials, obtain test .p12 file. Document the full process.                                 | M0        | 2h       | —            |
| **S-05** | **XML validation strategy**           | Evaluate `libxmljs2` vs `xmllint` subprocess vs runtime Zod validation for pre-submission XSD validation.                               | M2        | 2h       | S-03         |
| **S-06** | **Hacienda v4.4 changelog deep-dive** | Map all 146 changes from v4.3→v4.4, identify breaking changes, new required fields, CIIU 4 code implications.                           | M2        | 3h       | —            |

### 🏁 M0 — Project Bootstrap

| ID        | Title                       | Description                                                                                  | Estimate | Dependencies |
| --------- | --------------------------- | -------------------------------------------------------------------------------------------- | -------- | ------------ |
| **M0-01** | **Initialize monorepo**     | pnpm workspace, turbo.json, tsconfig.base.json, .gitignore, .env.example                     | 1h       | —            |
| **M0-02** | **Package scaffolding**     | Create `packages/sdk`, `packages/cli`, `packages/mcp`, `shared/` with package.json, tsconfig | 1h       | M0-01        |
| **M0-03** | **Build & test setup**      | Configure tsup (build), vitest (test), turbo pipelines                                       | 1h       | M0-02        |
| **M0-04** | **CI pipeline**             | GitHub Actions: lint, typecheck, test on push/PR                                             | 1h       | M0-03        |
| **M0-05** | **Vendor v4.4 XSD schemas** | Download all XSD files from ATV portal, commit to `packages/sdk/src/xml/schemas/`            | 30m      | —            |
| **M0-06** | **Lint & format**           | ESLint + Prettier config, shared across packages                                             | 30m      | M0-01        |

### 🔐 M1 — Auth & Config

| ID        | Title                         | Description                                                                                       | Estimate | Dependencies |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------- | -------- | ------------ |
| **M1-01** | **Environment config module** | Type-safe config for sandbox/prod: URLs, client IDs, realms. Env var + config file support.       | 2h       | M0-02        |
| **M1-02** | **OAuth2 token manager**      | ROPC grant implementation, JWT parsing, auto-refresh before expiry, token caching (memory + disk) | 4h       | M1-01        |
| **M1-03** | **Credential builder**        | Username format construction (`cpj-{type}-{number}@...`), .p12 file path resolution               | 1h       | M1-01        |
| **M1-04** | **Config file management**    | Read/write `~/.hacienda-cr/config.toml`, secure credential storage, environment switching         | 2h       | M1-01        |
| **M1-05** | **Auth integration tests**    | Test against sandbox IDP: token acquisition, refresh, expiry handling                             | 2h       | M1-02, S-04  |

### 🔑 M2 — Clave & Core Types

| ID        | Title                       | Description                                                                                                  | Estimate | Dependencies |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------ |
| **M2-01** | **Shared TypeScript types** | Document types, API request/response interfaces, config types, enums for all codes                           | 4h       | M0-02, S-03  |
| **M2-02** | **Constants module**        | Environment URLs, document type codes, tax rates (IVA), identification types, CIIU 4 codes                   | 2h       | M0-02, S-06  |
| **M2-03** | **Clave numérica builder**  | Generate valid 50-digit keys: date encoding, taxpayer padding, sequence management, security code generation | 3h       | M2-01        |
| **M2-04** | **Clave numérica parser**   | Decode existing claves into structured components                                                            | 1h       | M2-01        |
| **M2-05** | **Zod validation schemas**  | Runtime validation for all document input types, mirroring XSD constraints                                   | 4h       | M2-01        |
| **M2-06** | **Clave unit tests**        | Full coverage: generation, parsing, edge cases, invalid inputs                                               | 2h       | M2-03, M2-04 |

### 📝 M3 — XML Generation (Factura Electrónica)

| ID        | Title                                 | Description                                                                                               | Estimate | Dependencies |
| --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| **M3-01** | **XML builder core**                  | `fast-xml-parser` configuration, namespace handling, v4.4 structure                                       | 3h       | M2-01        |
| **M3-02** | **Factura Electrónica builder**       | Full v4.4 Factura XML generation from typed TS input: header, emisor, receptor, line items, totals, taxes | 6h       | M3-01, M2-02 |
| **M3-03** | **XML namespace & schema references** | Correct xmlns declarations, schemaLocation for v4.4                                                       | 1h       | M3-01        |
| **M3-04** | **Tax calculation engine**            | IVA computation, exemptions, discounts, rounding rules per Hacienda spec                                  | 4h       | M2-02        |
| **M3-05** | **XML validation against XSD**        | Pre-submission validation using chosen strategy (from S-05)                                               | 3h       | M3-02, S-05  |
| **M3-06** | **XML builder unit tests**            | Compare generated XML against known-good samples, XSD validation                                          | 3h       | M3-02, M3-05 |
| **M3-07** | **Sample invoice fixtures**           | Create 5+ test fixtures covering: simple sale, multi-line, exempt items, multi-tax, foreign currency      | 2h       | M3-02        |

### ✍️ M4 — XAdES-EPES Signing

| ID        | Title                                | Description                                                         | Estimate | Dependencies |
| --------- | ------------------------------------ | ------------------------------------------------------------------- | -------- | ------------ |
| **M4-01** | **Signing module wrapper**           | Wrap chosen signing lib (from S-01), typed API, .p12 loading        | 4h       | S-01, M3-02  |
| **M4-02** | **Policy configuration**             | Hardcode policy URI, SHA-1 hash, canonicalization method            | 1h       | M4-01        |
| **M4-03** | **Sign → Base64 pipeline**           | Complete flow: XML input → signed XML → Base64 string ready for API | 2h       | M4-01        |
| **M4-04** | **Signing integration tests**        | Sign test XMLs with test .p12, verify signature validity            | 3h       | M4-03, S-04  |
| **M4-05** | **Firma Digital support (optional)** | Support BCCR smart card certificates as alternative to .p12         | 4h       | M4-01        |

### 🚀 M5 — API Client & Submission

| ID        | Title                                | Description                                                                        | Estimate | Dependencies       |
| --------- | ------------------------------------ | ---------------------------------------------------------------------------------- | -------- | ------------------ |
| **M5-01** | **HTTP client base**                 | Typed fetch wrapper with auth header injection, error handling, retries            | 3h       | M1-02              |
| **M5-02** | **POST /recepcion**                  | Submit signed invoice, parse 201 response + Location header                        | 2h       | M5-01, M4-03       |
| **M5-03** | **GET /recepcion/{clave}**           | Status polling with configurable interval, timeout, status transitions             | 2h       | M5-01              |
| **M5-04** | **GET /comprobantes**                | List with pagination, date filters, type filters                                   | 2h       | M5-01              |
| **M5-05** | **GET /comprobantes/{clave}**        | Full details retrieval, response XML decoding                                      | 1h       | M5-01              |
| **M5-06** | **Supplementary: activity lookup**   | `GET /fe/ae?identificacion={cedula}`                                               | 1h       | M5-01              |
| **M5-07** | **Supplementary: exoneration query** | Exoneration API integration                                                        | 1h       | M5-01              |
| **M5-08** | **Callback URL handler (optional)**  | Simple HTTP server for receiving Hacienda async notifications                      | 3h       | M5-02              |
| **M5-09** | **End-to-end submission test**       | Full pipeline: build → sign → submit → poll → accepted (sandbox)                   | 3h       | M5-02, M5-03, S-04 |
| **M5-10** | **Submit + poll orchestrator**       | High-level `submitAndWait()` that combines submit + polling + returns final status | 2h       | M5-02, M5-03       |

### 💻 M6 — CLI v1

| ID        | Title                              | Description                                                                                       | Estimate | Dependencies |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- | -------- | ------------ |
| **M6-01** | **CLI scaffold with citty**        | Main entry point, subcommand structure, global flags (--env, --json, --verbose)                   | 2h       | M0-02        |
| **M6-02** | **`hacienda auth login`**          | Interactive credential setup: prompt for cedula type/number, password, .p12 path. Save to config. | 3h       | M1-04        |
| **M6-03** | **`hacienda auth status`**         | Show current env, token validity, identity, .p12 status                                           | 1h       | M1-02, M1-04 |
| **M6-04** | **`hacienda auth switch`**         | Toggle sandbox ↔ production with confirmation prompt                                              | 1h       | M1-04        |
| **M6-05** | **`hacienda submit`**              | Submit invoice from JSON/YAML file, show progress, return clave + status                          | 3h       | M5-10, M6-01 |
| **M6-06** | **`hacienda status <clave>`**      | Check status, optional `--poll` flag for continuous polling                                       | 2h       | M5-03, M6-01 |
| **M6-07** | **`hacienda list`**                | List comprobantes with table output, filters (--from, --to, --type), pagination                   | 2h       | M5-04, M6-01 |
| **M6-08** | **`hacienda get <clave>`**         | Full details display, option to save response XML                                                 | 1h       | M5-05, M6-01 |
| **M6-09** | **`hacienda lookup <cedula>`**     | Economic activity lookup, formatted output                                                        | 1h       | M5-06, M6-01 |
| **M6-10** | **`hacienda sign <xml-file>`**     | Standalone signing, pipe-friendly (stdin/stdout)                                                  | 1h       | M4-03, M6-01 |
| **M6-11** | **`hacienda validate <xml-file>`** | Dry-run XSD validation without submission                                                         | 1h       | M3-05, M6-01 |
| **M6-12** | **`hacienda draft`**               | Interactive invoice builder: prompts for emisor, receptor, items → outputs JSON                   | 4h       | M2-05, M6-01 |
| **M6-13** | **Output formatting**              | Table renderer (for terminals) + JSON mode (for piping/scripting)                                 | 2h       | M6-01        |

### 🤖 M7 — MCP Server v1

| ID        | Title                          | Description                                                           | Estimate | Dependencies |
| --------- | ------------------------------ | --------------------------------------------------------------------- | -------- | ------------ |
| **M7-01** | **MCP server scaffold**        | `@modelcontextprotocol/sdk` setup, stdio transport, tool registration | 2h       | M0-02        |
| **M7-02** | **Tool: `create_invoice`**     | Build + sign + submit from structured input, return clave + status    | 3h       | M5-10, M7-01 |
| **M7-03** | **Tool: `check_status`**       | Poll status by clave                                                  | 1h       | M5-03, M7-01 |
| **M7-04** | **Tool: `list_invoices`**      | Query comprobantes with filters                                       | 1h       | M5-04, M7-01 |
| **M7-05** | **Tool: `get_invoice`**        | Full details + Hacienda response                                      | 1h       | M5-05, M7-01 |
| **M7-06** | **Tool: `create_credit_note`** | Reference existing invoice, build + submit NC                         | 2h       | M5-10, M7-01 |
| **M7-07** | **Tool: `create_debit_note`**  | Reference existing invoice, build + submit ND                         | 1h       | M7-06        |
| **M7-08** | **Tool: `lookup_activity`**    | Economic activity query                                               | 30m      | M5-06, M7-01 |
| **M7-09** | **Tool: `lookup_exoneration`** | Exoneration query                                                     | 30m      | M5-07, M7-01 |
| **M7-10** | **Tool: `create_draft`**       | Build + validate without submitting (dry run)                         | 1h       | M3-05, M7-01 |
| **M7-11** | **Resource: invoice schema**   | Expose Zod schema as MCP resource for AI context                      | 1h       | M2-05, M7-01 |
| **M7-12** | **Resource: document types**   | Reference resource listing all 7 types with codes and descriptions    | 30m      | M2-02, M7-01 |

### 📄 M8 — All Document Types

| ID        | Title                                   | Description                                         | Estimate | Dependencies      |
| --------- | --------------------------------------- | --------------------------------------------------- | -------- | ----------------- |
| **M8-01** | **Tiquete Electrónico builder**         | Simplified invoice (no receptor required)           | 3h       | M3-02             |
| **M8-02** | **Nota de Crédito builder**             | References existing invoice, partial/full reversal  | 3h       | M3-02             |
| **M8-03** | **Nota de Débito builder**              | Adjustments to existing invoices                    | 2h       | M3-02             |
| **M8-04** | **Factura de Compra builder**           | Purchase invoice from unregistered supplier         | 3h       | M3-02             |
| **M8-05** | **Factura de Exportación builder**      | Export invoice with foreign receptor, special codes | 3h       | M3-02             |
| **M8-06** | **Recibo Electrónico de Pago**          | New in v4.4, payment receipt document               | 3h       | M3-02, S-06       |
| **M8-07** | **Receiver message (Mensaje Receptor)** | Accept/reject/partial-accept received invoices      | 3h       | M3-01             |
| **M8-08** | **Document type integration tests**     | End-to-end sandbox tests for each document type     | 4h       | M8-01–M8-07, S-04 |

### 🏢 M9 — Production Readiness

| ID        | Title                            | Description                                                         | Estimate | Dependencies |
| --------- | -------------------------------- | ------------------------------------------------------------------- | -------- | ------------ |
| **M9-01** | **Error handling & error codes** | Map all Hacienda rejection codes, human-readable messages (Spanish) | 3h       | M5-09        |
| **M9-02** | **Retry logic & resilience**     | Exponential backoff, network error recovery, idempotent submissions | 2h       | M5-01        |
| **M9-03** | **Structured logging**           | Configurable log levels, JSON log output for observability          | 2h       | M0-02        |
| **M9-04** | **Rate limiting**                | Respect Hacienda API limits, queue management                       | 2h       | M5-01        |
| **M9-05** | **README & usage docs**          | Installation, quick start, SDK examples, CLI reference, MCP setup   | 4h       | M7-12        |
| **M9-06** | **npm publish pipeline**         | Publish `@hacienda-cr/sdk`, `@hacienda-cr/cli`, `@hacienda-cr/mcp`  | 2h       | M0-04        |
| **M9-07** | **Security audit**               | Credential handling review, .p12 protection, token storage security | 2h       | M1-04        |
| **M9-08** | **Changelog & versioning**       | Conventional commits, changesets for monorepo versioning            | 1h       | M0-04        |

---

## Dependency Graph

```
S-01 ──────────────────────────────────────────┐
S-02 ──────────────────────────────────────────┤
S-03 ────────────────────┐                     │
S-04 ─────────────────┐  │                     │
S-06 ──────────────┐  │  │                     │
                   │  │  │                     │
M0-01 → M0-02 → M0-03 → M0-04                 │
         │        │      M0-05  M0-06          │
         │        │                            │
         ├── M1-01 → M1-02 ─────┐              │
         │    │      M1-03      │              │
         │    └── M1-04 ────────┤              │
         │                      └── M1-05      │
         │                                     │
         ├── M2-01 → M2-03 → M2-06            │
         │    │      M2-04 ──┘                 │
         │    │   M2-02                        │
         │    └── M2-05                        │
         │                                     │
         │   S-05 ──┐                          │
         │          ▼                          │
         ├── M3-01 → M3-02 → M3-05 → M3-06   │
         │    │      M3-03    M3-07            │
         │    │      M3-04                     │
         │    │                                │
         │    │         ┌──────────────────────┘
         │    │         ▼
         │    └── M4-01 → M4-02
         │         │      M4-03 → M4-04
         │         │      M4-05 (optional)
         │         │
         │    M1-02 + M4-03
         │         │
         │         ▼
         ├── M5-01 → M5-02 → M5-10 → M5-09
         │    │      M5-03 ──┘
         │    │      M5-04
         │    │      M5-05
         │    │      M5-06
         │    │      M5-07
         │    │      M5-08 (optional)
         │    │
         │    │   M5-10
         │    │    │
         │    ▼    ▼
         ├── M6-01 → M6-02..M6-13
         │    │
         │    │   M5-xx + M7-01
         │    │    │
         │    ▼    ▼
         ├── M7-01 → M7-02..M7-12
         │
         │   M3-02
         │    │
         │    ▼
         ├── M8-01..M8-07 → M8-08
         │
         └── M9-01..M9-08
```

### Parallelization Opportunities

These workstreams can run **simultaneously** after M0 is complete:

| Stream            | Issues                 | Blocker                     |
| ----------------- | ---------------------- | --------------------------- |
| **Auth & Config** | M1-01 → M1-04          | M0-02 only                  |
| **Types & Clave** | M2-01 → M2-06          | M0-02 only                  |
| **Spikes**        | S-01, S-02, S-03, S-06 | Nothing (start immediately) |
| **Sandbox Setup** | S-04                   | Nothing (start immediately) |
| **XML Gen**       | M3-01 → M3-07          | M2-01, S-03, S-05           |
| **CLI Scaffold**  | M6-01, M6-13           | M0-02 only                  |
| **MCP Scaffold**  | M7-01                  | M0-02 only                  |

After M3 + M4 converge → M5 unlocks → M6 commands + M7 tools can proceed in parallel.

M8 (all doc types) can start as soon as M3-02 (Factura builder) is proven — **each document type is independent**.

### Critical Path

```
M0-01 → M0-02 → M2-01 → M3-01 → M3-02 → M4-01 → M4-03 → M5-02 → M5-10 → M5-09
                                                                         │
                                              (first end-to-end invoice) ▼
                                                                     🎉 MVP
```

Estimated critical path duration: **~3-4 weeks** with focused effort.

---

## Open Questions

1. **Signing lib decision** — S-01 and S-02 spikes will determine if we wrap existing libs or build our own signing.
2. **npm scope** — `@hacienda-cr/*` availability? Alternative: `@dojocoding/hacienda-*`
3. **Schema v4.4 XSDs** — Need to download and vendor these from the ATV portal.
4. **CIIU 4 codes** — Full code list needed for constants module. Source: Hacienda annex documents.
5. **Exoneration API** — Exact endpoint URL and schema not fully documented in research. Needs investigation.
6. **Sequence number management** — How to handle consecutive numbering: in-memory, file-based, or database?
7. **Multi-company support** — Should the SDK natively support switching between multiple taxpayer identities?

---

## 🔑 Sandbox & Credential Setup Guide

### Background: ATV → TRIBU-CR Migration

As of **October 6, 2025**, Costa Rica migrated from the old **ATV** (Administración Tributaria Virtual) portal to **TRIBU-CR** (Sistema Integrado de Administración Tributaria). The new portal is accessed through the **OVI** (Oficina Virtual). All credential generation, tax declarations, and electronic invoicing management now happens through TRIBU-CR/OVI.

- **Old portal (deprecated):** `https://www.hacienda.go.cr/ATV/login.aspx`
- **New portal (active):** `https://ovitribucr.hacienda.go.cr/home`
- **TRIBU-CR info:** `https://www.hacienda.go.cr/TRIBU-CR.html`

> **Important:** The sandbox API endpoints (`api-stag`) remain the same — only the credential management portal changed from ATV to TRIBU-CR/OVI.

### Step-by-Step: Getting Sandbox Credentials

#### Prerequisites

- A valid Costa Rican **cédula** (physical or juridical person)
- Registration in the **RUT** (Registro Único Tributario)
- Access to the email registered in your RUT profile (for 2FA codes)

#### Step 1: Access TRIBU-CR / OVI

1. Go to **https://ovitribucr.hacienda.go.cr/home**
2. Log in with your **cédula number** and password
3. Complete **two-factor authentication** (code sent to registered email)
4. Select your **user profile**: Obligado Tributario or Representante Legal

> **Note on 2FA:** TRIBU-CR uses email-based 2FA (no more Tarjeta Inteligente Virtual). Each login requires entering a temporary code sent to the email registered in the RUT. This means you can no longer share a single static password with third parties.

#### Step 2: Generate API Production Password (Contraseña de Producción)

1. In the OVI sidebar, select **"Tico Factura"**
2. Click **"Crear usuario"**
3. Select **"No, voy a usar otro programa"** (since we're building our own system)
4. Click **"Crear Usuario"**
5. The system generates and sends to your registered email:
   - **Username (Identificación de Ingreso):**
     - Persona Física: `cpf-XXXXXXXXX@prod.comprobanteselectronicos.go.cr`
     - Persona Jurídica: `cpj-3XXXXXXXXX@prod.comprobanteselectronicos.go.cr`
   - **Password:** Auto-generated (~20 character string)

> These credentials are also visible under **"Mi perfil"** in TicoFactura.

#### Step 3: Generate Llave Criptográfica (.p12 file)

1. Still in **"Tico Factura"**, look for the **"Generar Llave Criptográfica"** button
2. Enter a **4-digit PIN** twice (you'll need this PIN to load the .p12 in code)
3. Click **"Guardar"**
4. Click **"Descargar Llave Criptográfica"** to download the `.p12` file
5. Store the `.p12` file securely — this is your digital signing certificate

> **PIN is critical:** The PIN protects the .p12 file. Our SDK will need this PIN to load the PKCS#12 keystore at runtime. Store it in your config alongside the .p12 path.

#### Step 4: Sandbox vs Production

The credentials generated above are **production** credentials. For the **sandbox** environment:

- **Same .p12 file** works for both environments
- **Username format changes slightly** for sandbox:
  - Production: `cpf-XXX@prod.comprobanteselectronicos.go.cr`
  - Sandbox (stag): `cpf-XXX@stag.comprobanteselectronicos.go.cr` _(verify — may use same credentials)_
- **Client ID** changes: `api-stag` instead of `api-prod`
- **IDP realm** changes: `rut-stag` instead of `rut`

> ⚠️ **Spike S-04 should verify** whether sandbox requires separate credential generation or if production credentials work against the `rut-stag` realm. CRLibre documentation and community forums suggest the same credentials work for both — but this needs hands-on verification.

#### Step 5: Verify Authentication

Test your credentials against the sandbox IDP:

```bash
curl -s -X POST \
  "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=api-stag" \
  -d "username=cpj-3XXXXXXXXX@stag.comprobanteselectronicos.go.cr" \
  -d "password=YOUR_PASSWORD" \
  | jq '{access_token: .access_token[:50], expires_in, refresh_expires_in, token_type}'
```

Expected response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwi...",
  "expires_in": 300,
  "refresh_expires_in": 36000,
  "token_type": "bearer"
}
```

### Credential Storage Convention

For our SDK/CLI, credentials are stored in `~/.hacienda-cr/`:

```
~/.hacienda-cr/
├── config.toml          # Environment, username, p12 path
├── credentials.enc      # Encrypted password (or use env var)
└── keys/
    └── company-name.p12 # Digital signing certificate
```

**config.toml example:**

```toml
[default]
environment = "sandbox"  # or "production"

[sandbox]
username = "cpj-3101234567@stag.comprobanteselectronicos.go.cr"
p12_path = "~/.hacienda-cr/keys/dojocoding.p12"
# Password via env: HACIENDA_PASSWORD
# P12 PIN via env: HACIENDA_P12_PIN

[production]
username = "cpj-3101234567@prod.comprobanteselectronicos.go.cr"
p12_path = "~/.hacienda-cr/keys/dojocoding.p12"
```

### Token Lifecycle

| Token              | Lifetime             | Strategy                                   |
| ------------------ | -------------------- | ------------------------------------------ |
| Access token (JWT) | ~5 minutes (300s)    | Cache in memory, refresh 30s before expiry |
| Refresh token      | ~10 hours (36000s)   | Persist to disk, use for silent re-auth    |
| Re-authentication  | When refresh expires | Full ROPC grant with stored credentials    |

### Token Revocation

Logout/revocation endpoints (for completeness):

- **Sandbox:** `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/logout`
- **Production:** `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token/logout`

---

## 📚 Official Hacienda Documentation

All official documentation comes from Hacienda's portal. These should be downloaded and tracked in the repo under `docs/hacienda/`.

### Primary Documents

| Document                            | URL                                                                                                                                                    | Description                                                                                                             | Track In Repo                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **API Reference (v4.4)**            | [comprobantes-electronicos-api.html](https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/comprobantes-electronicos-api.html) | RAML-based REST API documentation. Endpoints, payloads, responses.                                                      | `docs/hacienda/api-reference-v4.4.html`                |
| **Annexes & Structures (v4.4)**     | [ANEXOS Y ESTRUCTURAS_V4.4.pdf](https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/ANEXOS%20Y%20ESTRUCTURAS_V4.4.pdf)       | Complete spec: XML structure, field definitions, codes, validation rules, clave numérica format. **This is the bible.** | `docs/hacienda/anexos-estructuras-v4.4.pdf`            |
| **XSD Schemas (v4.4)**              | [frmAnexosyEstructuras.aspx](https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx)                                         | Downloadable XSD files defining XML structure for all 7 document types.                                                 | `packages/sdk/src/xml/schemas/*.xsd`                   |
| **IdP Authentication Guide**        | [Guia_IdP.pdf](https://www.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.3/Guia_IdP.pdf)                                             | OAuth2/OpenID Connect authentication flow, username format, token management.                                           | `docs/hacienda/guia-idp.pdf`                           |
| **Resolution MH-DGT-RES-0027-2024** | _(Official gazette)_                                                                                                                                   | Legal resolution establishing v4.4 schema, effective Sept 1, 2025. Lists all 146 changes from v4.3.                     | `docs/hacienda/resolucion-0027-2024.pdf`               |
| **Annexes v4.3 (legacy reference)** | [ANEXOS Y ESTRUCTURAS_V4.3.pdf](https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.3/ANEXOS%20Y%20ESTRUCTURAS_V4.3.pdf)       | Previous version — useful for understanding what changed.                                                               | `docs/hacienda/anexos-estructuras-v4.3.pdf` (optional) |

### Supplementary References

| Document                 | URL                                                                                                                                            | Description                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **TRIBU-CR FAQ**         | [Preguntas y Respuestas](https://www.hacienda.go.cr/docs/dPreguntasYRespuestasDeTRIBU-CR.pdf)                                                  | FAQ covering the ATV → TRIBU-CR migration, OVI access, TicoFactura      |
| **TRIBU-CR Info Page**   | [hacienda.go.cr/TRIBU-CR.html](https://www.hacienda.go.cr/TRIBU-CR.html)                                                                       | Official landing page with video tutorials                              |
| **TRIBU-CR Notices**     | [hacienda.go.cr/AvisosTRIBU-CR.html](https://www.hacienda.go.cr/AvisosTRIBU-CR.html)                                                           | Ongoing notices about system changes and availability                   |
| **CRLibre API URLs**     | [crlibre.org/preguntas/url-de-api](https://crlibre.org/preguntas/url-de-api-de-comprobantes-electronicos/)                                     | Community reference for all API endpoints (sandbox + prod + revocation) |
| **XAdES Signing Policy** | [Resolucion_DGT-R-48-2016.pdf](https://tribunet.hacienda.go.cr/docs/esquemas/2016/v4.1/Resolucion_Comprobantes_Electronicos_DGT-R-48-2016.pdf) | Referenced in XAdES-EPES policy identifier                              |

### Documentation Repo Structure

```
docs/
├── hacienda/                        # Official Hacienda documents (vendored)
│   ├── README.md                    # Index with download dates and version notes
│   ├── api-reference-v4.4.html      # REST API documentation
│   ├── anexos-estructuras-v4.4.pdf  # The spec bible
│   ├── guia-idp.pdf                 # Auth guide
│   ├── resolucion-0027-2024.pdf     # Legal resolution (v4.4)
│   └── tribu-cr-faq.pdf             # TRIBU-CR migration FAQ
├── architecture/                    # Our own design docs
│   └── decisions.md                 # ADRs (Architecture Decision Records)
└── guides/
    ├── sandbox-setup.md             # Step-by-step (extracted from this doc)
    └── first-invoice.md             # Tutorial: submit your first invoice
```

---

## 🔧 Open-Source Ecosystem — Libraries to Extract Value From

These are the proven open-source projects in the CR electronic invoicing space. We should study, audit, and selectively adopt patterns from them.

### Tier 1: Primary References (Node.js / TypeScript)

| Repo                                                                                          | Stars | Language   | Last Updated | License | What to Extract                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------- | ----- | ---------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [**facturacr/facturar-costa-rica-lib**](https://github.com/facturacr/facturar-costa-rica-lib) | 19 ⭐ | TypeScript | 2025-09-04   | MIT     | **Highest value.** Full SDK: XML generation, API client, types. v4.4 support (v2.0.11-alpha). Study their XML builder patterns, Zod schemas, and API abstractions. May wrap or fork significant portions.                |
| [**aazcast/haciendacostarica-signer**](https://github.com/aazcast/haciendacostarica-signer)   | 21 ⭐ | JavaScript | 2019-06-28   | MIT     | **XAdES-EPES signing.** Dedicated signing library. Not updated since 2019 — needs audit for v4.4 policy compatibility. May need fork + maintenance. Core crypto logic is likely still valid (XAdES spec hasn't changed). |

**Spike S-01** audits `haciendacostarica-signer`: Does the policy hash match? Does it handle v4.4 XML structures? What's the dependency tree?

**Spike S-02** audits `facturar-costa-rica-lib`: How complete is v4.4 support? What's the code quality? Can we use it as our SDK core or do we build fresh and just reference patterns?

### Tier 2: Reference Implementations (Other Languages)

| Repo                                                                                  | Stars  | Language  | Last Updated | What to Extract                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------ | --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**CRLibre/API_Hacienda**](https://github.com/CRLibre/API_Hacienda)                   | 205 ⭐ | PHP       | 2025-11-06   | **The flagship.** Most battle-tested impl. Study their XML generation templates, signing flow, error handling, and edge cases. v4.4 updated Oct 2025. Docker-deployable.     |
| [**CRLibre/fe-hacienda-cr-docs**](https://github.com/CRLibre/fe-hacienda-cr-docs)     | 17 ⭐  | HTML/Docs | —            | **Flow diagrams and documentation.** Contains the canonical workflow diagram for electronic invoicing in CR.                                                                 |
| [**CRLibre/fe-hacienda-cr-misc**](https://github.com/CRLibre/fe-hacienda-cr-misc)     | 4 ⭐   | —         | —            | **Common files and resources.** Sample XMLs, test data, shared assets for any FE implementation.                                                                             |
| [**royrojas/FacturaElectronicaCR**](https://github.com/royrojas/FacturaElectronicaCR) | 47 ⭐  | C#        | 2022-12-07   | **Complete .NET implementation.** Uses FirmaXadesNet for signing. Good reference for strongly-typed document models. Roy Rojas also published sample XML documents for v4.3. |
| [**open-byte/xml-signer**](https://github.com/open-byte/xml-signer)                   | 8 ⭐   | Python    | 2023-10-16   | **Python XAdES-EPES CLI.** Clean signing implementation. Useful for cross-referencing our signing output against a known-good implementation.                                |

### Tier 3: Ecosystem & Connectors

| Repo                                                                                  | Language | What to Extract                                                      |
| ------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| [**CRLibre/fe-hacienda-cr-dotnet**](https://github.com/CRLibre/fe-hacienda-cr-dotnet) | C#       | .NET connector for CRLibre API — patterns for API client abstraction |
| **opencodecr/Faktur-PHP-SDK**                                                         | PHP      | Alternative PHP SDK — different architectural approach               |

### Extraction Strategy

For each Tier 1 repo, the spike should produce:

1. **API surface audit** — What functions/classes exist? How are they organized?
2. **v4.4 compliance check** — Does it handle all 146 changes? New document types?
3. **Code quality assessment** — Types? Tests? Error handling? Edge cases?
4. **Dependency audit** — What does it pull in? Any security concerns?
5. **Reuse recommendation** — Wrap? Fork? Reference only? Rewrite?

### What We Learn From Each

| Source                          | Key Learning                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `facturar-costa-rica-lib`       | TS type definitions, XML builder patterns, Zod schemas, API client shape         |
| `haciendacostarica-signer`      | XAdES-EPES crypto implementation, .p12 loading, signature embedding              |
| `CRLibre/API_Hacienda`          | Battle-tested XML templates, error handling patterns, edge cases from 200+ users |
| `fe-hacienda-cr-docs`           | Canonical workflow diagrams, process documentation                               |
| `fe-hacienda-cr-misc`           | Sample XML files for testing, shared resources                                   |
| `royrojas/FacturaElectronicaCR` | Strongly-typed document models in C# (translate patterns to TS)                  |
| `open-byte/xml-signer`          | Cross-validation target for signing output                                       |

---

## Open Questions

1. **Signing lib decision** — S-01 and S-02 spikes will determine if we wrap existing libs or build our own signing.
2. **npm scope** — `@hacienda-cr/*` availability? Alternative: `@dojocoding/hacienda-*`
3. **Schema v4.4 XSDs** — Need to download and vendor these from the ATV portal.
4. **CIIU 4 codes** — Full code list needed for constants module. Source: Hacienda annex documents.
5. **Exoneration API** — Exact endpoint URL and schema not fully documented in research. Needs investigation.
6. **Sequence number management** — How to handle consecutive numbering: in-memory, file-based, or database?
7. **Multi-company support** — Should the SDK natively support switching between multiple taxpayer identities?
8. **Sandbox credential format** — Verify if `@stag.comprobanteselectronicos.go.cr` or `@prod...` works against sandbox IDP realm.
