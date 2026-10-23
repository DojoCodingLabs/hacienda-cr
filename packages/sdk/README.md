# @dojocoding/hacienda-sdk

Core SDK for Costa Rica electronic invoicing (Hacienda API v4.4).

Provides authentication, XML generation, XAdES-EPES digital signing, tax calculation, and a typed HTTP client for the Ministerio de Hacienda API.

## Installation

```bash
npm install @dojocoding/hacienda-sdk
```

Requires **Node.js 22+** (uses native `fetch` and `crypto.subtle`).

## Quick Start

```ts
import { HaciendaClient, Environment, IdType } from "@dojocoding/hacienda-sdk";

const client = new HaciendaClient({
  environment: Environment.Sandbox,
  credentials: {
    idType: IdType.PersonaJuridica,
    idNumber: "3101234567",
    username: process.env.HACIENDA_USERNAME!, // Full issued IDP username.
    password: process.env.HACIENDA_PASSWORD!,
  },
});

await client.authenticate();
const token = await client.getAccessToken();
```

Set `HACIENDA_USERNAME` to the complete username copied from Tico Factura,
including every hyphen and the domain (for example,
`cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr`). `credentials.username`
is sent unchanged and can be used with just `password`; identification fields
are optional in this mode. If supplied, they remain validated taxpayer IDs.
Without `username`, the SDK retains the legacy `buildUsername(idType, idNumber)`
fallback. It cannot infer an issued username from a taxpayer ID.

For a runnable invoice → validation → signing → submission → status workflow,
follow the [sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md) using
[`examples/sandbox.mjs`](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/packages/sdk/examples/sandbox.mjs) and [`examples/order.json`](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/packages/sdk/examples/order.json).
For application architecture, see the [production integration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md).
Review the [v4.4 migration notes](MIGRATION-v4.4.md) before adapting existing inputs.

## API Reference

### Client

| Export                        | Type       | Description                                                |
| ----------------------------- | ---------- | ---------------------------------------------------------- |
| `HaciendaClient`              | Class      | Primary entry point -- orchestrates auth, clave generation |
| `HaciendaClientOptionsSchema` | Zod schema | Validates client constructor options                       |

### Authentication

| Export                   | Type     | Description                                         |
| ------------------------ | -------- | --------------------------------------------------- |
| `TokenManager`           | Class    | OAuth2 ROPC token lifecycle management              |
| `loadCredentials()`      | Function | Builds and validates auth credentials               |
| `buildUsername()`        | Function | Builds the IDP username from cedula type and number |
| `getEnvironmentConfig()` | Function | Returns API/IDP URLs for an environment             |
| `Environment`            | Enum     | `Sandbox`, `Production`                             |
| `IdType`                 | Enum     | `PersonaFisica`, `PersonaJuridica`, `DIMEX`, `NITE` |

### Clave Numerica

| Export         | Type     | Description                             |
| -------------- | -------- | --------------------------------------- |
| `buildClave()` | Function | Builds a 50-digit clave from components |
| `parseClave()` | Function | Parses a 50-digit clave into components |
| `DocumentType` | Enum     | Document type codes (`01`-`09`)         |
| `Situation`    | Enum     | Situation codes (`1`-`3`)               |

### XML

| Export                         | Type     | Description                                                                 |
| ------------------------------ | -------- | --------------------------------------------------------------------------- |
| `buildXml()`                   | Function | Low-level XML builder with namespace support                                |
| `buildFacturaXml()`            | Function | Builds a Factura Electronica XML document                                   |
| `buildTiqueteXml()`            | Function | Builds a Tiquete Electronico XML document                                   |
| `buildNotaCreditoXml()`        | Function | Builds a Nota de Credito Electronica XML document                           |
| `buildNotaDebitoXml()`         | Function | Builds a Nota de Debito Electronica XML document                            |
| `buildFacturaCompraXml()`      | Function | Builds a Factura Electronica de Compra XML document                         |
| `buildFacturaExportacionXml()` | Function | Builds a Factura Electronica de Exportacion XML document                    |
| `buildReciboPagoXml()`         | Function | Builds a Recibo Electronico de Pago XML document                            |
| `buildMensajeReceptorXml()`    | Function | Builds a Mensaje Receptor XML document                                      |
| `validateFacturaInput()`       | Function | Validates factura data against business rules                               |
| `validateDocumentXml()`        | Function | Validates against bundled v4.4 XSD; optionally requires signature structure |

### Tax Calculation

