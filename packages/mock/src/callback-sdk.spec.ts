/**
 * Feeds the callback body the mock actually POSTs into the SDK callback parser.
 */
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { parseCallbackPayload, validateCallbackPayload } from "@dojocoding/hacienda-sdk";
import { createMockServer } from "./server.js";

const CLAVE = "50601072500031012345670010000101000000000119999999";

async function captureCallback(outcome: "aceptado" | "rechazado"): Promise<string> {
  const received: string[] = [];
  const sink = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      received.push(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(200).end();
    });
  });
  await new Promise<void>((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const address = sink.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const mock = await createMockServer({ processingDelayMs: 0, acceptanceDelayMs: 0, outcome });
  try {
    const tokenResponse = await fetch(mock.idpTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "mock",
        username: "u",
        password: "p",
      }),
    });
    const { access_token } = (await tokenResponse.json()) as { access_token: string };
    const res = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clave: CLAVE,
        fecha: "2025-07-27T10:30:00-06:00",
        emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
        comprobanteXml: Buffer.from("<FacturaElectronica/>").toString("base64"),
        callbackUrl: `http://127.0.0.1:${String(port)}/cb`,
      }),
    });
    expect(res.status).toBe(201);
    for (let i = 0; i < 100 && received.length === 0; i++)
      await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(1);
    return received[0] ?? "";
  } finally {
    await new Promise<void>((resolve) => sink.close(() => resolve()));
    await mock.close();
  }
}

describe("mock callback body through the SDK parser", () => {
  it.each(["aceptado", "rechazado"] as const)(
    "reads the hyphenated ind-estado/respuesta-xml keys of a %s callback",
    async (outcome) => {
      const body = await captureCallback(outcome);
      expect(body).toContain('"ind-estado"');
      expect(body).toContain('"respuesta-xml"');
      const envelope = validateCallbackPayload(body);
      expect(envelope.clave).toBe(CLAVE);
      expect(envelope["ind-estado"]).toBe(outcome);
      expect(envelope["respuesta-xml"]).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    },
  );

  it("rejects the mock's placeholder signature as structurally invalid", async () => {
    // The mock carries a placeholder ds:Signature that is not valid XMLDSig;
    // the parser must not accept it as a signed MensajeHacienda.
    const body = await captureCallback("aceptado");
    await expect(parseCallbackPayload(body)).rejects.toMatchObject({
      name: "ValidationError",
      message: "Invalid callback response XML.",
    });
  });
});
