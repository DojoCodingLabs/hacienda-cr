import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { HttpClient } from "./http-client.js";
import { submitAndWait } from "./orchestrator.js";
import { TokenManager } from "../auth/token-manager.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { signAndEncode } from "../signing/signer.js";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { createTestP12 } from "../__fixtures__/signing.js";

let server: Server;
let baseUrl: string;
let encoded: string;
let validSigned = false;
let submissions = 0;
let polls = 0;
let redirected = 0;
beforeAll(async () => {
  encoded = await signAndEncode(buildFacturaXml(SIMPLE_INVOICE), createTestP12("local"), "local");
  server = createServer((req, res) => {
    void (async () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/redirect") {
        res.writeHead(302, { Location: baseUrl + "/destination" });
        res.end();
        return;
      }
      if (req.url === "/destination") {
        redirected++;
        res.end("{}");
        return;
      }
      if (req.url === "/token") {
        res.end(
          JSON.stringify({
            access_token: "local-access",
            refresh_token: "local-refresh",
            expires_in: 300,
            refresh_expires_in: 3600,
            token_type: "bearer",
            scope: "",
          }),
        );
        return;
      }
      if (req.headers.authorization !== "Bearer local-access") {
        res.writeHead(401);
        res.end("{}");
        return;
      }
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const data = JSON.parse(body) as { comprobanteXml: string };
        validSigned = (
          await validateDocumentXml(Buffer.from(data.comprobanteXml, "base64").toString("utf8"), {
            requireSignature: true,
          })
        ).valid;
        submissions++;
        res.writeHead(202);
        res.end("{}");
        return;
      }
      polls++;
      res.end(
        JSON.stringify({
          clave: SIMPLE_INVOICE.clave,
          "ind-estado": polls === 1 ? "procesando" : "aceptado",
        }),
      );
    })().catch(() => {
      res.writeHead(500);
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  baseUrl = `http://127.0.0.1:${String(address.port)}`;
}, 20000);
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("offline HTTP lifecycle", () => {
  async function client() {
    const envConfig = {
      name: "Local test",
      apiBaseUrl: baseUrl,
      idpTokenUrl: baseUrl + "/token",
      clientId: "test",
    };
    const tokenManager = new TokenManager({ envConfig });
    await tokenManager.authenticate({ username: "local", password: "test" });
    return new HttpClient({ envConfig, tokenManager, retryOptions: { maxRetries: 0 } });
  }
  it("builds, signs, validates, authenticates, submits once, and polls a real HTTP transport", async () => {
    const result = await submitAndWait(
      await client(),
      {
        clave: SIMPLE_INVOICE.clave,
        fecha: SIMPLE_INVOICE.fechaEmision,
        emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
        comprobanteXml: encoded,
      },
      { pollIntervalMs: 1, timeoutMs: 5000 },
    );
    expect(validSigned).toBe(true);
    expect(submissions).toBe(1);
    expect(result.accepted).toBe(true);
    expect(result.pollAttempts).toBe(2);
  });
  it("blocks redirect following rather than forwarding authenticated requests", async () => {
    await expect((await client()).get("/redirect")).rejects.toThrow("Network error");
    expect(redirected).toBe(0);
  });
});
