# @dojocoding/hacienda-cli

Command-line tool for Costa Rica electronic invoicing (Hacienda API v4.4).

Provides the `hacienda` command for authenticating, creating, validating, signing, and submitting electronic documents to the Ministerio de Hacienda.

## Installation

```bash
npm install -g @dojocoding/hacienda-cli
```

Requires **Node.js 22+**.

## Commands

All commands support `--json` for machine-readable JSON output.

### `hacienda auth login`

Authenticate with the Hacienda IDP and save the profile to `~/.hacienda-cr/config.toml`.

```bash
export HACIENDA_PASSWORD="your-password"
hacienda auth login --cedula-type 02 --cedula 3101234567 --environment sandbox
```

| Argument        | Description                                       | Default              |
| --------------- | ------------------------------------------------- | -------------------- |
| `--cedula-type` | `01` Fisica, `02` Juridica, `03` DIMEX, `04` NITE | (required)           |
| `--cedula`      | Identification number (9-12 digits)               | (required)           |
| `--password`    | IDP password (prefer `HACIENDA_PASSWORD` env var) | `$HACIENDA_PASSWORD` |
| `--environment` | `sandbox` or `production`                         | `sandbox`            |
| `--profile`     | Profile name                                      | `default`            |

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

| Argument    | Description                                                     | Default                                       |
| ----------- | --------------------------------------------------------------- | --------------------------------------------- |
| `file`      | Path to JSON invoice file                                       | (required)                                    |
| `--dry-run` | Validate and build XML without submitting                       | `false`                                       |
| `--profile` | Saved authentication profile                                    | `default`                                     |
| `--p12`     | Certificate path                                                | `$HACIENDA_P12_PATH`, then profile `p12_path` |
| `--pin`     | Certificate PIN (prefer env var to avoid process-list exposure) | `$HACIENDA_P12_PIN`                           |
| `--json`    | Machine-readable output                                         | `false`                                       |

The dry run needs no credentials or certificate. Real submission requires the
selected profile, `HACIENDA_PASSWORD`, certificate, and PIN. The package's HTTP
client does not automatically retry POST in SDK 0.4.0; GET retains bounded network/5xx retries. After a timeout, network
failure, or duplicate-clave response, query the original clave with
`hacienda status <clave> --profile sandbox --json` before deciding another send.
See the [sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md) for a complete sample.

### `hacienda status <clave>`

Check document processing status by 50-digit clave numerica.

```bash
hacienda status 50601012400310123456700100001010000000001199999999
```

### `hacienda list`

List recent comprobantes from Hacienda.

```bash
hacienda list --limit 50 --offset 0
```

| Argument   | Description       | Default |
| ---------- | ----------------- | ------- |
| `--limit`  | Results per page  | `20`    |
| `--offset` | Pagination offset | `0`     |

### `hacienda get <clave>`

Get full details of a document by its 50-digit clave numerica.

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

| Argument        | Description                                         | Default                 |
| --------------- | --------------------------------------------------- | ----------------------- |
| `--output`      | Output file path                                    | `draft-<template>.json` |
| `--template`    | `factura`, `nota-credito`, `nota-debito`, `tiquete` | `factura`               |
| `--interactive` | Step-by-step prompts                                | `true`                  |

## Environment Variables

| Variable            | Description                       |
| ------------------- | --------------------------------- |
| `HACIENDA_PASSWORD` | IDP password for authentication   |
| `HACIENDA_P12_PIN`  | PIN for the .p12 certificate file |
| `HACIENDA_P12_PATH` | Path to the .p12 certificate file |

## Full Documentation

See the [command reference](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/reference.md#cli--referencia-de-comandos),
[sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md), and
[production integration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md).

## Migrating to 0.4.0

Read the [migration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/packages/sdk/MIGRATION-v4.4.md) before upgrading.
