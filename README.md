# hacienda-cr

**TypeScript SDK, CLI & MCP Server for Costa Rica Electronic Invoicing (Hacienda API v4.4)**

[![npm version](https://img.shields.io/npm/v/@hacienda-cr/sdk.svg)](https://www.npmjs.com/package/@hacienda-cr/sdk)
[![CI](https://github.com/DojoCodingLabs/hacienda-cr/actions/workflows/ci.yml/badge.svg)](https://github.com/DojoCodingLabs/hacienda-cr/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A complete toolkit for Costa Rica electronic invoicing (_comprobantes electronicos_) against the Ministerio de Hacienda API v4.4. Three-layer architecture: **SDK** (core library) -> **CLI** (`hacienda` binary) -> **MCP Server** (AI-accessible tools).

---

## Quick Start

### SDK

```bash
npm install @hacienda-cr/sdk
```

```ts
import {
  HaciendaClient,
  DocumentType,
  Situation,
  buildFacturaXml,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  signAndEncode,
  submitAndWait,
  HttpClient,
} from "@hacienda-cr/sdk";

// 1. Create the client
const client = new HaciendaClient({
  environment: "sandbox",
  credentials: {
    idType: "02", // Cedula Juridica
    idNumber: "3101234567",
    password: process.env.HACIENDA_PASSWORD!,
  },
});

// 2. Authenticate
await client.authenticate();

// 3. Generate the clave numerica
const clave = client.buildClave({
  date: new Date(),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 1,
  situation: Situation.NORMAL,
});

// 4. Build, sign, and submit (see full example below)
```

### CLI

```bash
npm install -g @hacienda-cr/cli

# Authenticate
hacienda auth login --cedula-type 02 --cedula 3101234567

# Create a draft invoice interactively
hacienda draft --interactive

# Validate an invoice file
hacienda validate invoice.json

# Submit (dry run to preview XML)
hacienda submit invoice.json --dry-run

# Look up a taxpayer
hacienda lookup 3101234567
```

### MCP Server

```bash
npm install -g @hacienda-cr/mcp

# Run the MCP server
hacienda-mcp
```

---

## Table of Contents

- [SDK Documentation](#sdk-documentation)
  - [HaciendaClient](#haciendaclient)
  - [Authentication](#authentication)
  - [Creating Documents](#creating-documents)
  - [Tax Calculation](#tax-calculation)
  - [Clave Numerica](#clave-numerica)
  - [Signing](#signing)
  - [Submission and Polling](#submission-and-polling)
  - [Taxpayer Lookup](#taxpayer-lookup)
  - [Configuration Management](#configuration-management)
  - [Logging](#logging)
  - [Error Handling](#error-handling)
- [CLI Documentation](#cli-documentation)
- [MCP Server Documentation](#mcp-server-documentation)
- [Development](#development)
- [License](#license)

---

## SDK Documentation

### HaciendaClient

The `HaciendaClient` is the primary entry point for the SDK. It orchestrates authentication, clave generation, and provides convenience methods.

```ts
import { HaciendaClient } from "@hacienda-cr/sdk";

const client = new HaciendaClient({
  // Required
  environment: "sandbox", // "sandbox" | "production"
  credentials: {
    idType: "02", // "01"=Fisica, "02"=Juridica, "03"=DIMEX, "04"=NITE
    idNumber: "3101234567", // 9-12 digit cedula
    password: process.env.HACIENDA_PASSWORD!,
  },

  // Optional
  p12Path: "/path/to/certificate.p12", // For signing
  p12Pin: process.env.HACIENDA_P12_PIN, // .p12 password
  fetchFn: customFetch, // Custom fetch implementation
});
```

**Options are validated at construction time** using Zod. Invalid options throw a `ValidationError`.

### Authentication

Authentication uses OAuth2 ROPC (Resource Owner Password Credentials) against the Hacienda IDP.

```ts
// Authenticate (obtains access + refresh tokens)
await client.authenticate();

// Check authentication status
console.log(client.isAuthenticated); // true

// Get a valid access token (auto-refreshes if expired)
const token = await client.getAccessToken();

// Force re-authentication
client.invalidate();
await client.authenticate();
```

**Token lifecycle:**

- Access tokens expire after ~5 minutes (cached in memory, refreshed 30s before expiry)
- Refresh tokens last ~10 hours
- `getAccessToken()` handles refresh transparently

**Environments:**

| Environment  | API Base URL                                               | IDP Realm  | Client ID  |
| ------------ | ---------------------------------------------------------- | ---------- | ---------- |
| `sandbox`    | `api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/` | `rut-stag` | `api-stag` |
| `production` | `api.comprobanteselectronicos.go.cr/recepcion/v1/`         | `rut`      | `api-prod` |

### Creating Documents

The SDK supports all Hacienda v4.4 document types. Here is a complete Factura Electronica example:

```ts
import {
  buildFacturaXml,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  buildClave,
  DocumentType,
  Situation,
} from "@hacienda-cr/sdk";
import type { LineItemInput } from "@hacienda-cr/sdk";

// 1. Define line items
const lineItems: LineItemInput[] = [
  {
    numeroLinea: 1,
    codigoCabys: "8310100000000", // CABYS code (13 digits)
    cantidad: 2,
    unidadMedida: "Unid",
    detalle: "Web development services",
    precioUnitario: 50000,
    esServicio: true,
    impuesto: [
      {
        codigo: "01", // IVA
        codigoTarifa: "08", // 13% general rate
        tarifa: 13,
      },
    ],
  },
  {
    numeroLinea: 2,
    codigoCabys: "4321000000000",
    cantidad: 1,
    unidadMedida: "Unid",
    detalle: "Laptop",
    precioUnitario: 500000,
    esServicio: false,
    impuesto: [
      {
        codigo: "01",
        codigoTarifa: "08",
        tarifa: 13,
      },
    ],
    descuento: [
      {
        montoDescuento: 25000,
        naturalezaDescuento: "Volume discount",
      },
    ],
  },
];

// 2. Calculate line item totals (adds montoTotal, subTotal, impuestoNeto, etc.)
const calculatedItems = lineItems.map(calculateLineItemTotals);

// 3. Calculate invoice summary (ResumenFactura)
const summary = calculateInvoiceSummary(calculatedItems);

// 4. Generate clave numerica
const clave = buildClave({
  date: new Date(),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 1,
  situation: Situation.NORMAL,
});

// 5. Build the consecutivo
const numeroConsecutivo = "00100001010000000001";

// 6. Assemble the factura and build XML
const factura = {
  clave,
  codigoActividad: "620100",
  numeroConsecutivo,
  fechaEmision: new Date().toISOString(),
  emisor: {
    nombre: "Mi Empresa S.A.",
    identificacion: { tipo: "02", numero: "3101234567" },
    correoElectronico: "facturacion@miempresa.co.cr",
  },
  receptor: {
    nombre: "Cliente S.R.L.",
    identificacion: { tipo: "02", numero: "3109876543" },
    correoElectronico: "pagos@cliente.co.cr",
  },
  condicionVenta: "01", // Contado (cash)
  medioPago: ["01"], // Efectivo
  detalleServicio: calculatedItems,
  resumenFactura: summary,
};

const xml = buildFacturaXml(factura);
```

**Supported document types:**

| Code | Type                                       | Builder                        |
| ---- | ------------------------------------------ | ------------------------------ |
| `01` | Factura Electronica                        | `buildFacturaXml()`            |
| `02` | Nota de Debito Electronica                 | `buildNotaDebitoXml()`         |
| `03` | Nota de Credito Electronica                | `buildNotaCreditoXml()`        |
| `04` | Tiquete Electronico                        | `buildTiqueteXml()`            |
| `05` | Factura Electronica de Compra              | `buildFacturaCompraXml()`      |
| `06` | Factura Electronica de Exportacion         | `buildFacturaExportacionXml()` |
| `07` | Recibo Electronico de Pago                 | `buildReciboPagoXml()`         |
| --   | Mensaje Receptor (receiver acknowledgment) | `buildMensajeReceptorXml()`    |

**XML validation:**

```ts
import { validateFacturaInput } from "@hacienda-cr/sdk";

const result = validateFacturaInput(facturaData);
if (!result.valid) {
  for (const err of result.errors) {
    console.error(`${err.path}: ${err.message}`);
  }
}
```

### Tax Calculation

The SDK provides utilities for computing IVA taxes, line item totals, and invoice summaries following Hacienda requirements. All monetary values are rounded to 5 decimal places.

```ts
import { round5, calculateLineItemTotals, calculateInvoiceSummary } from "@hacienda-cr/sdk";
import type { LineItemInput, CalculatedLineItem, InvoiceSummary } from "@hacienda-cr/sdk";

// Calculate a single line item
const item: LineItemInput = {
  numeroLinea: 1,
  codigoCabys: "8310100000000",
  cantidad: 3,
  unidadMedida: "Sp",
  detalle: "Consulting hours",
  precioUnitario: 75000,
  esServicio: true,
  impuesto: [{ codigo: "01", codigoTarifa: "08", tarifa: 13 }],
};

const calculated: CalculatedLineItem = calculateLineItemTotals(item);
// calculated.montoTotal    = 225000       (3 * 75000)
// calculated.subTotal      = 225000       (no discounts)
// calculated.impuestoNeto  = 29250        (225000 * 0.13)
// calculated.montoTotalLinea = 254250     (225000 + 29250)

// Calculate the full invoice summary
const summary: InvoiceSummary = calculateInvoiceSummary([calculated]);
// summary.totalServGravados  = 225000
// summary.totalImpuesto      = 29250
// summary.totalComprobante   = 254250
```

**Tax exonerations** are also supported:

```ts
const itemWithExoneration: LineItemInput = {
  // ...base fields
  impuesto: [
    {
      codigo: "01",
      codigoTarifa: "08",
      tarifa: 13,
      exoneracion: {
        tipoDocumento: "01",
        numeroDocumento: "AL-001-2025",
        nombreInstitucion: "MEIC",
        fechaEmision: "2025-01-01T00:00:00",
        porcentajeExoneracion: 100,
      },
    },
  ],
};
```

### Clave Numerica

Every document requires a unique 50-digit key.

**Structure:** `[506][DDMMYY][12-digit taxpayer][3-branch][5-POS][2-docType][10-sequence][1-situation][8-security]`

```ts
import { buildClave, parseClave, DocumentType, Situation } from "@hacienda-cr/sdk";

// Build a clave
const clave = buildClave({
  date: new Date("2025-07-15"),
  taxpayerId: "3101234567",
  documentType: DocumentType.FACTURA_ELECTRONICA,
  sequence: 42,
  situation: Situation.NORMAL,
  branch: "001", // Optional, defaults to "001"
  pos: "00001", // Optional, defaults to "00001"
  securityCode: "12345678", // Optional, auto-generated if omitted
});
// => "50615072500310123456700100001010000000042112345678"

// Parse a clave
const parsed = parseClave(clave);
// parsed.countryCode   => "506"
// parsed.date          => Date(2025-07-15)
// parsed.taxpayerId    => "003101234567"
// parsed.documentType  => "01"
// parsed.sequence      => 42
// parsed.situation     => "1"
// parsed.securityCode  => "12345678"
```

**Document type codes:**

- `01` Factura Electronica
- `02` Nota de Debito Electronica
- `03` Nota de Credito Electronica
- `04` Tiquete Electronico
- `05` Confirmacion de Aceptacion
- `06` Confirmacion de Aceptacion Parcial
- `07` Confirmacion de Rechazo
- `08` Factura de Compra
- `09` Factura de Exportacion

**Situation codes:**

- `1` Normal (standard online submission)
- `2` Contingencia (system contingency)
- `3` Sin Internet (offline)

### Signing

All XML submitted to Hacienda must be signed with XAdES-EPES using the taxpayer's .p12 certificate (RSA 2048 + SHA-256).

```ts
import { readFileSync } from "node:fs";
import { signXml, signAndEncode, loadP12 } from "@hacienda-cr/sdk";

const p12Buffer = readFileSync("/path/to/certificate.p12");
const pin = process.env.HACIENDA_P12_PIN!;

// Sign XML (returns signed XML string)
const signedXml = await signXml(xml, p12Buffer, pin);

// Sign and encode as Base64 (ready for API submission)
const base64Xml = await signAndEncode(xml, p12Buffer, pin);

// Load .p12 to inspect certificate details
const credentials = await loadP12(p12Buffer, pin);
// credentials.privateKey — CryptoKey for signing
// credentials.certificateDer — DER-encoded certificate
```

### Submission and Polling

The SDK provides low-level submission and a high-level orchestrator.

**Low-level:**

```ts
import { HttpClient, submitDocument, getStatus, isTerminalStatus } from "@hacienda-cr/sdk";

// Create an authenticated HTTP client
const httpClient = new HttpClient({
  baseUrl: "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1",
  getToken: () => client.getAccessToken(),
});

// Submit a document
const response = await submitDocument(httpClient, {
  clave: "50601...",
  fecha: new Date().toISOString(),
  emisor: {
    tipoIdentificacion: "02",
    numeroIdentificacion: "3101234567",
  },
  comprobanteXml: base64SignedXml,
});

// Poll for status
const status = await getStatus(httpClient, "50601...");
if (isTerminalStatus(status.status)) {
  console.log("Final status:", status.status);
}
```

**High-level orchestrator (`submitAndWait`):**

```ts
import { submitAndWait } from "@hacienda-cr/sdk";

const result = await submitAndWait(
  httpClient,
  {
    clave: "50601...",
    fecha: new Date().toISOString(),
    emisor: {
      tipoIdentificacion: "02",
      numeroIdentificacion: "3101234567",
    },
    comprobanteXml: base64SignedXml,
  },
  {
    pollIntervalMs: 3000, // Poll every 3 seconds (default)
    timeoutMs: 60000, // Timeout after 60 seconds (default)
    onPoll: (status, attempt) => {
      console.log(`Poll attempt ${attempt}: ${status.status}`);
    },
  },
);

if (result.accepted) {
  console.log("Document accepted by Hacienda!");
} else {
  console.log("Rejected:", result.rejectionReason);
}
```

**List and retrieve documents:**

```ts
import { listComprobantes, getComprobante } from "@hacienda-cr/sdk";

// List recent comprobantes
const list = await listComprobantes(httpClient, {
  offset: 0,
  limit: 10,
  fechaEmisionDesde: "2025-01-01",
  fechaEmisionHasta: "2025-12-31",
});

// Get full details by clave
const detail = await getComprobante(httpClient, "50601...");
```

**Retry helper:**

```ts
import { withRetry } from "@hacienda-cr/sdk";

const result = await withRetry(() => submitDocument(httpClient, request), {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: "exponential",
});
```

### Taxpayer Lookup

Look up taxpayer information using the public Hacienda economic activity API (no authentication required):

```ts
import { lookupTaxpayer } from "@hacienda-cr/sdk";

const info = await lookupTaxpayer("3101234567");
console.log(info.nombre); // "MI EMPRESA S.A."
console.log(info.tipoIdentificacion); // "02"
for (const activity of info.actividades) {
  console.log(`${activity.codigo}: ${activity.descripcion} (${activity.estado})`);
}
```

### Configuration Management

The SDK manages configuration in `~/.hacienda-cr/config.toml` with multi-profile support.

```ts
import {
  loadConfig,
  saveConfig,
  listProfiles,
  deleteProfile,
  getNextSequence,
  resetSequence,
} from "@hacienda-cr/sdk";

// Save a profile
await saveConfig(
  {
    environment: "sandbox",
    cedula_type: "02",
    cedula: "3101234567",
    p12_path: "/path/to/cert.p12",
  },
  "myprofile",
);

// Load a profile
const config = await loadConfig("myprofile");

// List all profiles
const profiles = await listProfiles();

// Delete a profile
await deleteProfile("oldprofile");

// Sequence management (auto-incrementing document numbers)
const seq = await getNextSequence("02", "3101234567", "01", "001", "00001");
await resetSequence("02", "3101234567", "01", "001", "00001");
```

Sensitive values are never stored in config files:

- `HACIENDA_PASSWORD` -- IDP password (environment variable)
- `HACIENDA_P12_PIN` -- .p12 certificate PIN (environment variable)

### Logging

The SDK includes a structured logging module with configurable levels and formats.

```ts
import { Logger, LogLevel, noopLogger } from "@hacienda-cr/sdk";

// Create a logger
const logger = new Logger({
  level: LogLevel.DEBUG, // DEBUG, INFO, WARN, ERROR, SILENT
  format: "text", // "text" | "json"
  context: "my-app", // Logger context label
});

logger.debug("Token refreshed", { expiresIn: 300 });
logger.info("Document submitted", { clave: "50601..." });
logger.warn("Rate limit approaching");
logger.error("Submission failed", { statusCode: 500 });

// No-op logger (suppresses all output)
const silent = noopLogger;
```

### Error Handling

All SDK errors extend `HaciendaError` for easy catch-all handling:

```ts
import {
  HaciendaError,
  HaciendaErrorCode,
  ValidationError,
  ApiError,
  AuthenticationError,
  SigningError,
} from "@hacienda-cr/sdk";

try {
  await client.authenticate();
  const xml = buildFacturaXml(factura);
  const signed = await signAndEncode(xml, p12, pin);
  const result = await submitAndWait(httpClient, request);
} catch (err) {
  if (err instanceof ValidationError) {
    // Input validation failure (Zod schema or business rules)
    console.error("Validation:", err.message, err.details);
  } else if (err instanceof AuthenticationError) {
    // Authentication or token lifecycle failure
    console.error("Auth:", err.message);
  } else if (err instanceof SigningError) {
    // XAdES-EPES signing failure (bad .p12, wrong PIN, etc.)
    console.error("Signing:", err.message);
  } else if (err instanceof ApiError) {
    // HTTP/network error from the Hacienda API
    console.error("API:", err.message, err.statusCode, err.responseBody);
  } else if (err instanceof HaciendaError) {
    // Any other SDK error
    console.error(`[${err.code}]`, err.message);
  }
}
```

**Error codes (`HaciendaErrorCode`):**

- `VALIDATION_FAILED` -- Input failed Zod or business-rule validation
- `API_ERROR` -- Hacienda REST API returned an error or was unreachable
- `AUTHENTICATION_FAILED` -- Authentication or token lifecycle failure
- `SIGNING_FAILED` -- XAdES-EPES signing operation failed
- `INTERNAL_ERROR` -- Unexpected internal error

---

## CLI Documentation

The `@hacienda-cr/cli` package provides the `hacienda` command-line tool.

```bash
npm install -g @hacienda-cr/cli
```

All commands support `--json` for machine-readable JSON output.

### `hacienda auth login`

Authenticate with the Hacienda IDP and save the profile.

```bash
hacienda auth login \
  --cedula-type 02 \
  --cedula 3101234567 \
  --environment sandbox \
  --profile default

# Password via environment variable (recommended)
export HACIENDA_PASSWORD="your-password"
hacienda auth login --cedula-type 02 --cedula 3101234567

# Or inline (not recommended for production)
hacienda auth login --cedula-type 02 --cedula 3101234567 --password "secret"
```

**Arguments:**

- `--cedula-type` -- `01` (Fisica), `02` (Juridica), `03` (DIMEX), `04` (NITE)
- `--cedula` -- Identification number
- `--password` -- IDP password (or set `HACIENDA_PASSWORD`)
- `--environment` -- `sandbox` (default) or `production`
- `--profile` -- Profile name (default: `default`)

### `hacienda auth status`

Show current authentication status.

```bash
hacienda auth status
hacienda auth status --profile production
hacienda auth status --json
```

### `hacienda auth switch`

Switch between authentication profiles.

```bash
# List available profiles
hacienda auth switch

# Switch to a specific profile
hacienda auth switch production
```

### `hacienda submit`

Submit an electronic invoice to Hacienda.

```bash
# Validate and preview XML (dry run)
hacienda submit invoice.json --dry-run

# Submit for real
hacienda submit invoice.json

# JSON output
hacienda submit invoice.json --dry-run --json
```

### `hacienda status`

Check document processing status by clave.

```bash
hacienda status 50601012400310123456700100001010000000001199999999
hacienda status 50601012400310123456700100001010000000001199999999 --json
```

### `hacienda list`

List recent comprobantes from Hacienda.

```bash
hacienda list
hacienda list --limit 50 --offset 0
hacienda list --json
```

### `hacienda get`

Get full details of a document by clave.

```bash
hacienda get 50601012400310123456700100001010000000001199999999
hacienda get 50601012400310123456700100001010000000001199999999 --json
```

### `hacienda sign`

Sign an XML document with a .p12 certificate (XAdES-EPES).

```bash
# Sign and write to file
hacienda sign invoice.xml --p12 cert.p12 --pin 1234 --output signed.xml

# Sign and output to stdout
hacienda sign invoice.xml --p12 cert.p12 --pin 1234

# Using environment variables
export HACIENDA_P12_PATH=/path/to/cert.p12
export HACIENDA_P12_PIN=1234
hacienda sign invoice.xml --output signed.xml
```

### `hacienda validate`

Validate an invoice file (JSON or XML) against schemas and business rules.

```bash
# Validate JSON invoice
hacienda validate invoice.json

# Validate XML document
hacienda validate document.xml

# JSON output
hacienda validate invoice.json --json
```

### `hacienda lookup`

Look up taxpayer economic activities by cedula (no authentication required).

```bash
hacienda lookup 3101234567
hacienda lookup 3101234567 --json
```

### `hacienda draft`

Interactively create an invoice JSON draft for submission.

```bash
# Interactive mode (step-by-step prompts)
hacienda draft

# Generate a blank template
hacienda draft --no-interactive

# Specify template type
hacienda draft --template nota-credito --output credit-note.json

# Output to stdout as JSON
hacienda draft --json
```

**Templates:** `factura` (default), `nota-credito`, `nota-debito`, `tiquete`

### Environment Variables

| Variable            | Description                       |
| ------------------- | --------------------------------- |
| `HACIENDA_PASSWORD` | IDP password for authentication   |
| `HACIENDA_P12_PIN`  | PIN for the .p12 certificate file |
| `HACIENDA_P12_PATH` | Path to the .p12 certificate file |

---

## MCP Server Documentation

The `@hacienda-cr/mcp` package exposes the SDK as an MCP (Model Context Protocol) server, making it accessible to AI assistants like Claude Desktop.

### Setup with Claude Desktop

Add this to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hacienda-cr": {
      "command": "npx",
      "args": ["-y", "@hacienda-cr/mcp"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "hacienda-cr": {
      "command": "hacienda-mcp"
    }
  }
}
```

### Setup with Other MCP Clients

The server uses stdio transport. Start it with:

```bash
npx @hacienda-cr/mcp
# or
hacienda-mcp
```

### Available Tools

| Tool              | Description                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `create_invoice`  | Create a Factura Electronica from structured input. Computes taxes, generates the clave, and builds XML. |
| `check_status`    | Check document processing status by 50-digit clave numerica.                                             |
| `list_documents`  | List recent electronic documents with optional filters (date, emisor, receptor).                         |
| `get_document`    | Get full document details by clave.                                                                      |
| `lookup_taxpayer` | Look up taxpayer info by identification number (cedula).                                                 |
| `draft_invoice`   | Generate a draft invoice template with sensible defaults.                                                |

**Example prompts for AI assistants:**

- "Create an invoice from Mi Empresa S.A. (cedula 3101234567) to Cliente S.R.L. (cedula 3109876543) for 2 hours of consulting at 50,000 CRC each with 13% IVA."
- "Look up taxpayer 3101234567"
- "Draft an invoice for IT services"
- "Check status of document with clave 506010124..."

### Available Resources

| URI                                   | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `hacienda://schemas/factura`          | JSON schema for invoice creation input     |
| `hacienda://reference/document-types` | Document types, codes, and descriptions    |
| `hacienda://reference/tax-codes`      | Tax codes, IVA rates, and units of measure |
| `hacienda://reference/id-types`       | Identification types and validation rules  |

---

## Development

### Prerequisites

- **Node.js** 22+ (uses native `fetch`, `crypto.subtle`)
- **pnpm** 9+ (package manager)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/danielbejarano/hacienda-cr.git
cd hacienda-cr

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint and format
pnpm lint
pnpm format

# Type checking
pnpm typecheck
```

### Project Structure

```
hacienda-cr/
├── packages/
│   ├── sdk/       # @hacienda-cr/sdk — Core: auth, XML, signing, API client
│   ├── cli/       # @hacienda-cr/cli — `hacienda` binary (citty framework)
│   └── mcp/       # @hacienda-cr/mcp — MCP Server (@modelcontextprotocol/sdk)
├── shared/        # @hacienda-cr/shared — Shared types, constants, enums
├── turbo.json     # Turborepo configuration
├── vitest.workspace.ts
└── pnpm-workspace.yaml
```

### Building Individual Packages

```bash
# Build a single package
pnpm --filter @hacienda-cr/sdk build

# Run tests for a single package
pnpm --filter @hacienda-cr/sdk test

# Run a specific test file
pnpm --filter @hacienda-cr/sdk test clave.spec.ts
```

### Tech Stack

| Tool                        | Purpose                             |
| --------------------------- | ----------------------------------- |
| TypeScript (strict)         | Language                            |
| pnpm workspaces + Turborepo | Monorepo management                 |
| tsup                        | Build (zero-config bundler)         |
| Vitest                      | Testing                             |
| ESLint + Prettier           | Lint and format                     |
| Zod                         | Runtime validation + type inference |
| fast-xml-parser             | XML generation and parsing          |
| citty                       | CLI framework                       |
| @modelcontextprotocol/sdk   | MCP Server framework                |
| xadesjs / xmldsigjs         | XAdES-EPES digital signatures       |

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Run `pnpm test && pnpm lint && pnpm typecheck`
5. Commit and open a pull request

**Conventions:**

- Files: `kebab-case.ts`
- Types/Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

---

## Acknowledgments

This project builds on the pioneering work of the Costa Rica open-source community:

- **[CRLibre/API_Hacienda](https://github.com/CRLibre/API_Hacienda)** — The original open-source API for Costa Rica electronic invoicing (PHP). Their documentation, flow diagrams, and community resources were invaluable references for understanding the Hacienda API. Thank you to the entire CRLibre community for making electronic invoicing accessible to Costa Rican developers. 🇨🇷
- **[CRLibre/fe-hacienda-cr-misc](https://github.com/CRLibre/fe-hacienda-cr-misc)** — Shared resources and documentation for electronic invoicing in Costa Rica.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Powered by <a href="https://dojocoding.io">Dojo Coding</a></strong><br/>
  Open source tools for Costa Rican developers 🇨🇷
</p>
