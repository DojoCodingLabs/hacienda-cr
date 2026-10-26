import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMockServer } from "./server.js";
import type { MockServer, RecordedResponse } from "./types.js";
import net from "node:net";

const CLAVE = "50601072500031012345670010000101000000000119999999";

function submission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clave: CLAVE,
    fecha: "2025-07-27T10:30:00-06:00",
    emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
    comprobanteXml: Buffer.from("<FacturaElectronica/>").toString("base64"),
    ...overrides,
  };
}

let mock: MockServer;
let token: string;

beforeEach(async () => {
  mock = await createMockServer({
    processingDelayMs: 0,
    acceptanceDelayMs: 0,
    rateLimit: { limit: 5, windowMs: 60_000 },
  });
  token = await issueToken(mock);
});

afterEach(async () => {
  await mock.close();
});

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function issueToken(server: MockServer): Promise<string> {
  const res = await fetch(server.idpTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "mock",
      username: "u",
      password: "p",
    }),
  });
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

describe("mock: token endpoint", () => {
  it("issues an access token for password grant", async () => {
    expect(token).toMatch(/^mock-access-/);
  });

  it("rejects an unsupported grant", async () => {
    const res = await fetch(mock.idpTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("X-Error-Cause")).toContain("grant_type");
  });
});

describe("mock: POST /recepcion", () => {
  it("accepts a submission with 201 and Location", async () => {
    const res = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission()),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe(`/recepcion/${CLAVE}`);
    expect(mock.submissions()).toHaveLength(1);
  });

  it("rejects a malformed clave with 400 and X-Error-Cause", async () => {
    const res = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission({ clave: "123" })),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("X-Error-Cause")).toContain("50 digits");
  });

  it("rejects a missing comprobanteXml with 400 and X-Error-Cause", async () => {
    const res = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission({ comprobanteXml: undefined })),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("X-Error-Cause")).toContain("comprobanteXml");
  });

  it("rejects an invalid token with 401", async () => {
    const res = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: { Authorization: "Bearer nope", "Content-Type": "application/json" },
      body: JSON.stringify(submission()),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a duplicate clave with 409", async () => {
    const first = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission()),
    });
    expect(first.status).toBe(201);
    const second = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission()),
    });
    expect(second.status).toBe(409);
    expect(second.headers.get("X-Error-Cause")).toContain("Duplicate clave");
  });

  it("enforces the rate limit budget with 429 and X-Ratelimit headers", async () => {
    const headers = authHeaders();
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${mock.apiBaseUrl}/recepcion`, {
        method: "POST",
        headers,
        body: JSON.stringify(
          submission({ clave: CLAVE.slice(0, 48) + String(i).padStart(2, "0") }),
        ),
      });
      expect(res.status).toBe(201);
    }
    const limited = await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers,
      body: JSON.stringify(submission({ clave: `${CLAVE.slice(0, 48)}99` })),
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("X-Ratelimit-Limit")).toBe("5");
    expect(limited.headers.get("X-Ratelimit-Remaining")).toBe("0");
    expect(limited.headers.get("X-Ratelimit-Reset")).toBeTruthy();
  });
});

describe("mock: GET /recepcion/{clave}", () => {
  it("returns a terminal status and a response XML", async () => {
    await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission()),
    });
    const res = await fetch(`${mock.apiBaseUrl}/recepcion/${CLAVE}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    expect(body["ind-estado"]).toBe("aceptado");
    expect(Buffer.from(body["respuesta-xml"] ?? "", "base64").toString("utf8")).toContain(
      "MensajeHacienda",
    );
  });

  it("walks the states from recibido to the terminal one", async () => {
    const slow = await createMockServer({ processingDelayMs: 300, acceptanceDelayMs: 300 });
    try {
      const slowToken = await issueToken(slow);
      const headers = { Authorization: `Bearer ${slowToken}`, "Content-Type": "application/json" };
      await fetch(`${slow.apiBaseUrl}/recepcion`, {
        method: "POST",
        headers,
        body: JSON.stringify(submission()),
      });
      const seen: string[] = [];
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const res = await fetch(`${slow.apiBaseUrl}/recepcion/${CLAVE}`, { headers });
        const status = ((await res.json()) as Record<string, string>)["ind-estado"] ?? "";
        if (seen[seen.length - 1] !== status) seen.push(status);
        if (status === "aceptado") break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(seen).toEqual(["recibido", "procesando", "aceptado"]);
    } finally {
      await slow.close();
    }
  });

  it("returns 404 for an unknown clave", async () => {
    const res = await fetch(`${mock.apiBaseUrl}/recepcion/${CLAVE}`, { headers: authHeaders() });
    expect(res.status).toBe(404);
  });

  it("returns a rejection with its code", async () => {
    const rejecting = await createMockServer({
      processingDelayMs: 0,
      acceptanceDelayMs: 0,
      outcome: { status: "rechazado", codigo: "05" },
    });
    try {
      const rejectToken = await issueToken(rejecting);
      const headers = {
        Authorization: `Bearer ${rejectToken}`,
        "Content-Type": "application/json",
      };
      await fetch(`${rejecting.apiBaseUrl}/recepcion`, {
        method: "POST",
        headers,
        body: JSON.stringify(submission()),
      });
      const res = await fetch(`${rejecting.apiBaseUrl}/recepcion/${CLAVE}`, { headers });
      const body = (await res.json()) as Record<string, string>;
      expect(body["ind-estado"]).toBe("rechazado");
      const xml = Buffer.from(body["respuesta-xml"] ?? "", "base64").toString("utf8");
      expect(xml).toContain("[Code 05]");
      expect(xml).not.toContain("<Codigo>");
    } finally {
      await rejecting.close();
    }
  });
});

