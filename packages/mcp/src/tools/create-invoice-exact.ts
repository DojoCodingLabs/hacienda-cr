/**
 * MCP tool: create_invoice_exact
 *
 * Builds a Factura Electronica from bounded decimal-text amounts. It shares
 * the same identity/sequence path as `create_invoice` but never parses a money
 * value as a JSON number and always returns five-decimal XML amounts.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildClave,
  buildDecimalDocumentXml,
  calculateDecimalDocument,
  calculateDecimalInvoiceSummary,
  calculateDecimalLineItemTotals,
  DEFAULT_BRANCH,
  DEFAULT_POS,
  DocumentType,
  sanitizeLogString,
  Situation,
  validateDocumentXml,
} from "@dojocoding/hacienda-sdk";
import {
  DecimalCurrencySchema,
  DecimalDiscountSchema,
  DecimalEmisorSchema,
  DecimalMoneySchema,
  DecimalOtherChargeSchema,
  DecimalQuantitySchema,
  DecimalReceptorSchema,
  DecimalReferenceSchema,
  DecimalTaxInputSchema,
  DocumentTypeCode,
  IdentificacionSchema,
  PaymentMethodSchema,
  SaleConditionSchema,
  UNITS_OF_MEASURE,
} from "@dojocoding/hacienda-shared";
import { nextIssuerSequence } from "./issuer-sequence.js";

const ExactLineItemInputSchema = z
  .object({
    codigoCabys: z
      .string()
      .regex(/^\d{13}$/)
      .describe("CABYS code (13 digits)"),
    cantidad: DecimalQuantitySchema.describe("Positive quantity text, at most 3 decimals"),
    unidadMedida: z.enum(UNITS_OF_MEASURE).describe("Official v4.4 unit of measure"),
    detalle: z.string().min(3).max(200).describe("Item description"),
    precioUnitario: DecimalMoneySchema.describe("Unit price text, at most 5 decimals"),
    esServicio: z.boolean().optional().describe("Service (true) or merchandise (default false)"),
    impuesto: z
      .array(DecimalTaxInputSchema)
      .min(1)
      .max(10)
      .optional()
      .describe("Exact taxes; omitted lines receive a zero-rate IVA entry"),
    descuento: z
      .array(DecimalDiscountSchema)
      .max(5)
      .optional()
      .describe("Exact discount amounts; percentage discounts are not available here"),
  })
  .strict();

export const CreateInvoiceExactInputSchema = z
  .object({
    environment: z.enum(["sandbox", "production"]).default("sandbox"),
    emisor: DecimalEmisorSchema.describe("Invoice issuer"),
    receptor: DecimalReceptorSchema.extend({
      identificacion: IdentificacionSchema.strict(),
    }).describe("Invoice receiver with identification"),
    proveedorSistemas: z
      .string()
      .regex(/^\d{9,12}$/)
      .describe("Invoicing-system provider identification number"),
    codigoActividadEmisor: z
      .string()
      .regex(/^\d{6}$/)
      .describe("Issuer economic activity"),
    condicionVenta: SaleConditionSchema.default("01"),
    medioPago: PaymentMethodSchema.default("01"),
    codigoTipoMoneda: DecimalCurrencySchema.default({ codigoMoneda: "CRC", tipoCambio: "1" }),
    lineItems: z.array(ExactLineItemInputSchema).min(1).max(1000),
    plazoCredito: z.string().optional().describe("Credit days; required for condition 02/10"),
    otrosCargos: z.array(DecimalOtherChargeSchema).max(15).optional(),
    informacionReferencia: z.array(DecimalReferenceSchema).max(10).optional(),
  })
  .strict();

type ExactInput = z.infer<typeof CreateInvoiceExactInputSchema>;

function sourceLines(input: ExactInput) {
  return input.lineItems.map((item, index) => ({
    numeroLinea: index + 1,
    codigoCabys: item.codigoCabys,
    cantidad: item.cantidad,
    unidadMedida: item.unidadMedida,
    detalle: item.detalle,
    precioUnitario: item.precioUnitario,
    ...(item.descuento ? { descuento: item.descuento } : {}),
    impuesto: item.impuesto ?? [
      { codigo: "01" as const, codigoTarifaIVA: "01" as const, tarifa: "0" },
    ],
    esServicio: item.esServicio ?? false,
  }));
}

export function registerCreateInvoiceExactTool(server: McpServer): void {
  server.tool(
    "create_invoice_exact",
    "Create a Factura Electronica using exact decimal-text amounts. " +
      "Rejects JSON numbers, exponent notation, signs, leading zeros and excess precision. " +
      "Calculates taxes and totals with the shared exact kernel and returns unsigned XML.",
    {
      environment: CreateInvoiceExactInputSchema.shape.environment,
      emisor: CreateInvoiceExactInputSchema.shape.emisor,
      receptor: CreateInvoiceExactInputSchema.shape.receptor,
      proveedorSistemas: CreateInvoiceExactInputSchema.shape.proveedorSistemas,
      codigoActividadEmisor: CreateInvoiceExactInputSchema.shape.codigoActividadEmisor,
      condicionVenta: CreateInvoiceExactInputSchema.shape.condicionVenta,
      medioPago: CreateInvoiceExactInputSchema.shape.medioPago,
      codigoTipoMoneda: CreateInvoiceExactInputSchema.shape.codigoTipoMoneda,
      lineItems: CreateInvoiceExactInputSchema.shape.lineItems,
      plazoCredito: CreateInvoiceExactInputSchema.shape.plazoCredito,
      otrosCargos: CreateInvoiceExactInputSchema.shape.otrosCargos,
      informacionReferencia: CreateInvoiceExactInputSchema.shape.informacionReferencia,
    },
    async (raw) => {
      try {
        const args = CreateInvoiceExactInputSchema.parse(raw);
        const lines = sourceLines(args);
        const calculatedLines = lines.map((line) => calculateDecimalLineItemTotals(line));
        const provisionalSummary = calculateDecimalInvoiceSummary(
          calculatedLines,
          args.codigoTipoMoneda,
          undefined,
          args.otrosCargos,
        );
        const now = new Date();
        const taxpayerId = args.emisor.identificacion.numero;
        const docTypeCode = DocumentTypeCode.FACTURA_ELECTRONICA;
        const branch = DEFAULT_BRANCH;
        const pos = DEFAULT_POS;
        const payment = {
          tipoMedioPago: args.medioPago,
          totalMedioPago: provisionalSummary.totalComprobante,
        };
        const provisional = {
          clave: buildClave({
            date: now,
            taxpayerId,
            documentType: DocumentType.FACTURA_ELECTRONICA,
            sequence: 1,
            situation: Situation.NORMAL,
          }),
          proveedorSistemas: args.proveedorSistemas,
          codigoActividadEmisor: args.codigoActividadEmisor,
          numeroConsecutivo: `${branch}${pos}${docTypeCode}${"1".padStart(10, "0")}`,
          fechaEmision: now.toISOString(),
          emisor: args.emisor,
          receptor: args.receptor,
          condicionVenta: args.condicionVenta,
          ...(args.plazoCredito ? { plazoCredito: args.plazoCredito } : {}),
          detalleServicio: lines,
          codigoTipoMoneda: args.codigoTipoMoneda,
          medioPago: [payment],
          ...(args.otrosCargos ? { otrosCargos: args.otrosCargos } : {}),
          ...(args.informacionReferencia
            ? { informacionReferencia: args.informacionReferencia }
            : {}),
        };
        // Validate and calculate before consuming a real sequence.
        calculateDecimalDocument({ ...provisional, tipoDocumento: "01" });

        const allocatedSequence = await nextIssuerSequence(
          args.environment,
          args.emisor.identificacion.tipo,
          taxpayerId,
          docTypeCode,
          branch,
          pos,
        );
        const clave = buildClave({
          date: now,
          taxpayerId,
          documentType: DocumentType.FACTURA_ELECTRONICA,
          sequence: allocatedSequence,
          situation: Situation.NORMAL,
        });
        const seq = String(allocatedSequence).padStart(10, "0");
        const numeroConsecutivo = `${branch}${pos}${docTypeCode}${seq}`;
        const source = { ...provisional, clave, numeroConsecutivo };
        const calculated = calculateDecimalDocument({ ...source, tipoDocumento: "01" });
        const xml = buildDecimalDocumentXml({ ...source, tipoDocumento: "01" });
        const xmlValidation = await validateDocumentXml(xml);
        if (!xmlValidation.valid) throw new Error(xmlValidation.issues.join("; "));

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Factura Electronica (exact) created successfully.",
                "",
                `Clave: ${clave}`,
                `Consecutivo: ${numeroConsecutivo}`,
                `Total: ${calculated.resumenFactura.totalComprobante}`,
                `Tax: ${calculated.resumenFactura.totalImpuesto ?? "0"}`,
                "",
                "--- XML (unsigned) ---",
                xml,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = sanitizeLogString(error instanceof Error ? error.message : String(error));
        return {
          content: [{ type: "text" as const, text: `Error creating exact invoice: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
