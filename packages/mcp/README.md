# @dojocoding/hacienda-mcp

MCP (Model Context Protocol) Server for Costa Rica electronic invoicing (Hacienda API v4.4).

Exposes the `@dojocoding/hacienda-sdk` as AI-accessible tools and resources via the Model Context Protocol, allowing AI assistants like Claude Desktop to create invoices, check document status, and look up taxpayer information.

## Installation

```bash
npm install -g @dojocoding/hacienda-mcp
```

Requires **Node.js 22+**.

## Setup

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hacienda-cr": {
      "command": "npx",
      "args": ["-y", "@dojocoding/hacienda-mcp"]
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

### Other MCP Clients

The server uses stdio transport. Start it with:

```bash
npx @dojocoding/hacienda-mcp
# or
hacienda-mcp
```

### Programmatic Usage

```ts
import { createServer } from "@dojocoding/hacienda-mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Authentication and document lifecycle

`lookup_taxpayer`, `draft_invoice`, and `create_invoice` do not need IDP
authentication. `draft_invoice` produces a template with provider and issuer
location placeholders. Complete these and review the activity, CABYS, taxes,
and customer before passing it to `create_invoice`.

`create_invoice` returns **unsigned XML**, its clave, and calculated totals. It
does not sign or submit to Hacienda. It increments the default local sequence
store for document type `01`, branch `001`, POS `00001`; the counter does not
separate issuers or environments. Save the returned XML and clave before
handing them to your backend for validation, signing, submission, and status
tracking. Repeating `create_invoice` allocates a new number and clave.

`check_status`, `list_documents`, and `get_document` need a saved profile and
`HACIENDA_PASSWORD` in the **MCP server process**. First create the profile with
the CLI (using the corresponding password in its environment):

```bash
hacienda auth login --cedula-type 02 --cedula 3101234567 \
  --environment sandbox --profile sandbox
