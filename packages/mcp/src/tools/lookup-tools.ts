/**
 * MCP tools: lookup_taxpayer, draft_invoice
 *
 * - lookup_taxpayer: look up taxpayer info by cedula (public API, no auth needed)
 * - draft_invoice: help draft an invoice interactively with sensible defaults
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { lookupTaxpayer } from "@hacienda-cr/sdk";
import { IDENTIFICATION_TYPE_NAMES } from "@hacienda-cr/shared";
import type { IdentificationType } from "@hacienda-cr/shared";

// ---------------------------------------------------------------------------
// lookup_taxpayer
// ---------------------------------------------------------------------------

export function registerLookupTaxpayerTool(server: McpServer): void {
  server.tool(
    "lookup_taxpayer",
    "Look up a Costa Rica taxpayer by their identification number (cedula). " +
      "Returns the taxpayer name, identification type, and registered economic activities. " +
      "Useful for validating a receptor before creating an invoice.",
    {
      identificacion: z
        .string()
        .min(9)
        .max(12)
        .describe("Taxpayer identification number (9-12 digits)"),
    },
    async (args) => {
      try {
        const info = await lookupTaxpayer(args.identificacion);

        const activities =
          info.actividades.length > 0
            ? info.actividades.map((a) => `  - [${a.codigo}] ${a.descripcion} (${a.estado})`)
            : ["  (no activities registered)"];

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Taxpayer Information`,
                ``,
                `Name: ${info.nombre}`,
                `Identification: ${args.identificacion}`,
                `Type: ${info.tipoIdentificacion}`,
                ``,
                `Economic Activities:`,
                ...activities,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error looking up taxpayer: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

// ---------------------------------------------------------------------------
// draft_invoice
// ---------------------------------------------------------------------------

export function registerDraftInvoiceTool(server: McpServer): void {
  server.tool(
    "draft_invoice",
    "Generate a draft invoice template with sensible defaults for Costa Rica electronic invoicing. " +
      "Use this to quickly scaffold an invoice that can then be reviewed and submitted. " +
      "Returns a JSON template that can be passed to create_invoice.",
    {
      emisorNombre: z.string().describe("Issuer (emisor) name"),
      emisorIdTipo: z
        .string()
        .default("02")
        .describe(
          'Issuer ID type: "01"=Fisica, "02"=Juridica, "03"=DIMEX, "04"=NITE. Defaults to "02"',
        ),
      emisorIdNumero: z.string().describe("Issuer identification number"),
      emisorEmail: z.string().describe("Issuer email address"),
      receptorNombre: z.string().describe("Receiver (receptor) name"),
      receptorIdTipo: z
        .string()
        .optional()
        .describe('Receiver ID type (optional): "01"=Fisica, "02"=Juridica, "03"=DIMEX, "04"=NITE'),
      receptorIdNumero: z.string().optional().describe("Receiver identification number (optional)"),
      receptorEmail: z.string().optional().describe("Receiver email address (optional)"),
      codigoActividad: z
        .string()
        .default("620100")
        .describe("CABYS activity code (6 digits). Defaults to 620100 (IT services)"),
      description: z
        .string()
        .default("Servicio profesional")
        .describe("Default line item description"),
      amount: z
        .number()
        .default(0)
        .describe("Default line item amount (price). Set to 0 to leave as placeholder"),
      includeIva: z
        .boolean()
        .default(true)
        .describe("Whether to include 13% IVA tax. Defaults to true"),
    },
    async (args) => {
      // Build the draft template
      const lineItem: Record<string, unknown> = {
        codigoCabys: "8310100000000",
        cantidad: 1,
        unidadMedida: "Sp",
        detalle: args.description,
        precioUnitario: args.amount,
        esServicio: true,
      };

      if (args.includeIva) {
        lineItem.impuesto = [
          {
            codigo: "01",
            codigoTarifa: "08",
            tarifa: 13,
          },
        ];
      }

      const draft: Record<string, unknown> = {
        emisor: {
          nombre: args.emisorNombre,
          identificacion: {
            tipo: args.emisorIdTipo,
            numero: args.emisorIdNumero,
          },
          correoElectronico: args.emisorEmail,
        },
        receptor: {
          nombre: args.receptorNombre,
          ...(args.receptorIdTipo && args.receptorIdNumero
            ? {
                identificacion: {
                  tipo: args.receptorIdTipo,
                  numero: args.receptorIdNumero,
                },
              }
            : {}),
          ...(args.receptorEmail ? { correoElectronico: args.receptorEmail } : {}),
        },
        codigoActividad: args.codigoActividad,
        condicionVenta: "01",
        medioPago: ["01"],
        lineItems: [lineItem],
      };

      const idTypeName =
        IDENTIFICATION_TYPE_NAMES[args.emisorIdTipo as IdentificationType] ?? args.emisorIdTipo;

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Invoice Draft Template`,
              ``,
              `Emisor: ${args.emisorNombre} (${idTypeName}: ${args.emisorIdNumero})`,
              `Receptor: ${args.receptorNombre}`,
              `Activity: ${args.codigoActividad}`,
              `Sale Condition: Contado (cash)`,
              `Payment: Efectivo (cash)`,
              args.includeIva ? `IVA: 13% included` : `IVA: not included`,
              ``,
              `You can pass this JSON to the create_invoice tool:`,
              ``,
              "```json",
              JSON.stringify(draft, null, 2),
              "```",
              ``,
              `Modify the lineItems array to add more items, change quantities,`,
              `prices, descriptions, and tax configuration as needed.`,
            ].join("\n"),
          },
        ],
      };
    },
  );
}
