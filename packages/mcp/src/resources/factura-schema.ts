/**
 * MCP resource: hacienda://schemas/factura
 *
 * Exposes the Factura Electronica JSON schema as a readable resource
 * for AI assistants to understand the invoice structure.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const FACTURA_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Factura Electronica (Costa Rica)",
  description:
    "Schema for creating a Factura Electronica via the create_invoice tool. " +
    "This describes the input format accepted by the tool.",
  type: "object",
  required: ["emisor", "receptor", "codigoActividadEmisor", "lineItems"],
  properties: {
    emisor: {
      type: "object",
      description: "Invoice issuer (emisor) information",
      required: ["nombre", "identificacion", "ubicacion", "correoElectronico"],
      properties: {
        nombre: {
          type: "string",
          maxLength: 100,
          description: "Issuer name (Nombre o Razon Social)",
        },
        identificacion: {
          type: "object",
          required: ["tipo", "numero"],
          properties: {
            tipo: {
              type: "string",
              enum: ["01", "02", "03", "04", "05", "06"],
              description:
                "01=Cedula Fisica, 02=Cedula Juridica, 03=DIMEX, 04=NITE, 05=Extranjero No Domiciliado, 06=No Contribuyente (05/06 new in v4.4)",
            },
            numero: {
              type: "string",
              pattern: "^\\d{9,12}$",
              description: "Identification number (9-12 digits)",
            },
          },
        },
        nombreComercial: {
          type: "string",
          maxLength: 80,
          description: "Commercial name (optional)",
        },
        ubicacion: {
          type: "object",
          required: ["provincia", "canton", "distrito", "otrasSenas"],
          description: "Issuer location (required by the v4.4 schemas)",
          properties: {
            provincia: { type: "string", pattern: "^[1-7]$", description: "Province code (1-7)" },
            canton: { type: "string", pattern: "^\\d{2}$", description: "Canton code (2 digits)" },
            distrito: {
              type: "string",
              pattern: "^\\d{2}$",
              description: "District code (2 digits)",
            },
            barrio: {
              type: "string",
              minLength: 5,
              maxLength: 50,
              description: "Barrio name (free text 5-50 chars in v4.4; no longer a 2-digit code)",
            },
            otrasSenas: {
              type: "string",
              minLength: 5,
              maxLength: 250,
              description: "Address details (5-250 chars, required)",
            },
          },
        },
        correoElectronico: {
          type: "string",
          format: "email",
          description: "Email address",
        },
      },
    },
    receptor: {
      type: "object",
      description: "Invoice receiver (receptor) information",
      required: ["nombre"],
      properties: {
        nombre: {
          type: "string",
          maxLength: 100,
          description: "Receiver name",
        },
        identificacion: {
          type: "object",
          properties: {
            tipo: {
              type: "string",
              enum: ["01", "02", "03", "04"],
              description: "Identification type code",
            },
            numero: {
              type: "string",
              description: "Identification number",
            },
          },
        },
        correoElectronico: {
          type: "string",
          format: "email",
          description: "Email address (optional)",
        },
      },
    },
    proveedorSistemas: {
      type: "string",
      maxLength: 20,
      description:
        "Invoicing-system provider ID (v4.4 ProveedorSistemas). Defaults to the emisor's ID number",
    },
    codigoActividadEmisor: {
      type: "string",
      pattern: "^\\d{6}$",
      description: "Issuer economic activity code (6 digits, v4.4 CodigoActividadEmisor)",
    },
    condicionVenta: {
      type: "string",
      enum: ["01", "02", "03", "04", "05", "06", "07", "08", "10", "12", "13", "14", "15", "99"],
      default: "01",
      description:
        "Sale condition (v4.4): 01=Cash, 02=Credit, 03=Consignment, 04=Layaway, 99=Other",
    },
    medioPago: {
      type: "string",
      enum: ["01", "02", "03", "04", "05", "06", "07", "99"],
      default: "01",
      description:
        "Payment method (v4.4, emitted inside ResumenFactura with the total): 01=Cash, 02=Card, 03=Check, 04=Transfer, 05=Third-party, 06=SINPE Movil, 07=Digital platform, 99=Other",
    },
    plazoCredito: {
      type: "string",
      description: "Credit term in days (required when condicionVenta=02)",
    },
    lineItems: {
      type: "array",
      minItems: 1,
      description: "Invoice line items",
      items: {
        type: "object",
        required: ["codigoCabys", "cantidad", "unidadMedida", "detalle", "precioUnitario"],
        properties: {
          codigoCabys: {
            type: "string",
            pattern: "^\\d{13}$",
            description: "CABYS product/service code (13 digits)",
          },
          cantidad: {
            type: "number",
            minimum: 0,
            exclusiveMinimum: true,
            description: "Quantity",
          },
          unidadMedida: {
            type: "string",
            description:
              'Unit of measure (official v4.4 catalog casing): "Sp"=Service, "Unid"=Unit, "Kg"=Kilogram, "M"=Meter, "L"=Liter, "h"=Hour, etc.',
          },
          detalle: {
            type: "string",
            maxLength: 200,
            description: "Item description",
          },
          precioUnitario: {
            type: "number",
            minimum: 0,
            description: "Unit price before taxes",
          },
          esServicio: {
            type: "boolean",
            default: false,
            description: "true=service, false=merchandise",
          },
          impuesto: {
            type: "array",
            description: "Taxes to apply",
            items: {
              type: "object",
              required: ["codigo", "tarifa"],
              properties: {
                codigo: {
                  type: "string",
                  description: "Tax code: 01=IVA, 02=Selective, etc.",
                },
                codigoTarifaIVA: {
                  type: "string",
                  description:
                    "IVA rate code (v4.4 CodigoTarifaIVA): 01=0%, 02=1%, 03=2%, 04=4%, 08=13%, 09=0.5%, 10=exempt, 11=0% without credit",
                },
                tarifa: {
                  type: "number",
                  description: "Tax rate percentage (e.g. 13 for 13%)",
                },
              },
            },
          },
          descuento: {
            type: "array",
            description: "Discounts",
            items: {
              type: "object",
              required: ["montoDescuento", "codigoDescuento"],
              properties: {
                montoDescuento: {
                  type: "number",
                  description: "Discount amount",
                },
                codigoDescuento: {
                  type: "string",
                  description: 'Discount code (v4.4 CodigoDescuento, "01".."09" or "99")',
                },
                naturalezaDescuento: {
                  type: "string",
                  description: "Reason for discount (optional in v4.4)",
                },
              },
            },
          },
        },
      },
    },
  },
};

export function registerFacturaSchemaResource(server: McpServer): void {
  server.resource(
    "factura-schema",
    "hacienda://schemas/factura",
    {
      description:
        "JSON Schema for the Factura Electronica (electronic invoice) input format. " +
        "Use this to understand the required fields and structure for creating invoices.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "hacienda://schemas/factura",
          mimeType: "application/json",
          text: JSON.stringify(FACTURA_SCHEMA, null, 2),
        },
      ],
    }),
  );
}