| Export                      | Type     | Description                                       |
| --------------------------- | -------- | ------------------------------------------------- |
| `calculateLineItemTotals()` | Function | Computes all totals for a single line item        |
| `calculateInvoiceSummary()` | Function | Aggregates all line items into a ResumenFactura   |
| `round5()`                  | Function | Rounds to 5 decimal places (Hacienda requirement) |

### Signing

| Export            | Type     | Description                                           |
| ----------------- | -------- | ----------------------------------------------------- |
| `loadP12()`       | Function | Loads a .p12 certificate and extracts keys            |
| `signXml()`       | Function | Signs XML with XAdES-EPES (returns signed XML string) |
| `signAndEncode()` | Function | Signs XML and Base64-encodes for API submission       |

### API Client

| Export                     | Type     | Description                                                  |
| -------------------------- | -------- | ------------------------------------------------------------ |
| `HttpClient`               | Class    | Typed HTTP client with auth header injection                 |
| `bootstrapClient()`        | Function | Creates an authenticated HTTP client from a saved profile    |
| `RateLimiter`              | Class    | Request rate limiter                                         |
| `submitDocument()`         | Function | Submits a document (POST /recepcion)                         |
| `getStatus()`              | Function | Gets document status (GET /recepcion/{clave})                |
| `submitAndWait()`          | Function | Submits and polls until terminal status                      |
| `withRetry()`              | Function | Wraps an async operation with retry logic                    |
| `listComprobantes()`       | Function | Lists one observed metadata page with combined party filters |
| `getComprobante()`         | Function | Gets observed metadata/references by clave (not XML/status)  |
| `lookupTaxpayer()`         | Function | Looks up taxpayer by cedula (public API)                     |
| `isTerminalStatus()`       | Function | Checks if a status is final                                  |
| `extractRejectionReason()` | Function | Extracts rejection reason from response XML                  |

### Configuration

| Export                 | Type     | Description                                       |
| ---------------------- | -------- | ------------------------------------------------- |
| `loadConfig()`         | Function | Loads a profile from `~/.hacienda-cr/config.toml` |
| `saveConfig()`         | Function | Saves a profile to config                         |
| `listProfiles()`       | Function | Lists all configured profiles                     |
| `deleteProfile()`      | Function | Deletes a profile                                 |
| `getNextSequence()`    | Function | Gets and increments the next document sequence    |
| `getCurrentSequence()` | Function | Gets the current sequence without incrementing    |
| `resetSequence()`      | Function | Resets a document sequence to 0                   |

