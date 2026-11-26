/**
 * Mocked-HTTP tests for reconcileByClave (durable delivery recovery).
 */

import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client.js";
import { reconcileByClave } from "./submission.js";
import { ValidationError } from "../errors.js";

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
    tokenManager: { getAccessToken: async () => "synthetic-token" },
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

  it("returns not_found on 404 so the same clave can be resubmitted", async () => {
    const fetchFn = vi.fn(async () => json({ error: "not found" }, 404));
    await expect(reconcileByClave(client(fetchFn as typeof fetch), clave)).resolves.toEqual({
      kind: "not_found",
    });
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
