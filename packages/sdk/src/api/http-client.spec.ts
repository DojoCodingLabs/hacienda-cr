/**
 * Tests for the typed HTTP client.
 */

import { describe, it, expect, vi } from "vitest";
import { HttpClient } from "./http-client.js";
import type { HttpClientOptions } from "./http-client.js";
import { TokenManager } from "../auth/token-manager.js";
import type { EnvironmentConfig } from "../auth/types.js";
import { ApiError } from "../errors.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ENV_CONFIG: EnvironmentConfig = {
  name: "Sandbox",
  apiBaseUrl: "https://api.test.example.com/recepcion-sandbox/v1",
  idpTokenUrl: "https://idp.test.example.com/token",
  clientId: "api-stag",
};

const MOCK_TOKEN = "mock-access-token-jwt";

function createMockTokenManager(): TokenManager {
  const tm = Object.create(TokenManager.prototype) as TokenManager;
  vi.spyOn(tm, "getAccessToken").mockResolvedValue(MOCK_TOKEN);
  vi.spyOn(tm, "isAuthenticated", "get").mockReturnValue(true);
  return tm;
}

function createMockFetch(response: {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    statusText: response.status === 200 ? "OK" : "Error",
    headers: new Headers({
      "Content-Type": "application/json",
      ...(response.headers ?? {}),
    }),
    json: () => Promise.resolve(response.body),
    text: () => Promise.resolve(JSON.stringify(response.body ?? "")),
  } as Response);
}

function createHttpClient(fetchFn: typeof fetch, tokenManager?: TokenManager): HttpClient {
  const options: HttpClientOptions = {
    envConfig: MOCK_ENV_CONFIG,
    tokenManager: tokenManager ?? createMockTokenManager(),
    fetchFn,
    retryOptions: { maxRetries: 0 }, // Disable retries in tests
  };
  return new HttpClient(options);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HttpClient", () => {
  describe("get", () => {
    it("sends GET request with auth header", async () => {
      const mockFetch = createMockFetch({ status: 200, body: { data: "test" } });
      const client = createHttpClient(mockFetch);

      const response = await client.get("/recepcion/12345");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(url).toBe("https://api.test.example.com/recepcion-sandbox/v1/recepcion/12345");
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        `Bearer ${MOCK_TOKEN}`,
      );
      expect(options.method).toBe("GET");
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: "test" });
    });

    it("skips auth header when skipAuth is true", async () => {
      const mockFetch = createMockFetch({ status: 200, body: {} });
      const client = createHttpClient(mockFetch);

      await client.get("/health", { skipAuth: true });

      const [, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect((options.headers as Record<string, string>)["Authorization"]).toBeUndefined();
    });
  });

  describe("post", () => {
    it("sends POST request with JSON body", async () => {
      const mockFetch = createMockFetch({ status: 201, body: { status: 201 } });
      const client = createHttpClient(mockFetch);

      const body = { clave: "12345", comprobanteXml: "base64data" };
      const response = await client.post("/recepcion", body);

      const [, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(options.method).toBe("POST");
      expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
      expect(options.body).toBe(JSON.stringify(body));
      expect(response.status).toBe(201);
    });

    it("does not add Content-Type when no body", async () => {
      const mockFetch = createMockFetch({ status: 200, body: {} });
      const client = createHttpClient(mockFetch);

      await client.post("/recepcion");

      const [, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      // Content-Type should not be set when there's no body
      expect((options.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("throws ApiError for 4xx responses", async () => {
      const mockFetch = createMockFetch({
        status: 400,
        body: { error: "bad_request" },
      });
      const client = createHttpClient(mockFetch);

      await expect(client.post("/recepcion", {})).rejects.toThrow(ApiError);

      try {
        await client.post("/recepcion", {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBe(400);
        expect(apiError.responseBody).toEqual({ error: "bad_request" });
      }
    });

    it("throws ApiError for 5xx responses", async () => {
      const mockFetch = createMockFetch({ status: 500, body: { error: "internal" } });
      const client = createHttpClient(mockFetch);

      await expect(client.post("/recepcion", {})).rejects.toThrow(ApiError);
    });

    it("throws ApiError for network failures", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
      const client = createHttpClient(mockFetch as typeof fetch);

      await expect(client.get("/test")).rejects.toThrow(ApiError);

      try {
        await client.get("/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBeUndefined();
        expect(apiError.message).toContain("Network error");
      }
    });

    it("throws ApiError for 401 unauthorized", async () => {
      const mockFetch = createMockFetch({ status: 401, body: {} });
      const client = createHttpClient(mockFetch);

      try {
        await client.get("/recepcion/123");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
      }
    });
  });

  describe("response parsing", () => {
    it("parses JSON responses", async () => {
      const mockFetch = createMockFetch({
        status: 200,
        body: { clave: "12345", "ind-estado": "aceptado" },
      });
      const client = createHttpClient(mockFetch);

      const response = await client.get("/recepcion/12345");

      expect(response.data).toEqual({ clave: "12345", "ind-estado": "aceptado" });
    });

    it("returns headers in the response", async () => {
      const mockFetch = createMockFetch({
        status: 201,
        body: { status: 201 },
        headers: { Location: "/recepcion/12345" },
      });
      const client = createHttpClient(mockFetch);

      const response = await client.post("/recepcion", {});

      expect(response.headers.get("Location")).toBe("/recepcion/12345");
    });

    it("returns text for XML content-type responses", async () => {
      const xmlBody = "<response><status>ok</status></response>";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "application/xml" }),
        text: () => Promise.resolve(xmlBody),
      } as Response);
      const client = createHttpClient(mockFetch);

      const response = await client.get("/test");

      expect(response.data).toBe(xmlBody);
    });

    it("returns undefined for empty 204 No Content responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers(),
        text: () => Promise.resolve(""),
      } as Response);
      const client = createHttpClient(mockFetch);

      const response = await client.get("/test");

      expect(response.status).toBe(204);
      expect(response.data).toBeUndefined();
    });

    it("returns text for plain text non-JSON responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "text/plain" }),
        text: () => Promise.resolve("plain text response"),
      } as Response);
      const client = createHttpClient(mockFetch);

      const response = await client.get("/test");

      expect(response.data).toBe("plain text response");
    });

    it("parses JSON from text when content-type is not application/json", async () => {
      const jsonData = { key: "value", count: 42 };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "text/plain" }),
        text: () => Promise.resolve(JSON.stringify(jsonData)),
      } as Response);
      const client = createHttpClient(mockFetch);

      const response = await client.get("/test");

      expect(response.data).toEqual(jsonData);
    });
  });
});