describe("mock: callbacks", () => {
  it("posts the callback once when the endpoint accepts it", async () => {
    const received: string[] = [];
    const callbackServer = await createMockServer({ processingDelayMs: 0, acceptanceDelayMs: 0 });
    const callbackToken = await issueToken(callbackServer);
    const { createServer } = await import("node:http");
    const sink = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        received.push(Buffer.concat(chunks).toString("utf8"));
        res.writeHead(200).end();
      });
    });
    await new Promise<void>((resolve) => sink.listen(0, "127.0.0.1", resolve));
    const address = sink.address();
    const port = typeof address === "object" && address ? address.port : 0;
    try {
      const res = await fetch(`${callbackServer.apiBaseUrl}/recepcion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${callbackToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(submission({ callbackUrl: `http://127.0.0.1:${String(port)}/cb` })),
      });
      expect(res.status).toBe(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(received).toHaveLength(1);
      expect(received[0]).toContain(CLAVE);
      expect(callbackServer.callbackAttempts()).toHaveLength(1);
      expect(callbackServer.callbackAttempts()[0]?.ok).toBe(true);
    } finally {
      await new Promise<void>((resolve) => sink.close(() => resolve()));
      await callbackServer.close();
    }
  });

  it("retries three times and gives up", async () => {
    const failing = await createMockServer({
      processingDelayMs: 0,
      acceptanceDelayMs: 0,
      callbackRetries: 3,
      callbackBackoffMs: 1,
    });
    try {
      const failingToken = await issueToken(failing);
      const res = await fetch(`${failing.apiBaseUrl}/recepcion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${failingToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(submission({ callbackUrl: "http://127.0.0.1:1/never" })),
      });
      expect(res.status).toBe(201);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(failing.callbackAttempts()).toHaveLength(3);
      expect(failing.callbackAttempts().every((attempt) => !attempt.ok)).toBe(true);
    } finally {
      await failing.close();
    }
  });
});

describe("mock: modo record", () => {
  it("captura la respuesta sanitizada", async () => {
    const captured: RecordedResponse[] = [];
    const recorder = await createMockServer({
      processingDelayMs: 0,
      acceptanceDelayMs: 0,
      mode: "record",
      recordSink: (entry) => captured.push(entry),
    });
    try {
      const recorderToken = await issueToken(recorder);
      const res = await fetch(`${recorder.apiBaseUrl}/recepcion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${recorderToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(submission()),
      });
      expect(res.status).toBe(201);
      expect(captured).toHaveLength(1);
      const entry = captured[0];
      expect(entry).toBeDefined();
      const xml = Buffer.from(entry?.respuestaXml ?? "", "base64").toString("utf8");
      expect(xml).toContain("MensajeHacienda");
      expect(xml).toContain("EMISOR_SANITIZADO");
      expect(xml).not.toContain("Empresa de Prueba S.A.");
      expect(recorder.recorded()).toHaveLength(1);
    } finally {
      await recorder.close();
    }
  });
});

