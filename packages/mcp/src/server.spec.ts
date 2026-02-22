/**
 * Tests for the MCP server setup and tool/resource registration.
 *
 * Uses the MCP Client + in-memory transport to exercise the full
 * MCP protocol flow (initialize, list tools, list resources, call tools, read resources).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { createServer } from "./server.js";
import { createLinkedTransports } from "./testing/in-memory-transport.js";

/**
 * Helper: extract text content from the first content block of a tool result.
 */
function getTextContent(content: { type: string; text?: string }[]): string {
  const first = content[0];
  expect(first).toBeDefined();
  expect(first?.type).toBe("text");
  return (first as { type: string; text: string }).text;
}

/**
 * Helper: read a resource and parse its JSON text content.
 */
async function readJsonResource(client: Client, uri: string): Promise<unknown> {
  const result = await client.readResource({ uri });
  expect(result.contents).toHaveLength(1);
  const content = result.contents[0];
  expect(content).toBeDefined();
  expect(content?.mimeType).toBe("application/json");
  return JSON.parse(content?.text as string);
}

describe("MCP Server", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = createLinkedTransports();

    client = new Client({ name: "test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  // -------------------------------------------------------------------------
  // Server initialization
  // -------------------------------------------------------------------------

  describe("initialization", () => {
    it("should create a server via createServer()", () => {
      const server = createServer();
      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Tools listing
  // -------------------------------------------------------------------------

  describe("tools", () => {
    it("should list all registered tools", async () => {
      const { tools } = await client.listTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("create_invoice");
      expect(toolNames).toContain("check_status");
      expect(toolNames).toContain("list_documents");
      expect(toolNames).toContain("get_document");
      expect(toolNames).toContain("lookup_taxpayer");
      expect(toolNames).toContain("draft_invoice");
      expect(tools.length).toBe(6);
    });

    it("should have descriptions for all tools", async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(String(tool.description ?? "").length).toBeGreaterThan(10);
      }
    });

    it("should have input schemas for all tools", async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });
  });

  // -------------------------------------------------------------------------
  // Resources listing
  // -------------------------------------------------------------------------

  describe("resources", () => {
    it("should list all registered resources", async () => {
      const { resources } = await client.listResources();
      const uris = resources.map((r) => r.uri);

      expect(uris).toContain("hacienda://schemas/factura");
      expect(uris).toContain("hacienda://reference/document-types");
      expect(uris).toContain("hacienda://reference/tax-codes");
      expect(uris).toContain("hacienda://reference/id-types");
      expect(resources.length).toBe(4);
    });

    it("should have descriptions for all resources", async () => {
      const { resources } = await client.listResources();
      for (const resource of resources) {
        expect(resource.description).toBeDefined();
        expect(String(resource.description ?? "").length).toBeGreaterThan(10);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Tool: create_invoice
  // -------------------------------------------------------------------------

  describe("create_invoice", () => {
    it("should create an invoice and return XML", async () => {
      const result = await client.callTool({
        name: "create_invoice",
        arguments: {
          emisor: {
            nombre: "Empresa de Prueba S.A.",
            identificacion: {
              tipo: "02",
              numero: "3101234567",
            },
            correoElectronico: "test@empresa.com",
          },
          receptor: {
            nombre: "Cliente de Prueba",
            identificacion: {
              tipo: "01",
              numero: "101230456",
            },
          },
          codigoActividad: "620100",
          lineItems: [
            {
              codigoCabys: "8310100000000",
              cantidad: 1,
              unidadMedida: "Sp",
              detalle: "Servicio de consultoria",
              precioUnitario: 100000,
              esServicio: true,
              impuesto: [
                {
                  codigo: "01",
                  codigoTarifa: "08",
                  tarifa: 13,
                },
              ],
            },
          ],
        },
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);

      const text = getTextContent(result.content as { type: string; text: string }[]);
      expect(text).toContain("Factura Electronica created successfully");
      expect(text).toContain("Clave:");
      expect(text).toContain("Consecutivo:");
      expect(text).toContain("Total: 113000");
      expect(text).toContain("Tax: 13000");
      expect(text).toContain("<?xml");
      expect(text).toContain("FacturaElectronica");
    });

    it("should return error for missing required fields", async () => {
      const result = await client.callTool({
        name: "create_invoice",
        arguments: {
          emisor: {
            nombre: "Test",
            identificacion: { tipo: "02", numero: "3101234567" },
            correoElectronico: "test@test.com",
          },
          receptor: { nombre: "Receiver" },
          codigoActividad: "620100",
          lineItems: [],
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Tool: check_status
  // -------------------------------------------------------------------------

  describe("check_status", () => {
    it("should return status info for a valid clave", async () => {
      // Build a valid 50-digit clave
      const clave = "50601012500310123456700100001010000000001100000001";

      const result = await client.callTool({
        name: "check_status",
        arguments: { clave },
      });

      expect(result.isError).toBeFalsy();
      const text = getTextContent(result.content as { type: string; text: string }[]);
      expect(text).toContain("Document Status");
      expect(text).toContain("placeholder");
    });

    it("should return error for invalid clave", async () => {
      const result = await client.callTool({
        name: "check_status",
        arguments: { clave: "12345" },
      });

      expect(result.isError).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Tool: list_documents
  // -------------------------------------------------------------------------

  describe("list_documents", () => {
    it("should return a placeholder list", async () => {
      const result = await client.callTool({
        name: "list_documents",
        arguments: { limit: 5 },
      });

      expect(result.isError).toBeFalsy();
      const text = getTextContent(result.content as { type: string; text: string }[]);
      expect(text).toContain("Document List");
      expect(text).toContain("Limit: 5");
      expect(text).toContain("placeholder");
    });
  });

  // -------------------------------------------------------------------------
  // Tool: get_document
  // -------------------------------------------------------------------------

  describe("get_document", () => {
    it("should return document details for a valid clave", async () => {
      const clave = "50601012500310123456700100001010000000001100000001";

      const result = await client.callTool({
        name: "get_document",
        arguments: { clave },
      });

      expect(result.isError).toBeFalsy();
      const text = getTextContent(result.content as { type: string; text: string }[]);
      expect(text).toContain("Document Details");
      expect(text).toContain("placeholder");
    });
  });

  // -------------------------------------------------------------------------
  // Tool: lookup_taxpayer
  // -------------------------------------------------------------------------

  describe("lookup_taxpayer", () => {
    it("should return taxpayer info placeholder", async () => {
      const result = await client.callTool({
        name: "lookup_taxpayer",
        arguments: { identificacion: "3101234567" },
      });

      expect(result.isError).toBeFalsy();
      const text = getTextContent(result.content as { type: string; text: string }[]);
      expect(text).toContain("Taxpayer Lookup");
      expect(text).toContain("3101234567");
      expect(text).toContain("02 - Cedula Juridica");
    });
  });

  // -------------------------------------------------------------------------
  // Tool: draft_invoice
  // -------------------------------------------------------------------------

  describe("draft_invoice", () => {
    it("should return a draft invoice template", async () => {
      const result = await client.callTool({
        name: "draft_invoice",
        arguments: {
          emisorNombre: "Mi Empresa S.A.",
          emisorIdNumero: "3101234567",
          emisorEmail: "info@miempresa.com",
          receptorNombre: "Cliente Test",
          amount: 50000,
        },
      });

      expect(result.isError).toBeFalsy();
      const text = getTextContent(result.content as { type: string; text: string }[]);
      expect(text).toContain("Invoice Draft Template");
      expect(text).toContain("Mi Empresa S.A.");
      expect(text).toContain("Cliente Test");
      expect(text).toContain("create_invoice");
      // Should contain JSON
      expect(text).toContain('"emisor"');
      expect(text).toContain('"receptor"');
      expect(text).toContain('"lineItems"');
    });
  });

  // -------------------------------------------------------------------------
  // Resource: factura schema
  // -------------------------------------------------------------------------

  describe("resource: factura-schema", () => {
    it("should return a JSON schema for Factura Electronica", async () => {
      const schema = (await readJsonResource(client, "hacienda://schemas/factura")) as Record<
        string,
        unknown
      >;

      expect(schema.title).toContain("Factura Electronica");
      expect(schema.properties).toBeDefined();
      const props = schema.properties as Record<string, unknown>;
      expect(props.emisor).toBeDefined();
      expect(props.receptor).toBeDefined();
      expect(props.lineItems).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Resource: document-types
  // -------------------------------------------------------------------------

  describe("resource: document-types", () => {
    it("should return document type reference data", async () => {
      const data = (await readJsonResource(
        client,
        "hacienda://reference/document-types",
      )) as Record<string, unknown>;

      expect(data.documentTypes).toBeDefined();
      const docTypes = data.documentTypes as {
        code: string;
        name: string;
      }[];
      expect(docTypes.length).toBeGreaterThan(0);
      expect(data.saleConditions).toBeDefined();
      expect(data.paymentMethods).toBeDefined();

      // Check for Factura Electronica
      const factura = docTypes.find((dt) => dt.code === "01");
      expect(factura).toBeDefined();
      expect(factura?.name).toContain("Factura");
    });
  });

  // -------------------------------------------------------------------------
  // Resource: tax-codes
  // -------------------------------------------------------------------------

  describe("resource: tax-codes", () => {
    it("should return tax code reference data", async () => {
      const data = (await readJsonResource(client, "hacienda://reference/tax-codes")) as Record<
        string,
        unknown
      >;

      expect(data.taxCodes).toBeDefined();
      expect(data.ivaRateCodes).toBeDefined();
      expect(data.exonerationTypes).toBeDefined();
      expect(data.commonUnitsOfMeasure).toBeDefined();

      // Check IVA code exists
      const taxCodes = data.taxCodes as {
        code: string;
        name: string;
      }[];
      const iva = taxCodes.find((tc) => tc.code === "01");
      expect(iva).toBeDefined();
      expect(iva?.name).toBe("IVA");

      // Check 13% rate exists
      const rateCodes = data.ivaRateCodes as {
        code: string;
        rate: number;
      }[];
      const rate13 = rateCodes.find((r) => r.code === "08");
      expect(rate13).toBeDefined();
      expect(rate13?.rate).toBe(13);
    });
  });

  // -------------------------------------------------------------------------
  // Resource: id-types
  // -------------------------------------------------------------------------

  describe("resource: id-types", () => {
    it("should return identification type reference data", async () => {
      const data = (await readJsonResource(client, "hacienda://reference/id-types")) as Record<
        string,
        unknown
      >;

      expect(data.identificationTypes).toBeDefined();
      const idTypes = data.identificationTypes as {
        code: string;
        name: string;
        lengths: number[];
      }[];
      expect(idTypes.length).toBe(4);

      // Check Cedula Fisica
      const fisica = idTypes.find((it) => it.code === "01");
      expect(fisica).toBeDefined();
      expect(fisica?.name).toContain("sica");
      expect(fisica?.lengths).toContain(9);
    });
  });
});
