/**
 * MCP resource: hacienda://reference/document-types
 *
 * Lists all Hacienda v4.4 electronic document types with their codes
 * and descriptions for AI assistant reference.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  DocumentTypeCode,
  DOCUMENT_TYPE_NAMES,
  SituationCode,
  MensajeReceptorCode,
  SALE_CONDITION_NAMES,
  PAYMENT_METHOD_NAMES,
} from "@dojocoding/hacienda-shared";

const REFERENCE_DATA = {
  documentTypes: Object.entries(DOCUMENT_TYPE_NAMES).map(([code, name]) => ({
    code,
    name,
    description: getDocTypeDescription(code),
  })),
  situationCodes: [
    { code: SituationCode.NORMAL, name: "Normal", description: "Standard submission" },
    {
      code: SituationCode.CONTINGENCIA,
      name: "Contingencia",
      description: "Contingency mode (system issues)",
    },
    {
      code: SituationCode.SIN_INTERNET,
      name: "Sin Internet",
      description: "No internet connection at time of sale",
    },
  ],
  mensajeReceptorCodes: [
    {
      code: MensajeReceptorCode.ACEPTADO,
      name: "Aceptado totalmente",
      description: "Fully accepted",
    },
    {
      code: MensajeReceptorCode.ACEPTADO_PARCIALMENTE,
      name: "Aceptado parcialmente",
      description: "Partially accepted",
    },
    { code: MensajeReceptorCode.RECHAZADO, name: "Rechazado", description: "Rejected" },
  ],
  saleConditions: Object.entries(SALE_CONDITION_NAMES).map(([code, name]) => ({
    code,
    name,
  })),
  paymentMethods: Object.entries(PAYMENT_METHOD_NAMES).map(([code, name]) => ({
    code,
    name,
  })),
};

function getDocTypeDescription(code: string): string {
  switch (code) {
    case DocumentTypeCode.FACTURA_ELECTRONICA:
      return "Standard electronic invoice. Requires receptor. Most common document type.";
    case DocumentTypeCode.NOTA_DEBITO_ELECTRONICA:
      return "Electronic debit note. References an existing invoice to add charges.";
    case DocumentTypeCode.NOTA_CREDITO_ELECTRONICA:
      return "Electronic credit note. References an existing invoice to apply credits/returns.";
    case DocumentTypeCode.TIQUETE_ELECTRONICO:
      return "Simplified electronic receipt. Receptor is optional. For consumers (B2C).";
    case DocumentTypeCode.FACTURA_ELECTRONICA_COMPRA:
      return "Purchase invoice. Issued when buying from unregistered suppliers.";
    case DocumentTypeCode.FACTURA_ELECTRONICA_EXPORTACION:
      return "Export invoice. For international sales. Receptor may use foreign ID.";
    case DocumentTypeCode.RECIBO_ELECTRONICO_PAGO:
      return "Electronic payment receipt. New in v4.4.";
    default:
      return "Document type.";
  }
}

export function registerDocumentTypesResource(server: McpServer): void {
  server.resource(
    "document-types",
    "hacienda://reference/document-types",
    {
      description:
        "Reference data for Costa Rica electronic document types, situation codes, " +
        "receiver message codes, sale conditions, and payment methods.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "hacienda://reference/document-types",
          mimeType: "application/json",
          text: JSON.stringify(REFERENCE_DATA, null, 2),
        },
      ],
    }),
  );
}
