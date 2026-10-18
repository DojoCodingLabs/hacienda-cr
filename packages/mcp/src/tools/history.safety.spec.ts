import { beforeEach, it, expect, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
const auth = vi.hoisted(() => vi.fn());
vi.mock("./api-client.js", () => ({ createMcpApiClient: auth }));
import { registerGetDocumentTool } from "./document-tools.js";
beforeEach(() => vi.clearAllMocks());
it("a previously cancelled metadata request cannot read profiles or authenticate", async () => {
  type Handler = (
    args: { clave: string; profile: string },
    extra: { signal: AbortSignal },
  ) => Promise<unknown>;
  let handler: Handler | undefined;
  const server = {
    tool: vi.fn((...args: unknown[]) => {
      handler = args.at(-1) as Handler;
    }),
  } as unknown as McpServer;
  registerGetDocumentTool(server);
  if (!handler) throw Error("metadata callback was not registered");
  const result = await handler(
    { clave: "50601012500310123456700100001010000000001100000001", profile: "synthetic" },
    { signal: AbortSignal.abort(new Error("caller-cancelled")) },
  );
  expect(result).toMatchObject({ isError: true });
  expect(JSON.stringify(result)).toContain("caller-cancelled");
  expect(auth).not.toHaveBeenCalled();
});