```

Replace the identification with your issuer's. Select `profile: "sandbox"`
when calling these tools; all three default to `"default"`. A desktop client's
server may not inherit your terminal's environment. Use your client's secret
or environment configuration to supply `HACIENDA_PASSWORD` to the server. The
password is not stored by `auth login`; saving a profile alone is insufficient.
Restart the server after updating profiles or credentials because authenticated
clients are cached by profile name.

For a complete SDK handoff, see the [sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md#usar-la-cli-o-mcp-en-el-mismo-flujo).
For multiple companies or application instances, see the
[production integration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md).

## Tools

### `create_invoice`

Create a Factura Electronica (electronic invoice). Automatically computes taxes,
totals, generates the clave numerica, validates input and XSD, and returns
unsigned XML. Local validation does not imply Hacienda acceptance.

**Parameters:**

- `proveedorSistemas` -- Required identification of the invoicing system provider (9–12 digits)
- `emisor` -- Issuer information: name, ID, email, and required `ubicacion` with `provincia`, `canton`, `distrito`, `otrasSenas`; optional `nombreComercial`
- `receptor` -- Receiver information (name, optional ID, optional email)
- `codigoActividadEmisor` -- Issuer economic activity code (6 digits), distinct from each item's 13-digit CABYS code
- `condicionVenta` -- Sale condition code (default: `"01"` = cash)
- `medioPago` -- Single payment-method string (default: `"01"` = cash); emitted with its amount inside `ResumenFactura`
- `lineItems` -- Array of 1–1000 items with `codigoCabys`, `cantidad`, `unidadMedida`, `detalle`, `precioUnitario`, optional `impuesto` (up to 10), `descuento` (up to 5), and `esServicio` (defaults to `false`; set `true` for services)
- `plazoCredito` -- Credit term in days (optional)

`plazoCredito` is a string and is required for credit sales (`condicionVenta: "02"`).
Tax inputs contain `codigo`, `tarifa`, and optional `codigoTarifaIVA`; discount
inputs contain `montoDescuento`, `naturalezaDescuento`, and `codigoDescuento` (defaults to `"01"`). The tool calculates
the resulting amounts.

### `check_status`

Check the processing status of a document by its 50-digit clave numerica.

**Parameters:**

- `clave` -- The 50-digit clave numerica
- `profile` -- Saved profile name (default: `"default"`); requires server password environment

### `list_documents`

Read one observed metadata page, with strict combined domestic party filters. No status/XML, inferred total, next page or completeness claim.

**Parameters:**

- `limit` -- Requested size (1–50 SDK cap, default: 50)
- `offset` -- Pagination offset (default: 0)
- `emisor` -- Combined domestic issuer type + ID (optional)
- `receptor` -- Combined domestic receiver type + ID (optional)
- `profile` -- Saved profile name (default: `"default"`); requires server password environment

### `get_document`

Get observed metadata/references by the current 50-character clave. Use `check_status` separately; this tool does not fetch original XML or status.

**Parameters:**

- `clave` -- The 50-digit clave numerica
- `profile` -- Saved profile name (default: `"default"`); requires server password environment

### `lookup_taxpayer`

Look up a Costa Rica taxpayer by identification number (cedula). Returns name, ID type, and registered economic activities.

**Parameters:**

- `identificacion` -- Taxpayer ID number (9-12 digits)

### `draft_invoice`

Generate a draft invoice template. Fill in `proveedorSistemas` and issuer
location placeholders, review the default CABYS/activity and tax inputs, then
pass the completed JSON to `create_invoice`. It is not the full invoice JSON
accepted by CLI `submit`.

**Parameters:**

- `emisorNombre` -- Issuer name
- `emisorIdTipo` -- Issuer ID type (default: `"02"`)
- `emisorIdNumero` -- Issuer ID number
- `emisorEmail` -- Issuer email
- `receptorNombre` -- Receiver name
- `receptorIdTipo` -- Receiver ID type (optional)
- `receptorIdNumero` -- Receiver ID number (optional)
- `receptorEmail` -- Receiver email (optional)
- `codigoActividadEmisor` -- Activity code (default: `"620100"`)
- `description` -- Default line item description (default: `"Servicio profesional"`)
- `amount` -- Default line item amount (default: `0`)
- `includeIva` -- Include 13% IVA (default: `true`)

## Resources

| URI                                   | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `hacienda://schemas/factura`          | JSON schema for invoice creation input     |
| `hacienda://reference/document-types` | Document types, codes, and descriptions    |
| `hacienda://reference/tax-codes`      | Tax codes, IVA rates, and units of measure |
| `hacienda://reference/id-types`       | Identification types and validation rules  |

## Full Documentation

See the [MCP reference](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/reference.md#mcp-server--integración-con-ia),
[sandbox walkthrough](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/sandbox-guide.md), and
[production integration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs/production-integration.md).

## Migrating to 0.4.0

Read the [migration guide](https://github.com/DojoCodingLabs/hacienda-cr/blob/main/packages/sdk/MIGRATION-v4.4.md) before upgrading.

### Issuer numbering and credential rotation

`create_invoice` accepts `environment` (defaults to `sandbox`) and stores local counters under `issuer-sequences/<environment>/<sha256 identity>/sequences.json` in the configuration directory. The digest covers environment, identification type and identification number. Branch, terminal and document type remain separate counters within that file. This is local-process/file coordination, not a distributed transactional counter.

If an old global `sequences.json` contains positive counters, creating a new unseeded issuer series fails closed. Stop writers, back up the old file, establish the issuer/environment that owns each series, and seed each corresponding scoped file with the last reserved number before resuming. Do not copy a mixed-company global file blindly, delete counters, or restart a production series at one. There is no automatic migration because the old file does not identify its owner.

Authenticated clients are invalidated when the resolved profile, environment, issuer configuration, certificate path, password or PIN changes. Replacing certificate bytes at the same path still requires restarting the process or clearing the cache. Configure one profile per identity/environment.

See the [history contract migration](../../docs/history-contract.md); unsupported keys are rejected before authentication.
