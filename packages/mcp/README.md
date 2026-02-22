# @hacienda-cr/mcp

MCP (Model Context Protocol) Server for Costa Rica electronic invoicing (Hacienda API v4.4).

Exposes the `@hacienda-cr/sdk` as AI-accessible tools and resources via the Model Context Protocol, allowing AI assistants like Claude Desktop to create invoices, check document status, and look up taxpayer information.

## Installation

```bash
npm install -g @hacienda-cr/mcp
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

### Other MCP Clients

The server uses stdio transport. Start it with:

```bash
npx @hacienda-cr/mcp
# or
hacienda-mcp
```

### Programmatic Usage

```ts
import { createServer } from "@hacienda-cr/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Tools

### `create_invoice`

Create a Factura Electronica (electronic invoice). Accepts emisor, receptor, and line items. Automatically computes taxes, totals, generates the clave numerica, and builds the XML.

**Parameters:**

- `emisor` -- Issuer information (name, ID, email)
- `receptor` -- Receiver information (name, optional ID, optional email)
- `codigoActividad` -- CABYS activity code (6 digits)
- `condicionVenta` -- Sale condition code (default: `"01"` = cash)
- `medioPago` -- Payment methods array (default: `["01"]` = cash)
- `lineItems` -- Array of line items with CABYS code, quantity, unit, description, price, and optional tax/discount
- `plazoCredito` -- Credit term in days (optional)

### `check_status`

Check the processing status of a document by its 50-digit clave numerica.

**Parameters:**

- `clave` -- The 50-digit clave numerica

### `list_documents`

List recent electronic documents with optional filters.

**Parameters:**

- `limit` -- Max results (1-100, default: 10)
- `offset` -- Pagination offset (default: 0)
- `emisorIdentificacion` -- Filter by issuer ID (optional)
- `receptorIdentificacion` -- Filter by receiver ID (optional)
- `fechaDesde` -- Start date filter, ISO 8601 (optional)
- `fechaHasta` -- End date filter, ISO 8601 (optional)

### `get_document`

Get full details of an electronic document by its 50-digit clave numerica.

**Parameters:**

- `clave` -- The 50-digit clave numerica

### `lookup_taxpayer`

Look up a Costa Rica taxpayer by identification number (cedula). Returns name, ID type, and registered economic activities.

**Parameters:**

- `identificacion` -- Taxpayer ID number (9-12 digits)

### `draft_invoice`

Generate a draft invoice template with sensible defaults. Returns JSON that can be passed to `create_invoice`.

**Parameters:**

- `emisorNombre` -- Issuer name
- `emisorIdTipo` -- Issuer ID type (default: `"02"`)
- `emisorIdNumero` -- Issuer ID number
- `emisorEmail` -- Issuer email
- `receptorNombre` -- Receiver name
- `receptorIdTipo` -- Receiver ID type (optional)
- `receptorIdNumero` -- Receiver ID number (optional)
- `receptorEmail` -- Receiver email (optional)
- `codigoActividad` -- Activity code (default: `"620100"`)
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

See the [root README](../../README.md) for comprehensive documentation with examples.
