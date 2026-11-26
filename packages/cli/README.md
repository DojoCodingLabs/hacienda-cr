# @dojocoding/hacienda-cli

Command-line tool for Costa Rica electronic invoicing (Hacienda API v4.4).

Provides the `hacienda` command for authenticating, creating, validating, signing, and submitting electronic documents to the Ministerio de Hacienda.

## Installation

```bash
npm install -g @dojocoding/hacienda-cli
```

Requires **Node.js 22+**.

The CLI installs `node-forge` as its own dependency for PKCS#12 (`.p12`)
loading, so `hacienda sign` and `hacienda submit` work from a default install.
(The SDK alone treats `node-forge` as an optional peer; see the SDK README.)

## Supported Inputs

`lookup` accepts ten-character alphanumeric legal entity IDs. `get` and `status`
accept the resulting 50-character claves, with letters confined to the legal
entity ID portion. JSON document inputs use the SDK's updated phone and tax
fields; see the SDK
[migration notes](../sdk/MIGRATION-v4.4.md).
The interactive draft wizard continues to collect basic IVA lines.

## Commands

All commands support `--json` for machine-readable JSON output.

### `hacienda auth login`

Authenticate with the Hacienda IDP and save the profile to `~/.hacienda-cr/config.toml`.

```bash
# Copy the full issued username, including hyphens and domain.
export HACIENDA_USERNAME="cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr"
export HACIENDA_PASSWORD="your-password"
hacienda auth login --cedula-type 01 --cedula 112345678 --environment sandbox
```

| Argument        | Description                                           | Default              |
| --------------- | ----------------------------------------------------- | -------------------- |
| `--cedula-type` | `01` Fisica, `02` Juridica, `03` DIMEX, `04` NITE     | (required)           |
| `--cedula`      | Taxpayer ID (numeric or legal entity alphanumeric ID) | (required)           |
| `--username`    | Full issued IDP username; saved in profile            | `$HACIENDA_USERNAME` |
| `--password`    | IDP password (prefer `HACIENDA_PASSWORD` env var)     | `$HACIENDA_PASSWORD` |
| `--environment` | `sandbox` or `production`                             | `sandbox`            |
| `--profile`     | Profile name                                          | `default`            |
| `--provider-id` | Invoicing-system provider ID, saved as `provider_id`  | kept from profile    |

