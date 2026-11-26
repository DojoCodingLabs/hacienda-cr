/**
 * MCP Resource: Document-family support matrix.
 *
 * Exposes the SDK `getFamilySupport()` matrix so an MCP client knows which
 * families can be built, signed and submitted. This server has no signing or
 * submission tool; REP and MensajeReceptor submission is refused by the SDK.
 *
 * @module resources/family-support
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFamilySupport, SUPPORT_MATRIX_URL } from "@dojocoding/hacienda-sdk";

export const FAMILY_SUPPORT_URI = "hacienda://reference/family-support";

export function registerFamilySupportResource(server: McpServer): void {
  server.resource(
    "family-support",
    FAMILY_SUPPORT_URI,
    {
      description:
        "Document-family support matrix: build, XSD, signing and submit status plus real " +
        "Hacienda evidence per family. REP and MensajeReceptor submission is refused.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: FAMILY_SUPPORT_URI,
          mimeType: "application/json",
          text: JSON.stringify(
            { docsUrl: SUPPORT_MATRIX_URL, families: getFamilySupport() },
            null,
            2,
          ),
        },
      ],
    }),
  );
}
