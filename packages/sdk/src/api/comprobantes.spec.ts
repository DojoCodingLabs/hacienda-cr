import { describe, it, expect, vi } from "vitest";
import { ComprobantesQuerySchema } from "@dojocoding/hacienda-shared";
import { listComprobantes, getComprobante } from "./comprobantes.js";
import { HttpClient } from "./http-client.js";
import type { TokenManager } from "../auth/token-manager.js";
import { ApiError, ValidationError } from "../errors.js";
const clave = "50601012500310123456700100001010000000001100000001";
const item = () => ({
  clave,
  fecha: "2025-01-12T10:00:00-0600",
  emisor: {
    tipoIdentificacion: "02",
    numeroIdentificacion: "003101234567",
    nombre: "Emisor ficticio",
  },
  receptor: {
    tipoIdentificacion: "01",
    numeroIdentificacion: "001230456",
    nombre: "Receptor ficticio",
  },
  notasCredito: [{ clave: "0".repeat(50), fecha: "2025-01-13T10:00:00Z" }],
});
function client(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const token = vi.fn().mockResolvedValue("synthetic-token");
  const manager = { getAccessToken: token } as unknown as TokenManager;
  const fetchFn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }),
  );
  return {
    http: new HttpClient({
      envConfig: {
        name: "Synthetic",
        apiBaseUrl: "https://history.example.test/v1",
        idpTokenUrl: "https://history.example.test/token",
        clientId: "synthetic",
      },
      tokenManager: manager,
      fetchFn,
      rateLimiterOptions: false,
      retryOptions: { maxRetries: 0 },
    }),
    token,
    fetchFn,
  };
}
describe("documented history metadata", () => {
  it.each([200, 206] as const)(
    "reads a real HTTP %i array and observes raw pagination without invented fields",
    async (status) => {
      const fixture = {
        ...item(),
        estado: "aceptado",
        comprobanteXml: "PII_CANARY",
        respuestaXml: "PII_CANARY",
      };
      const c = client([fixture], status, {
        "Accept-Range": "resource 50",
        "Content-Range": "0-10/100",
      });
      const result = await listComprobantes(c.http, {
        offset: 0,
        limit: 10,
        emisor: "02003101234567",
        receptor: "01000001230456",
      });
      const url = new URL(
        (c.fetchFn.mock.calls[0] as unknown as [string, RequestInit])[0] as string,
      );
      expect(url.pathname).toBe("/v1/comprobantes");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        offset: "0",
        limit: "10",
        emisor: "02003101234567",
        receptor: "01000001230456",
      });
      expect(result).toEqual({
        offset: 0,
        limit: 10,
        comprobantes: [item()],
        pagination: { httpStatus: status, acceptRange: "resource 50", contentRange: "0-10/100" },
      });
      expect(JSON.stringify(result)).not.toMatch(/totalRegistros|PII_CANARY|estado|Xml|nextOffset/);
    },
  );
  it("does not infer total, next offset or completeness from an empty page or absent/malformed ranges", async () => {
    for (const headers of [{}, { "Content-Range": "unexpected-range" }]) {
      const c = client([], 206, headers);
      const r = await listComprobantes(c.http, { offset: 100, limit: 5 });
      expect(r.comprobantes).toEqual([]);
      expect(r.pagination.acceptRange).toBeNull();
      expect(r.pagination.contentRange).toBe(headers["Content-Range"] ?? null);
      expect(Object.keys(r).sort()).toEqual(["comprobantes", "limit", "offset", "pagination"]);
    }
  });
  it("rejects unsupported filters/bounds before even authentication", async () => {
    const c = client([]);
    for (const params of [
      null,
      { fechaEmisionDesde: "2025-01-01" },
      { emisorIdentificacion: "3101234567" },
      { limit: 51 },
      { limit: 0 },
      { offset: -1 },
      { offset: Number.MAX_SAFE_INTEGER },
      { emisor: "05foreign-identifier" },
      { emisor: 201234567890 },
      { receptor: "02../../admin" },
      { emisor: "02" },
    ])
      await expect(listComprobantes(c.http, params as never)).rejects.toBeInstanceOf(
        ValidationError,
      );
    expect(c.token).not.toHaveBeenCalled();
    expect(c.fetchFn).not.toHaveBeenCalled();
  });
  it("preserves exact domestic native/padded identifier forms and rejects unsupported regimes", () => {
    for (const emisor of [
      "01123456789",
      "02003101234567",
      "023101234567",
      "0312345678901",
      "03123456789012",
      "041234567890",
    ])
      expect(ComprobantesQuerySchema.parse({ emisor }).emisor).toBe(emisor);
    for (const emisor of [
      "0512345678901234567890",
      "0612345678901234567890",
      "011234",
      "021234567890123",
    ])
      expect(ComprobantesQuerySchema.safeParse({ emisor }).success).toBe(false);
  });
  it("rejects malformed body, wrong identity/date/status and excessive page without leaking response data", async () => {
    for (const body of [
      { totalRegistros: 1, comprobantes: [item()] },
      [null],
      [{ ...item(), fecha: "not-a-date", secret: "PII_CANARY" }],
      [{ ...item(), clave: "wrong" }],
      [{ ...item(), receptor: { ...item().receptor, numeroIdentificacion: "999999999" } }],
      [item(), item()],
    ]) {
      const c = client(body);
      try {
        await listComprobantes(c.http, { limit: 1, receptor: "01001230456" });
        expect.fail("accepted malformed/foreign history");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).responseBody).toBeUndefined();
        expect(JSON.stringify(error)).not.toContain("PII_CANARY");
      }
    }
    await expect(listComprobantes(client([], 201).http)).rejects.toBeInstanceOf(ApiError);
  });
  it("only forwards cancellation, not forged HTTP/auth/path options", async () => {
    const c = client([item()]);
    await listComprobantes(c.http, {}, {
      skipAuth: true,
      path: "/recepcion",
      headers: { Authorization: "forged" },
    } as never);
    expect(c.token).toHaveBeenCalledTimes(1);
    expect(
      new URL((c.fetchFn.mock.calls[0] as unknown as [string, RequestInit])[0] as string).pathname,
    ).toBe("/v1/comprobantes");
    expect(
      ((c.fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1] as RequestInit).headers,
    ).toHaveProperty("Authorization", "Bearer synthetic-token");
  });
  it("preserves the current published alphanumeric taxpayer clave segment exactly", async () => {
    const alpha = clave.slice(0, 9) + "0000A0123456" + clave.slice(21);
    const metadata = { ...item(), clave: alpha };
    const c = client(metadata);
    expect((await getComprobante(c.http, alpha)).clave).toBe(alpha);
    expect((c.fetchFn.mock.calls[0] as unknown as [string, RequestInit])[0]).toContain(alpha);
    expect((await listComprobantes(client([metadata]).http)).comprobantes[0]?.clave).toBe(alpha);
  });
  it("detail is only metadata, keeps references, requires exact requested clave and never substitutes status endpoint", async () => {
    const c = client({ ...item(), estado: "aceptado", comprobanteXml: "CANARY" });
    expect(await getComprobante(c.http, clave)).toEqual(item());
    expect((c.fetchFn.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      `https://history.example.test/v1/comprobantes/${clave}`,
    );
    await expect(
      getComprobante(client({ ...item(), clave: "0".repeat(50) }).http, clave),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(getComprobante(client(item(), 206).http, clave)).rejects.toBeInstanceOf(ApiError);
    const bad = client(item());
    await expect(getComprobante(bad.http, "../recepcion/anything")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(bad.token).not.toHaveBeenCalled();
  });
  it("propagates pre-abort, authentication-wait and response-read cancellation", async () => {
    const early = AbortSignal.abort(new Error("caller-cancelled")),
      c = client([]);
    await expect(listComprobantes(c.http, {}, { signal: early })).rejects.toThrow(
      "caller-cancelled",
    );
    expect(c.token).not.toHaveBeenCalled();
    const waiting = client([]),
      authAbort = new AbortController();
    let authStarted!: () => void;
    const authReady = new Promise<void>((resolve) => {
      authStarted = resolve;
    });
    waiting.token.mockImplementation(() => {
      authStarted();
      return new Promise<never>(() => undefined);
    });
    const auth = listComprobantes(waiting.http, {}, { signal: authAbort.signal });
    await authReady;
    authAbort.abort(new Error("auth-cancelled"));
    await expect(auth).rejects.toThrow("auth-cancelled");
    expect(waiting.fetchFn).not.toHaveBeenCalled();
    const reading = client([]),
      readAbort = new AbortController();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    reading.fetchFn.mockResolvedValue(
      new Response(
        new ReadableStream(
          {
            pull() {
              started();
            },
          },
          { highWaterMark: 0 },
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const pending = getComprobante(reading.http, clave, { signal: readAbort.signal });
    await ready;
    readAbort.abort(new Error("read-cancelled"));
    await expect(pending).rejects.toThrow("read-cancelled");
  });
});