Sequence helpers take `(documentType, branch, pos, options)`; `resetSequence`
takes `(documentType, branch, pos, value, options)`. The local counter key does
not include issuer, profile, or environment. Use `options.configDir` to isolate
local counters, or allocate transactionally in your application's database for
multiple hosts. See [sequence allocation](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md#consecutivos-y-aislamiento-por-empresa).

### Logging

| Export       | Type     | Description                                |
| ------------ | -------- | ------------------------------------------ |
| `Logger`     | Class    | Structured logger with levels and formats  |
| `LogLevel`   | Enum     | `DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT` |
| `noopLogger` | Instance | Logger that suppresses all output          |

### Errors

| Export                | Type  | Description                                                 |
| --------------------- | ----- | ----------------------------------------------------------- |
| `HaciendaError`       | Class | Base error class for all SDK errors                         |
| `ValidationError`     | Class | Input validation failures                                   |
| `ApiError`            | Class | HTTP/network errors (includes `statusCode`, `responseBody`) |
| `AuthenticationError` | Class | Auth/token lifecycle failures                               |
| `SigningError`        | Class | XAdES-EPES signing failures                                 |
| `HaciendaErrorCode`   | Enum  | Error category codes                                        |

### Error Codes (API)

| Export                        | Type     | Description                           |
| ----------------------------- | -------- | ------------------------------------- |
| `HaciendaRejectionCode`       | Enum     | Hacienda rejection reason codes       |
| `REJECTION_CODE_DESCRIPTIONS` | Object   | Human-readable rejection descriptions |
| `getRejectionDescription()`   | Function | Maps rejection code to description    |
| `getHttpStatusDescription()`  | Function | Maps HTTP status to description       |
| `isRetryableStatus()`         | Function | Checks if an HTTP status is retryable |

## Full Documentation

See the [SDK reference](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/reference.md#sdk--documentación-completa),
[sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md), and
[production integration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md).

## Migrating to 0.4.0

See [migration guidance](MIGRATION-v4.4.md) for required provider IDs, strict XSD validation, request deadlines, cancellation, and submission retry behavior.

## Exact decimal ordinary FE (additive)

`calculateExactFe` and `buildExactFacturaXml` accept strict `ExactFeInput`
decimal-string facts for the explicitly named `FE-domestic-ordinary-iva13-v1`
case. They use scaled BigInt and exact decimal XML without Number conversion.
Legacy numeric APIs remain unchanged. This is ordinary IVA13 with completely
allocated payments, not every fiscal regime. See [contract, precision, limits
and independent checks](../../docs/specs/exact-ordinary-fe.md).

History wrappers now follow the documented metadata contract and expose raw observed range headers. See [the explicit migration and limits](../../docs/history-contract.md) before changing a backfill consumer.

Current exact FE credit terms require positive 1–5 digit `plazoCredito` for 02/10,
without changing valid original lexemes. Historical read-only compatibility uses
the explicitly separate `calculateRetainedExactFe`/`RetainedExactFeInputSchema`
contract, never a retained XML/signing builder. See [credit-term rules and
consumer migration](../../docs/exact-fe-credit-terms.md).

### Exact ordinary TE source candidate

The additive `calculateExactTe` / `buildExactTiqueteXml` and shared
`ExactTeInputSchema` preserve decimal text and actual optional receiver data.
They do not fabricate an FE receiver or enable live TE issuance. See the
[contract, scope and verification limits](../../docs/exact-te.md). This source
slice is not a new published version or exact CLI/MCP activation.

### Exact ordinary ND source candidate

`calculateExactNd` / `buildExactNotaDebitoXml` calculate independently supplied
positive FE-reference increments with explicit original-line and reference
binding. They preserve original facts and do not establish original acceptance,
legal-age eligibility or account effects. See [scope and primary rules](../../docs/exact-nd.md).
This additive SDK/shared source slice is not a version bump or live activation.

## Unreleased exact ordinary domestic FEC source

Additive `ExactFecInputSchema` / `calculateExactFec` /
`buildExactFacturaCompraXml` preserve actual supplier Emisor and buyer Receptor,
require buyer-owned 08 identity/activity and explicit supporting evidence, and
calculate ordinary IVA13 decimal strings without Number conversion. This first
case is domestic 01–04 with conditions 01/02; foreign 05, used-goods 06/condition 13
and special tax cases remain separately required. Existing family/legacy APIs
are unchanged. See [exact FEC boundary](../../docs/exact-fec.md)
for independent eligibility/age/response-oracle and release gates.

## Unreleased exact credit extensions

`calculateExactNcPartial` / `buildExactNotaCreditoPartialXml` calculate explicit
correlated credit lines with exact decimal strings. Cumulative remaining credit
is external immutable concurrent ledger authority, not the original-total cap.
The rejected-FE replacement API and reference reason 16 were retired: the
authoritative 2024 schema does not admit code 16, and 2026 is not adopted. See
[source contracts and independent authority/release limits](../../docs/exact-credit-extensions.md).

## Unreleased current FE validation correction

Current exact FE uses native Unicode issuer/receiver/commercial-name bounds and
positive supplied payment allocations; new exact TE shares the positive-payment
contract. Historical 0.6–0.9 source/math and calculated-output decoding remain
separately readable, without a retained builder or authority to issue. See
[current rules, genuine registry evidence and version-bound migration](../../docs/current-fe-native-boundaries.md).

## Unreleased explicit foreign-service IVA13 purchase source

`calculateExactFecForeignServiceIva13` /
`buildExactFacturaCompraForeignServiceIva13Xml` preserve actual supplier 05,
foreign address/reference 16/reason 11 and buyer-owned 08 identity for an explicitly
selected ordinary IVA13 service case. Supplier identity never decides liability
or creditability. Used-goods06/condition 13 and other regimes remain unfinished.
See [source, primary rules and independent gates](../../docs/exact-foreign-service-fec.md).

Exact recipient source contract and remaining transport/outcome gates: [recipient confirmation](../../docs/exact-recipient-message.md).

- Source-only explicit [non-subject personal-used-goods FEC](../../docs/exact-used-personal-goods-fec.md): actual supplier 06/buyer 08, ordinary discounts, exact non-subject amounts; qualification, resale and acceptance remain independent.

### October 2026 v4.4 compatibility

Legal entity IDs accept ten alphanumeric characters throughout identification
and clave generation/parsing. Three-digit special phones such as `911` are
supported. Taxes support amount-only ISC and `datosImpuestoEspecifico`, including
five-decimal alcohol proportions. Mixed-tax calculations include applicable
specific taxes in the IVA base and all net taxes in totals. See the
[migration notes](./MIGRATION-v4.4.md#october-2026-compatibility-updates) for input
examples and compatibility details.