`provider_id` is emitted as `ProveedorSistemas`. Anexos y Estructuras v4.4 asks
for the identification of the provider of the invoicing system in use; only a
self-developed or custom-built system uses the issuer's own identification
("En caso de ser un desarrollo propio o comprado a la medida, se deberá indicar
la identificación del mismo obligado tributario"). It accepts 9–20 letters or
digits. Re-running `auth login` without `--provider-id` keeps the stored value.

### `hacienda auth status`

Show current authentication status from the config file.

```bash
hacienda auth status
hacienda auth status --profile production
```

### `hacienda auth switch`

Switch between or list authentication profiles.

```bash
hacienda auth switch               # List available profiles
hacienda auth switch production    # Switch to "production" profile
```

### `hacienda submit <file>`

Submit a Factura Electronica to Hacienda. Reads a complete invoice JSON file,
validates input and XML against the bundled v4.4 XSD, signs, submits, and polls
for a terminal status. This command currently uses the Factura builder; other
document types require the SDK submission flow. It does not accept signed XML
or the simplified `lineItems` input used by MCP.

```bash
hacienda submit invoice.json --dry-run    # Validate and preview XML
hacienda submit invoice.json              # Submit to Hacienda
hacienda submit invoice.json --profile sandbox --p12 cert.p12 --json
```

| Argument             | Description                                                     | Default                                       |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `file`               | Path to JSON invoice file                                       | (required)                                    |
| `--dry-run`          | Validate and build XML without submitting                       | `false`                                       |
| `--profile`          | Saved authentication profile                                    | `default`                                     |
| `--p12`              | Certificate path                                                | `$HACIENDA_P12_PATH`, then profile `p12_path` |
| `--pin`              | Certificate PIN (prefer env var to avoid process-list exposure) | `$HACIENDA_P12_PIN`                           |
| `--json`             | Machine-readable output                                         | `false`                                       |
| `--retry-same-bytes` | Resend the signed bytes stored for an already-attempted clave   | `false`                                       |

The dry run needs no credentials or certificate and writes no state. Real submission requires the
selected profile, `HACIENDA_PASSWORD`, certificate, and PIN. The package's HTTP
client does not automatically retry POST in SDK 0.4.0; GET retains bounded network/5xx retries. After a timeout, network
failure, or duplicate-clave response, query the original clave with
`hacienda status <clave> --profile sandbox --json` before deciding another send.

#### One clave, one set of signed bytes

XAdES embeds a signing time, so signing the same draft twice produces different
bytes under the same clave. `submit` therefore signs a clave only once. The
first run stores the signed XML and its delivery state before the POST, and
records the attempt with the SDK submission-identity guard. Both live under
`~/.hacienda-cr/submissions/<environment>/` (`delivery/` and
`submission-identity/`), so sandbox and production never block each other.
Later runs for the same clave never sign again, and they check local state
before authenticating or making any network call:

| Local state for the clave                       | What `submit` does                                                  | `--json` `code`                |
| ----------------------------------------------- | ------------------------------------------------------------------- | ------------------------------ |
| None                                            | Signs and submits, as before.                                       |                                |
| Signed and stored, no POST recorded             | Sends the stored bytes without signing.                             |                                |
| POST attempted (timeout, lost response, crash)  | Refuses. With `--retry-same-bytes`, resends the exact stored bytes. | `SUBMISSION_ALREADY_ATTEMPTED` |
| The input no longer matches the stored document | Refuses, even with `--retry-same-bytes`.                            | `SUBMISSION_DRAFT_CHANGED`     |
| Accepted, rejected or expired locally           | Refuses.                                                            | `SUBMISSION_FINAL`             |
| POST recorded but signed bytes missing          | Refuses: resending would need new bytes.                            | `SUBMISSION_BYTES_MISSING`     |

Every refusal exits 1 and names the next step: run `hacienda status <clave>`
first. Use `--retry-same-bytes` only when Hacienda has no record of the clave
and you decide to resend; the certificate and PIN are not needed for it. A
correction never reuses the clave: issue a new document with its own
consecutive. A clave with situation digit 2 (contingencia) must carry an
`informacionReferencia` with `codigo` `05` and the provisional comprobante
`numero` (Anexos y Estructuras v4.4, Información de Referencia). Claves
submitted by CLI versions before this guard have no local record, so the guard
cannot protect them.
See the [sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md) for a complete sample.

Before reading the certificate or signing, the command refuses a REP or
MensajeReceptor document with `UNSUPPORTED_FAMILY` (`--json` adds `code`,
`family` and `docsUrl`). See the
[support matrix](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/support-matrix.md).

### `hacienda support`

Print the SDK document-family support matrix (`getFamilySupport()`): what can be
built, validated, signed and submitted, and which real Hacienda evidence exists.
Offline; needs no credentials.

```bash
hacienda support
hacienda support --json
```

### `hacienda status <clave>`

Check document processing status by 50-character clave.

```bash
hacienda status 50601012400310123456700100001010000000001199999999
```

### `hacienda list`

Read one bounded page of observed Hacienda metadata, without status/XML or complete-history claims.

```bash
hacienda list --limit 20 --offset 0 --emisor 02003101234567
```

| Argument     | Description                          | Default |
| ------------ | ------------------------------------ | ------- |
| `--limit`    | Requested page size (1–50 SDK cap)   | `20`    |
| `--offset`   | Requested pagination offset          | `0`     |
| `--emisor`   | Combined domestic issuer type + ID   | —       |
| `--receptor` | Combined domestic receiver type + ID | —       |

### `hacienda get <clave>`

Read document metadata and credit/debit references by its current 50-character clave. Use `hacienda status` separately for status/response observations.

```bash
hacienda get 50601012400310123456700100001010000000001199999999
```

### `hacienda sign <file>`

Sign an XML document with a .p12 certificate (XAdES-EPES).

```bash
hacienda sign invoice.xml --p12 cert.p12 --pin 1234 --output signed.xml
hacienda sign invoice.xml   # Uses HACIENDA_P12_PATH and HACIENDA_P12_PIN env vars
```

| Argument   | Description                                     | Default              |
| ---------- | ----------------------------------------------- | -------------------- |
| `file`     | Path to XML file to sign                        | (required)           |
| `--p12`    | Path to .p12 certificate file                   | `$HACIENDA_P12_PATH` |
| `--pin`    | PIN for the .p12 file                           | `$HACIENDA_P12_PIN`  |
| `--output` | Output path for signed XML (defaults to stdout) | stdout               |

### `hacienda validate <file>`

Validate an invoice file (JSON or XML) against schemas and business rules.

```bash
hacienda validate invoice.json    # JSON: Zod schema + business rules
hacienda validate document.xml    # XML: bundled v4.4 XSD (unsigned drafts allowed)
```

### `hacienda lookup <cedula>`

Look up taxpayer economic activities by cedula. Does not require authentication.

```bash
hacienda lookup 3101234567
```

### `hacienda draft`

Interactively create an invoice JSON draft for submission.

```bash
hacienda draft                                    # Interactive mode
hacienda draft --no-interactive                   # Blank template
hacienda draft --template nota-credito            # Specific document type
hacienda draft --output my-invoice.json           # Custom output path
```

| Argument        | Description                                           | Default                 |
| --------------- | ----------------------------------------------------- | ----------------------- |
| `--output`      | Output file path                                      | `draft-<template>.json` |
| `--template`    | `factura`, `nota-credito`, `nota-debito`, `tiquete`   | `factura`               |
| `--interactive` | Step-by-step prompts                                  | `true`                  |
| `--profile`     | Profile whose `provider_id` fills `proveedorSistemas` | `default`               |

Interactive drafts set `proveedorSistemas` from the profile's `provider_id`.
Without one, they fall back to the issuer's identification and print a warning
on stderr (also returned as `warnings` with `--json`), since that default is
correct only for a self-developed or custom-built system. Blank templates use the
`<<SYSTEM_PROVIDER_ID>>` placeholder.

Interactive drafts store `cantidad` and all monetary fields as bounded decimal
text (at most 3 and 5 decimals respectively). Calculations use the SDK's BigInt
kernel with the Hacienda HALF_UP rule at five decimals, so draft values keep
their exact digits through JSON. Precision above the declared scale is rejected,
never silently rounded. `hacienda submit` and `hacienda validate` accept these
decimal-text drafts; legacy Number invoices continue to use the published
schema and validator.

## Environment Variables

| Variable            | Description                        |
| ------------------- | ---------------------------------- |
| `HACIENDA_USERNAME` | Full issued IDP username for login |
| `HACIENDA_PASSWORD` | IDP password for authentication    |
| `HACIENDA_P12_PIN`  | PIN for the .p12 certificate file  |
| `HACIENDA_P12_PATH` | Path to the .p12 certificate file  |

## Full Documentation

See the [command reference](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/reference.md#cli--referencia-de-comandos),
[sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md), and
[production integration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md).

## Migrating to 0.4.0

Read the [migration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/packages/sdk/MIGRATION-v4.4.md) before upgrading.

See the [history contract migration](../../docs/history-contract.md) for rejected date/legacy filters, exact identifiers and observed-only pagination.