describe("mock: state", () => {
  describe("mock: hostile HTTP inputs", () => {
    async function newMock() {
      return createMockServer({
        processingDelayMs: 0,
        acceptanceDelayMs: 0,
        rateLimit: { limit: 100, windowMs: 60_000 },
      });
    }

    function readRawResponse(
      port: number,
      write: (sock: net.Socket) => void,
      timeoutMs = 3000,
    ): Promise<string> {
      return new Promise((resolve) => {
        const sock = net.connect(port, "127.0.0.1");
        let data = "";
        let finished = false;
        const finish = (): void => {
          if (finished) return;
          finished = true;
          try {
            sock.destroy();
          } catch {
            /* ignore */
          }
          resolve(data);
        };
        sock.on("data", (chunk: Buffer) => {
          data += chunk.toString("latin1");
        });
        sock.on("end", finish);
        sock.on("close", finish);
        sock.on("error", finish);
        sock.on("connect", () => write(sock));
        setTimeout(finish, timeoutMs);
      });
    }

    it("routes by path and survives a malformed Host header", async () => {
      const hostile = await newMock();
      try {
        const hostileToken = await issueToken(hostile);
        const { port } = new URL(hostile.url);
        const response = await readRawResponse(Number(port), (sock) => {
          sock.write(`GET /nope HTTP/1.1\r\nHost: bad host\r\nConnection: close\r\n\r\n`);
        });
        expect(response).toMatch(/^HTTP\/1\.1 404/);
        const alive = await fetch(`${hostile.apiBaseUrl}/recepcion/${CLAVE}`, {
          headers: { Authorization: `Bearer ${hostileToken}` },
        });
        expect(alive.status).toBe(404);
      } finally {
        await hostile.close();
      }
    });

    it("rejects an over-limit body on the token endpoint with 400", async () => {
      const hostile = await newMock();
      try {
        const { port } = new URL(hostile.url);
        const body = "x".repeat(1_100_000);
        const request = `POST /auth/realms/rut-stag/protocol/openid-connect/token HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`;
        const response = await readRawResponse(Number(port), (sock) => {
          sock.write(request);
        });
        expect(response).toMatch(/^HTTP\/1\.1 400/);
        expect(response).toContain("X-Error-Cause");
        const alive = await fetch(hostile.idpTokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=password",
        });
        expect(alive.status).toBe(200);
      } finally {
        await hostile.close();
      }
    });

    it("survives a client disconnect mid-body on the token endpoint", async () => {
      const hostile = await newMock();
      try {
        const { port } = new URL(hostile.url);
        await readRawResponse(
          Number(port),
          (sock) => {
            sock.write(
              "POST /auth/realms/rut-stag/protocol/openid-connect/token HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 1000\r\n\r\npartial",
            );
            setTimeout(() => {
              try {
                sock.destroy();
              } catch {
                /* ignore */
              }
            }, 50);
          },
          500,
        );
        const alive = await fetch(hostile.idpTokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=password",
        });
        expect(alive.status).toBe(200);
      } finally {
        await hostile.close();
      }
    });

    it("rejects a JSON null body with 400", async () => {
      const hostile = await newMock();
      try {
        const hostileToken = await issueToken(hostile);
        const headers = {
          Authorization: `Bearer ${hostileToken}`,
          "Content-Type": "application/json",
        };
        const res = await fetch(`${hostile.apiBaseUrl}/recepcion`, {
          method: "POST",
          headers,
          body: "null",
        });
        expect(res.status).toBe(400);
        expect(res.headers.get("X-Error-Cause")).toContain("JSON object");
        const alive = await fetch(`${hostile.apiBaseUrl}/recepcion`, {
          method: "POST",
          headers,
          body: JSON.stringify(submission()),
        });
        expect(alive.status).toBe(201);
      } finally {
        await hostile.close();
      }
    });

    it("rejects scalar JSON bodies with 400", async () => {
      const hostile = await newMock();
      try {
        const hostileToken = await issueToken(hostile);
        const headers = {
          Authorization: `Bearer ${hostileToken}`,
          "Content-Type": "application/json",
        };
        for (const body of ["42", '"texto"', "true"]) {
          const res = await fetch(`${hostile.apiBaseUrl}/recepcion`, {
            method: "POST",
            headers,
            body,
          });
          expect(res.status).toBe(400);
          expect(res.headers.get("X-Error-Cause")).toContain("JSON object");
        }
      } finally {
        await hostile.close();
      }
    });

    it("contains a throwing outcome as 500 and survives", async () => {
      const hostile = await createMockServer({
        processingDelayMs: 0,
        acceptanceDelayMs: 0,
        rateLimit: { limit: 100, windowMs: 60_000 },
        outcome: (() => {
          throw new Error("boom");
        }) as unknown as "aceptado",
      });
      try {
        const hostileToken = await issueToken(hostile);
        const headers = {
          Authorization: `Bearer ${hostileToken}`,
          "Content-Type": "application/json",
        };
        const res = await fetch(`${hostile.apiBaseUrl}/recepcion`, {
          method: "POST",
          headers,
          body: JSON.stringify(submission()),
        });
        expect(res.status).toBe(500);
        expect(res.headers.get("X-Error-Cause")).toContain("Internal server error");
        const alive = await fetch(hostile.idpTokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=password",
        });
        expect(alive.status).toBe(200);
      } finally {
        await hostile.close();
      }
    });
  });

  it("reset clears documents, tokens and counters", async () => {
    await fetch(`${mock.apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(submission()),
    });
    expect(mock.submissions()).toHaveLength(1);
    mock.reset();
    expect(mock.submissions()).toHaveLength(0);
    const res = await fetch(`${mock.apiBaseUrl}/recepcion/${CLAVE}`, { headers: authHeaders() });
    expect(res.status).toBe(401);
  });
});
