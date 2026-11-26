/**
 * Mocked-HTTP tests for reconcileByClave (durable delivery recovery).
 */

import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client.js";
import { reconcileByClave } from "./submission.js";
import { ValidationError } from "../errors.js";
import type { TokenManager } from "../auth/token-manager.js";

// HttpClient only calls getAccessToken; type the stub to that narrow surface.
const tokenStub: Pick<TokenManager, "getAccessToken"> = {
  getAccessToken: async () => "synthetic-token",
};

const clave = "50601012300310123456700100001010000000001199999999";
// The April 2026 v4.4 revision allows an alphanumeric taxpayer segment (positions 10-21).
const alphanumericClave = "506010123" + "AB12345678CD" + "00100001010000000001199999999";

function client(fetchFn: typeof fetch, requestTimeoutMs = 1000): HttpClient {
  return new HttpClient({
    envConfig: {
      name: "Synthetic",
      apiBaseUrl: "https://reconcile.example.test/v1",
      idpTokenUrl: "https://reconcile.example.test/token",
      clientId: "synthetic",
    },
    tokenManager: tokenStub as TokenManager,
    fetchFn,
    rateLimiterOptions: false,
    retryOptions: { maxRetries: 0 },
    requestTimeoutMs,
  });
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("reconcileByClave", () => {
  it("returns found with the parsed status on 200", async () => {
    const xml = "<MensajeHacienda/>";
    const fetchFn = vi.fn(async () =>
      json(
        {
          clave,
          "ind-estado": "aceptado",
          fecha: "2026-01-01T00:00:00-06:00",
          "respuesta-xml": Buffer.from(xml).toString("base64"),
        },
        200,
      ),
    );
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.status.status).toBe("aceptado");
      expect(result.status.responseXml).toBe(xml);
    }
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toBe(
      `https://reconcile.example.test/v1/recepcion/${clave}`,
    );
  });

  it("returns found for pending states without inferring an outcome", async () => {
    const fetchFn = vi.fn(async () => json({ clave, "ind-estado": "procesando" }, 200));
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result).toMatchObject({ kind: "found", status: { status: "procesando" } });
  });

  it("returns an inconclusive not_found on 404, never a resubmit permission", async () => {
    const before = Date.now();
    const fetchFn = vi.fn(async () => json({ error: "not found" }, 404));
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result).toEqual({
      kind: "not_found",
      conclusive: false,
      httpStatus: 404,
      evidence: "http_404",
      observedAt: expect.any(String),
    });
    if (result.kind !== "not_found") throw new Error("expected not_found");
    expect(Date.parse(result.observedAt)).toBeGreaterThanOrEqual(before - 1);
    expect(Date.parse(result.observedAt)).toBeLessThanOrEqual(Date.now() + 1);
    expect(result).not.toHaveProperty("safeToResubmit");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  // Observed sandbox answer for an unknown clave (docs/testing/sandbox-403-debug.md):
  // 400 with `x-error-cause: El comprobante [...] no ha sido recibido.`
  it.each([
    `El comprobante ${clave} no ha sido recibido.`,
    "El comprobante no ha sido recibido.",
    "  el comprobante [redactado] NO HA SIDO RECIBIDO  ",
  ])("maps the sandbox 400 with X-Error-Cause %j to not_found", async (cause) => {
    const fetchFn = vi.fn(
      async () =>
        new Response("", {
          status: 400,
          headers: { "x-error-cause": cause, "Content-Length": "0" },
        }),
    );
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result).toEqual({
      kind: "not_found",
      conclusive: false,
      httpStatus: 400,
      evidence: "x_error_cause_not_received",
      observedAt: expect.any(String),
      errorCause: cause.trim(),
    });
  });

  it("returns unknown on 400 without X-Error-Cause", async () => {
    const fetchFn = vi.fn(async () => json({ error: "no ha sido recibido" }, 400));
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result.kind).toBe("unknown");
    if (result.kind === "unknown") expect(result.error).toMatchObject({ statusCode: 400 });
  });

  it.each([
    "Comprobante con estructura invalida",
    "El comprobante ya fue recibido.",
    "No ha sido recibido.",
    "El comprobante no ha sido recibido. Reintente con otro XML",
    `El comprobante ${"x".repeat(300)} no ha sido recibido.`,
    // Names another clave: fail closed.
    `El comprobante ${clave.slice(0, -1)}0 no ha sido recibido.`,
  ])("returns unknown on 400 with an unrecognized X-Error-Cause %j", async (cause) => {
    const fetchFn = vi.fn(
      async () => new Response("", { status: 400, headers: { "X-Error-Cause": cause } }),
    );
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result.kind).toBe("unknown");
  });

  it.each([401, 403, 409, 429, 500, 503])(
    "returns unknown on HTTP %i even with the not-received cause",
    async (status) => {
      const fetchFn = vi.fn(
        async () =>
          new Response("", {
            status,
            headers: { "X-Error-Cause": "El comprobante no ha sido recibido." },
          }),
      );
      const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
      expect(result.kind).toBe("unknown");
    },
  );

  it("propagates an already-aborted signal before any network access", async () => {
    const fetchFn = vi.fn();
    await expect(
      reconcileByClave(client(fetchFn as typeof fetch), clave, {
        signal: AbortSignal.abort(new Error("cancelled first")),
      }),
    ).rejects.toThrow("cancelled first");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([500, 502, 503])("returns unknown on HTTP %i", async (status) => {
    const fetchFn = vi.fn(async () => json({ error: "unavailable" }, status));
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result.kind).toBe("unknown");
    if (result.kind === "unknown") expect(result.error).toBeInstanceOf(Error);
  });

  it("returns unknown on a network error", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result.kind).toBe("unknown");
  });

  it("returns unknown when the request times out", async () => {
    const fetchFn = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    );
    const result = await reconcileByClave(client(fetchFn as typeof fetch, 20), clave);
    expect(result.kind).toBe("unknown");
    if (result.kind === "unknown") expect(result.error.name).toBe("TimeoutError");
  });

  it("returns unknown when the response belongs to another clave", async () => {
    const other = clave.slice(0, -1) + "0";
    const fetchFn = vi.fn(async () => json({ clave: other, "ind-estado": "aceptado" }, 200));
    const result = await reconcileByClave(client(fetchFn as typeof fetch), clave);
    expect(result.kind).toBe("unknown");
  });

  it("propagates caller cancellation instead of reporting unknown", async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn(async () => {
      controller.abort(new Error("caller cancelled"));
      throw new TypeError("aborted");
    });
    await expect(
      reconcileByClave(client(fetchFn as typeof fetch), clave, { signal: controller.signal }),
    ).rejects.toThrow("caller cancelled");
  });

  it("accepts an alphanumeric taxpayer segment like the shared clave schema", async () => {
    const fetchFn = vi.fn(async () =>
      json({ clave: alphanumericClave, "ind-estado": "recibido" }, 200),
    );
    const result = await reconcileByClave(client(fetchFn as typeof fetch), alphanumericClave);
    expect(result.kind).toBe("found");
  });

  it.each([
    "",
    clave.slice(1),
    clave + "1",
    "../recepcion/" + clave.slice(13),
    "A" + clave.slice(1),
    clave.slice(0, 40) + "ABCDEFGHIJ",
  ])("rejects an invalid clave before any network access: %j", async (bad) => {
    const fetchFn = vi.fn();
    await expect(reconcileByClave(client(fetchFn as typeof fetch), bad)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
