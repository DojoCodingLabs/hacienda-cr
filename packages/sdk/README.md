# @hacienda-cr/sdk

Core SDK for Costa Rica electronic invoicing (Hacienda API v4.4).

Provides authentication, XML generation, XAdES-EPES digital signing, tax calculation, and a typed HTTP client for the Ministerio de Hacienda API.

## Installation

```bash
npm install @hacienda-cr/sdk
```

Requires **Node.js 22+** (uses native `fetch` and `crypto.subtle`).

## Quick Start

```ts
import { HaciendaClient, DocumentType, Situation } from "@hacienda-cr/sdk";

const client = new HaciendaClient({
  environment: "sandbox",
  credentials: {
    idType: "02",
    idNumber: "3101234567",
    password: process.env.HACIENDA_PASSWORD!,
  },
});

await client.authenticate();
const token = await client.getAccessToken();
```

## API Reference

### Client

| Export | Type | Description |
|--------|------|-------------|
| `HaciendaClient` | Class | Primary entry point -- orchestrates auth, clave generation |
| `HaciendaClientOptionsSchema` | Zod schema | Validates client constructor options |

### Authentication

| Export | Type | Description |
|--------|------|-------------|
| `TokenManager` | Class | OAuth2 ROPC token lifecycle management |
| `loadCredentials()` | Function | Builds and validates auth credentials |
| `buildUsername()` | Function | Builds the IDP username from cedula type and number |
| `getEnvironmentConfig()` | Function | Returns API/IDP URLs for an environment |
| `Environment` | Enum | `Sandbox`, `Production` |
| `IdType` | Enum | `PersonaFisica`, `PersonaJuridica`, `DIMEX`, `NITE` |

### Clave Numerica

| Export | Type | Description |
|--------|------|-------------|
| `buildClave()` | Function | Builds a 50-digit clave from components |
| `parseClave()` | Function | Parses a 50-digit clave into components |
| `DocumentType` | Enum | Document type codes (`01`-`09`) |
| `Situation` | Enum | Situation codes (`1`-`3`) |

### XML

| Export | Type | Description |
|--------|------|-------------|
| `buildXml()` | Function | Low-level XML builder with namespace support |
| `buildFacturaXml()` | Function | Builds a Factura Electronica XML document |
| `buildTiqueteXml()` | Function | Builds a Tiquete Electronico XML document |
| `buildNotaCreditoXml()` | Function | Builds a Nota de Credito Electronica XML document |
| `buildNotaDebitoXml()` | Function | Builds a Nota de Debito Electronica XML document |
| `buildFacturaCompraXml()` | Function | Builds a Factura Electronica de Compra XML document |
| `buildFacturaExportacionXml()` | Function | Builds a Factura Electronica de Exportacion XML document |
| `buildReciboPagoXml()` | Function | Builds a Recibo Electronico de Pago XML document |
| `buildMensajeReceptorXml()` | Function | Builds a Mensaje Receptor XML document |
| `validateFacturaInput()` | Function | Validates factura data against business rules |

### Tax Calculation

| Export | Type | Description |
|--------|------|-------------|
| `calculateLineItemTotals()` | Function | Computes all totals for a single line item |
| `calculateInvoiceSummary()` | Function | Aggregates all line items into a ResumenFactura |
| `round5()` | Function | Rounds to 5 decimal places (Hacienda requirement) |

### Signing

| Export | Type | Description |
|--------|------|-------------|
| `loadP12()` | Function | Loads a .p12 certificate and extracts keys |
| `signXml()` | Function | Signs XML with XAdES-EPES (returns signed XML string) |
| `signAndEncode()` | Function | Signs XML and Base64-encodes for API submission |

### API Client

| Export | Type | Description |
|--------|------|-------------|
| `HttpClient` | Class | Typed HTTP client with auth header injection |
| `RateLimiter` | Class | Request rate limiter |
| `submitDocument()` | Function | Submits a document (POST /recepcion) |
| `getStatus()` | Function | Gets document status (GET /recepcion/{clave}) |
| `submitAndWait()` | Function | Submits and polls until terminal status |
| `withRetry()` | Function | Wraps an async operation with retry logic |
| `listComprobantes()` | Function | Lists comprobantes with filters |
| `getComprobante()` | Function | Gets full comprobante details by clave |
| `lookupTaxpayer()` | Function | Looks up taxpayer by cedula (public API) |
| `isTerminalStatus()` | Function | Checks if a status is final |
| `extractRejectionReason()` | Function | Extracts rejection reason from response XML |

### Configuration

| Export | Type | Description |
|--------|------|-------------|
| `loadConfig()` | Function | Loads a profile from `~/.hacienda-cr/config.toml` |
| `saveConfig()` | Function | Saves a profile to config |
| `listProfiles()` | Function | Lists all configured profiles |
| `deleteProfile()` | Function | Deletes a profile |
| `getNextSequence()` | Function | Gets and increments the next document sequence |
| `getCurrentSequence()` | Function | Gets the current sequence without incrementing |
| `resetSequence()` | Function | Resets a document sequence to 0 |

### Logging

| Export | Type | Description |
|--------|------|-------------|
| `Logger` | Class | Structured logger with levels and formats |
| `LogLevel` | Enum | `DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT` |
| `noopLogger` | Instance | Logger that suppresses all output |

### Errors

| Export | Type | Description |
|--------|------|-------------|
| `HaciendaError` | Class | Base error class for all SDK errors |
| `ValidationError` | Class | Input validation failures |
| `ApiError` | Class | HTTP/network errors (includes `statusCode`, `responseBody`) |
| `AuthenticationError` | Class | Auth/token lifecycle failures |
| `SigningError` | Class | XAdES-EPES signing failures |
| `HaciendaErrorCode` | Enum | Error category codes |

### Error Codes (API)

| Export | Type | Description |
|--------|------|-------------|
| `HaciendaRejectionCode` | Enum | Hacienda rejection reason codes |
| `REJECTION_CODE_DESCRIPTIONS` | Object | Human-readable rejection descriptions |
| `getRejectionDescription()` | Function | Maps rejection code to description |
| `getHttpStatusDescription()` | Function | Maps HTTP status to description |
| `isRetryableStatus()` | Function | Checks if an HTTP status is retryable |

## Full Documentation

See the [root README](../../README.md) for comprehensive documentation with examples.
