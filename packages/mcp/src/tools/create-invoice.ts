/**
 * MCP tool: create_invoice
 *
 * Accepts invoice data (emisor, receptor, line items, etc.),
 * validates it with Zod schemas, computes tax totals, builds
 * the Factura Electronica XML via the SDK, and returns it.
 *
 * Signing and submission are not yet implemented — the tool
 * returns the unsigned XML string.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  buildFacturaXml,
  buildClave,
  DocumentType,
  Situation,
  calculateLineItemTotals,
  calculateInvoiceSummary,
  getNextSequence,
  DEFAULT_BRANCH,
  DEFAULT_POS,
} from "@dojocoding/hacienda-sdk";
import type { LineItemInput, CalculatedLineItem } from "@dojocoding/hacienda-sdk";
import type { FacturaElectronica } from "@dojocoding/hacienda-shared";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const ImpuestoInputSchema = z.object({
  codigo: z.string().describe('Tax type code (e.g. "01" for IVA)'),
  codigoTarifa: z.string().optional().describe('IVA rate code (e.g. "08" for 13%)'),
  tarifa: z.number().describe("Tax rate percentage (e.g. 13 for 13%)"),
});

const DescuentoInputSchema = z.object({
  montoDescuento: z.number().positive().describe("Discount amount"),
  naturalezaDescuento: z.string().describe("Reason for discount"),
});

const LineItemInputSchema = z.object({
  codigoCabys: z.string().describe("CABYS code (13 digits)"),
  cantidad: z.number().positive().describe("Quantity"),
  unidadMedida: z.string().describe('Unit of measure (e.g. "Unid", "Sp", "kg")'),
  detalle: z.string().describe("Item description (max 200 chars)"),
  precioUnitario: z.number().min(0).describe("Unit price before taxes"),
  esServicio: z
    .boolean()
    .optional()
    .describe("Whether this is a service (true) or merchandise (false). Defaults to false"),
  impuesto: z.array(ImpuestoInputSchema).optional().describe("Taxes to apply to this line item"),
  descuento: z.array(DescuentoInputSchema).optional().describe("Discounts for this line item"),
});

const IdentificacionInputSchema = z.object({
  tipo: z.string().describe('ID type: "01"=Fisica, "02"=Juridica, "03"=DIMEX, "04"=NITE'),
  numero: z.string().describe("ID number (digits only)"),
});

const EmisorInputSchema = z.object({
  nombre: z.string().describe("Issuer name (max 100 chars)"),
  identificacion: IdentificacionInputSchema.describe("Taxpayer identification"),
  nombreComercial: z.string().optional().describe("Commercial name"),
  correoElectronico: z.string().describe("Email address"),
});

const ReceptorInputSchema = z.object({
  nombre: z.string().describe("Receiver name (max 100 chars)"),
  identificacion: IdentificacionInputSchema.optional().describe("Taxpayer identification"),
  correoElectronico: z.string().optional().describe("Email address"),
});

const CreateInvoiceInputSchema = z.object({
  emisor: EmisorInputSchema.describe("Invoice issuer (emisor)"),
  receptor: ReceptorInputSchema.describe("Invoice receiver (receptor)"),
  codigoActividad: z.string().describe("CABYS activity code (6 digits)"),
  condicionVenta: z
    .string()
    .default("01")
    .describe('Sale condition code: "01"=Cash, "02"=Credit, etc. Defaults to "01"'),
  medioPago: z
    .array(z.string())
    .default(["01"])
    .describe('Payment methods: ["01"]=Cash, ["02"]=Card, etc. Defaults to ["01"]'),
  lineItems: z
    .array(LineItemInputSchema)
    .min(1)
    .describe("Invoice line items (at least one required)"),
  plazoCredito: z
    .string()
    .optional()
    .describe("Credit term in days (required when condicionVenta is 02)"),
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerCreateInvoiceTool(server: McpServer): void {
  server.tool(
    "create_invoice",
    "Create a Factura Electronica (electronic invoice) for Costa Rica. " +
      "Accepts emisor, receptor, and line items. Automatically computes " +
      "taxes, totals, generates the clave numerica, and builds the XML. " +
      "Returns the unsigned XML string.",
    {
      emisor: EmisorInputSchema,
      receptor: ReceptorInputSchema,
      codigoActividad: CreateInvoiceInputSchema.shape.codigoActividad,
      condicionVenta: CreateInvoiceInputSchema.shape.condicionVenta,
      medioPago: CreateInvoiceInputSchema.shape.medioPago,
      lineItems: CreateInvoiceInputSchema.shape.lineItems,
      plazoCredito: CreateInvoiceInputSchema.shape.plazoCredito,
    },
    async (args) => {
      try {
        // 1. Build line items with computed totals
        const lineItemInputs: LineItemInput[] = args.lineItems.map((item, index) => ({
          numeroLinea: index + 1,
          codigoCabys: item.codigoCabys,
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida,
          detalle: item.detalle,
          precioUnitario: item.precioUnitario,
          esServicio: item.esServicio ?? false,
          impuesto: item.impuesto,
          descuento: item.descuento,
        }));

        const calculatedItems: CalculatedLineItem[] = lineItemInputs.map(calculateLineItemTotals);

        // 2. Calculate invoice summary
        const summary = calculateInvoiceSummary(calculatedItems);

        // 3. Get next sequence number and generate clave numerica
        const now = new Date();
        const taxpayerId = args.emisor.identificacion.numero;
        const docTypeCode = "01"; // Factura Electronica
        const branch = DEFAULT_BRANCH; // "001"
        const pos = DEFAULT_POS; // "00001"

        const sequence = await getNextSequence(docTypeCode, branch, pos);

        const clave = buildClave({
          date: now,
          taxpayerId,
          documentType: DocumentType.FACTURA_ELECTRONICA,
          sequence,
          situation: Situation.NORMAL,
        });

        // 4. Build consecutive number (branch + POS + doc type + sequence)
        const seq = String(sequence).padStart(10, "0");
        const numeroConsecutivo = `${branch}${pos}${docTypeCode}${seq}`;

        // 5. Format emission date
        const fechaEmision = now.toISOString();

        // 6. Map calculated items to the FacturaElectronica line item format
        const detalleServicio = calculatedItems.map((item) => ({
          ...item,
          unidadMedida:
            item.unidadMedida as FacturaElectronica["detalleServicio"][0]["unidadMedida"],
        }));

        // 7. Assemble the full factura input
        const factura: FacturaElectronica = {
          clave,
          codigoActividad: args.codigoActividad,
          numeroConsecutivo,
          fechaEmision,
          emisor: {
            nombre: args.emisor.nombre,
            identificacion: {
              tipo: args.emisor.identificacion
                .tipo as FacturaElectronica["emisor"]["identificacion"]["tipo"],
              numero: args.emisor.identificacion.numero,
            },
            ...(args.emisor.nombreComercial
              ? { nombreComercial: args.emisor.nombreComercial }
              : {}),
            correoElectronico: args.emisor.correoElectronico,
          },
          receptor: {
            nombre: args.receptor.nombre,
            ...(args.receptor.identificacion
              ? {
                  identificacion: {
                    tipo: args.receptor.identificacion
                      .tipo as FacturaElectronica["emisor"]["identificacion"]["tipo"],
                    numero: args.receptor.identificacion.numero,
                  },
                }
              : {}),
            ...(args.receptor.correoElectronico
              ? { correoElectronico: args.receptor.correoElectronico }
              : {}),
          },
          condicionVenta: args.condicionVenta as FacturaElectronica["condicionVenta"],
          ...(args.plazoCredito ? { plazoCredito: args.plazoCredito } : {}),
          medioPago: args.medioPago as FacturaElectronica["medioPago"],
          detalleServicio,
          resumenFactura: {
            totalServGravados: summary.totalServGravados,
            totalServExentos: summary.totalServExentos,
            ...(summary.totalServExonerado > 0
              ? { totalServExonerado: summary.totalServExonerado }
              : {}),
            totalMercanciasGravadas: summary.totalMercanciasGravadas,
            totalMercanciasExentas: summary.totalMercanciasExentas,
            ...(summary.totalMercExonerada > 0
              ? { totalMercExonerada: summary.totalMercExonerada }
              : {}),
            totalGravado: summary.totalGravado,
            totalExento: summary.totalExento,
            ...(summary.totalExonerado > 0 ? { totalExonerado: summary.totalExonerado } : {}),
            totalVenta: summary.totalVenta,
            totalDescuentos: summary.totalDescuentos,
            totalVentaNeta: summary.totalVentaNeta,
            totalImpuesto: summary.totalImpuesto,
            totalComprobante: summary.totalComprobante,
          },
        };

        // 8. Build the XML
        const xml = buildFacturaXml(factura);

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Factura Electronica created successfully.`,
                ``,
                `Clave: ${clave}`,
                `Consecutivo: ${numeroConsecutivo}`,
                `Total: ${summary.totalComprobante}`,
                `Tax: ${summary.totalImpuesto}`,
                ``,
                `--- XML (unsigned) ---`,
                xml,
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
              text: `Error creating invoice: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
