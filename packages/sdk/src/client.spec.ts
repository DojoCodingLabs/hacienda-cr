import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HaciendaClient } from "./client.js";
import { Environment, IdType } from "./auth/types.js";
import type { ClaveInput } from "./clave/types.js";
import { DocumentType, Situation } from "./clave/types.js";
import {
  AuthenticationError,
  HaciendaError,
  HaciendaErrorCode,
  ValidationError,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 300,
    refresh_expires_in: 36000,
    token_type: "bearer",
    ...overrides,
  };
}

function mockFetch(responseBody: unknown, status = 200): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

const VALID_OPTIONS = {
  environment: Environment.Sandbox,
  credentials: {
    idType: IdType.PersonaJuridica,
    idNumber: "3101234567",
    password: "test-password",
  },
} as const;

function createClient(fetchFn?: ReturnType<typeof vi.fn>, overrides: Record<string, unknown> = {}) {
  return new HaciendaClient({
    ...VALID_OPTIONS,
    fetchFn: fetchFn ?? mockFetch(makeTokenResponse()),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HaciendaClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Constructor / Options validation
  // -----------------------------------------------------------------------

  describe("constructor", () => {
    it("creates a client with valid options", () => {
      const client = createClient();

      expect(client).toBeInstanceOf(HaciendaClient);
      expect(client.environment).toBe(Environment.Sandbox);
      expect(client.isAuthenticated).toBe(false);
    });

    it("creates a client with production environment", () => {
      const client = createClient(undefined, {
        environment: Environment.Production,
      });

      expect(client.environment).toBe(Environment.Production);
    });

    it("accepts string environment values", () => {
      const client = new HaciendaClient({
        environment: "sandbox" as Environment,
        credentials: {
          idType: "02" as IdType,
          idNumber: "3101234567",
          password: "test-password",
        },
        fetchFn: mockFetch(makeTokenResponse()),
      });

      expect(client.environment).toBe(Environment.Sandbox);
    });

    it("accepts optional p12Path and p12Pin", () => {
      // p12Path validation happens via loadCredentials which checks file existence
      // So we just verify it doesn't throw for missing optional fields
      const client = createClient();
      expect(client).toBeInstanceOf(HaciendaClient);
    });

    it("throws ValidationError on missing environment", () => {
      expect(
        () =>
          new HaciendaClient({
            credentials: VALID_OPTIONS.credentials,
            fetchFn: mockFetch(makeTokenResponse()),
          } as never),
      ).toThrow(ValidationError);
    });

    it("throws ValidationError on invalid environment", () => {
      expect(() => createClient(undefined, { environment: "staging" })).toThrow(ValidationError);
    });

    it("throws ValidationError on missing credentials", () => {
      expect(
        () =>
          new HaciendaClient({
            environment: Environment.Sandbox,
            fetchFn: mockFetch(makeTokenResponse()),
          } as never),
      ).toThrow(ValidationError);
    });

    it("throws ValidationError on empty password", () => {
      expect(() =>
        createClient(undefined, {
          credentials: {
            idType: IdType.PersonaJuridica,
            idNumber: "3101234567",
            password: "",
          },
        }),
      ).toThrow(ValidationError);
    });

    it("throws ValidationError on too-short idNumber", () => {
      expect(() =>
        createClient(undefined, {
          credentials: {
            idType: IdType.PersonaJuridica,
            idNumber: "12345678", // 8 digits, min is 9
            password: "pass",
          },
        }),
      ).toThrow(ValidationError);
    });

    it("throws ValidationError on invalid idType", () => {
      expect(() =>
        createClient(undefined, {
          credentials: {
            idType: "99",
            idNumber: "3101234567",
            password: "pass",
          },
        }),
      ).toThrow(ValidationError);
    });

    it("thrown ValidationError is an instance of HaciendaError", () => {
      try {
        createClient(undefined, { environment: "invalid" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HaciendaError);
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe(HaciendaErrorCode.VALIDATION_FAILED);
      }
    });

    it("ValidationError carries Zod issue details", () => {
      try {
        createClient(undefined, { environment: "invalid" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const ve = error as ValidationError;
        expect(ve.details).toBeDefined();
        expect(Array.isArray(ve.details)).toBe(true);
      }
    });

    it("throws ValidationError when .p12 file does not exist", () => {
      expect(() =>
        createClient(undefined, {
          p12Path: "/nonexistent/path/cert.p12",
          p12Pin: "1234",
        }),
      ).toThrow(ValidationError);
    });
  });

  // -----------------------------------------------------------------------
  // authenticate()
  // -----------------------------------------------------------------------

  describe("authenticate", () => {
    it("authenticates successfully and sets isAuthenticated", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      expect(client.isAuthenticated).toBe(false);
      await client.authenticate();
      expect(client.isAuthenticated).toBe(true);
    });

    it("sends correct credentials to the IDP", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      await client.authenticate();

      expect(fetchFn).toHaveBeenCalledOnce();
      const call = fetchFn.mock.calls[0];
      if (!call) throw new Error("Expected fetch call");

      const [, init] = call;
      const body = (init as RequestInit).body as string;
      expect(body).toContain("grant_type=password");
      expect(body).toContain("username=cpj-02-3101234567");
      expect(body).toContain("password=test-password");
    });

    it("throws AuthenticationError on HTTP error", async () => {
      const fetchFn = mockFetch(
        { error: "invalid_grant", error_description: "Bad credentials" },
        401,
      );
      const client = createClient(fetchFn);

      await expect(client.authenticate()).rejects.toThrow(AuthenticationError);
    });

    it("thrown AuthenticationError is an instance of HaciendaError", async () => {
      const fetchFn = mockFetch({ error: "invalid_grant" }, 401);
      const client = createClient(fetchFn);

      try {
        await client.authenticate();
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HaciendaError);
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).code).toBe(HaciendaErrorCode.AUTHENTICATION_FAILED);
      }
    });

    it("throws AuthenticationError on network failure", async () => {
      const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
      const client = createClient(fetchFn);

      await expect(client.authenticate()).rejects.toThrow(AuthenticationError);
    });
  });

  // -----------------------------------------------------------------------
  // getAccessToken()
  // -----------------------------------------------------------------------

  describe("getAccessToken", () => {
    it("returns the access token after authentication", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      await client.authenticate();
      const token = await client.getAccessToken();

      expect(token).toBe("test-access-token");
    });

    it("throws AuthenticationError when not authenticated", async () => {
      const client = createClient();

      await expect(client.getAccessToken()).rejects.toThrow(AuthenticationError);
    });

    it("auto-refreshes token when nearing expiry", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      await client.authenticate();

      // Return a new token on the refresh call
      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "refreshed-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Advance past refresh buffer (5min TTL - 30s buffer)
      vi.advanceTimersByTime(4 * 60 * 1000 + 35 * 1000);

      const token = await client.getAccessToken();
      expect(token).toBe("refreshed-token");
    });
  });

  // -----------------------------------------------------------------------
  // invalidate()
  // -----------------------------------------------------------------------

  describe("invalidate", () => {
    it("clears authentication state", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      await client.authenticate();
      expect(client.isAuthenticated).toBe(true);

      client.invalidate();
      expect(client.isAuthenticated).toBe(false);
    });

    it("causes getAccessToken to throw after invalidation", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      await client.authenticate();
      client.invalidate();

      await expect(client.getAccessToken()).rejects.toThrow(AuthenticationError);
    });

    it("allows re-authentication after invalidation", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const client = createClient(fetchFn);

      await client.authenticate();
      client.invalidate();

      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "new-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await client.authenticate();
      const token = await client.getAccessToken();
      expect(token).toBe("new-token");
    });
  });

  // -----------------------------------------------------------------------
  // buildClave()
  // -----------------------------------------------------------------------

  describe("buildClave", () => {
    it("builds a valid 50-digit clave", () => {
      const client = createClient();

      const clave = client.buildClave({
        date: new Date("2026-01-15T12:00:00.000Z"),
        taxpayerId: "3101234567",
        documentType: DocumentType.FACTURA_ELECTRONICA,
        sequence: 1,
        situation: Situation.NORMAL,
        securityCode: "12345678",
      });

      expect(clave).toHaveLength(50);
      expect(clave).toMatch(/^\d{50}$/);
    });

    it("includes correct components in the clave", () => {
      const client = createClient();

      const clave = client.buildClave({
        date: new Date("2026-01-15T12:00:00.000Z"),
        taxpayerId: "3101234567",
        branch: "001",
        pos: "00001",
        documentType: DocumentType.FACTURA_ELECTRONICA,
        sequence: 42,
        situation: Situation.NORMAL,
        securityCode: "99887766",
      });

      // country (506) + date (150126) + taxpayer (003101234567) + branch (001) + pos (00001) + docType (01) + seq (0000000042) + sit (1) + security (99887766)
      expect(clave).toBe("50615012600310123456700100001010000000042199887766");
    });

    it("throws ValidationError on invalid input", () => {
      const client = createClient();

      expect(() =>
        client.buildClave({
          date: new Date("2026-01-15"),
          taxpayerId: "3101234567",
          documentType: DocumentType.FACTURA_ELECTRONICA,
          sequence: 0, // invalid: min is 1
          situation: Situation.NORMAL,
        }),
      ).toThrow(ValidationError);
    });

    it("thrown error is a ValidationError with details", () => {
      const client = createClient();

      try {
        client.buildClave({
          date: new Date("2026-01-15"),
          taxpayerId: "3101234567",
          documentType: DocumentType.FACTURA_ELECTRONICA,
          sequence: -1,
          situation: Situation.NORMAL,
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(HaciendaError);
        const ve = error as ValidationError;
        expect(ve.code).toBe(HaciendaErrorCode.VALIDATION_FAILED);
        expect(ve.details).toBeDefined();
      }
    });

    it("throws ValidationError for invalid taxpayerId", () => {
      const client = createClient();

      expect(() =>
        client.buildClave({
          date: new Date("2026-01-15"),
          taxpayerId: "abc",
          documentType: DocumentType.FACTURA_ELECTRONICA,
          sequence: 1,
          situation: Situation.NORMAL,
        }),
      ).toThrow(ValidationError);
    });
  });

  // -----------------------------------------------------------------------
  // parseClave()
  // -----------------------------------------------------------------------

  describe("parseClave", () => {
    it("parses a valid 50-digit clave", () => {
      const client = createClient();
      // Build a known clave first
      const clave = "50615012600310123456700100001010000000042199887766";
      const parsed = client.parseClave(clave);

      expect(parsed.raw).toBe(clave);
      expect(parsed.countryCode).toBe("506");
      expect(parsed.taxpayerId).toBe("003101234567");
      expect(parsed.branch).toBe("001");
      expect(parsed.pos).toBe("00001");
      expect(parsed.documentType).toBe("01");
      expect(parsed.sequence).toBe(42);
      expect(parsed.situation).toBe("1");
      expect(parsed.securityCode).toBe("99887766");
    });

    it("round-trips buildClave and parseClave", () => {
      const client = createClient();

      const input: ClaveInput = {
        date: new Date("2026-01-15T12:00:00.000Z"),
        taxpayerId: "3101234567",
        branch: "002",
        pos: "00003",
        documentType: DocumentType.NOTA_DEBITO,
        sequence: 100,
        situation: Situation.CONTINGENCIA,
        securityCode: "11223344",
      };

      const clave = client.buildClave(input);
      const parsed = client.parseClave(clave);

      expect(parsed.taxpayerId).toBe("003101234567");
      expect(parsed.branch).toBe("002");
      expect(parsed.pos).toBe("00003");
      expect(parsed.documentType).toBe("02");
      expect(parsed.sequence).toBe(100);
      expect(parsed.situation).toBe("2");
      expect(parsed.securityCode).toBe("11223344");
    });

    it("throws ValidationError for too-short clave", () => {
      const client = createClient();

      expect(() => client.parseClave("12345")).toThrow(ValidationError);
    });

    it("throws ValidationError for non-numeric clave", () => {
      const client = createClient();

      expect(() => client.parseClave("5061501260031012345670010000101000000004219988776X")).toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError for wrong country code", () => {
      const client = createClient();

      // Replace "506" with "507" at the start
      expect(() => client.parseClave("50715012600310123456700100001010000000042199887766")).toThrow(
        ValidationError,
      );
    });

    it("thrown error preserves the original error as cause", () => {
      const client = createClient();

      try {
        client.parseClave("short");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const ve = error as ValidationError;
        expect(ve.cause).toBeDefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // environment getter
  // -----------------------------------------------------------------------

  describe("environment", () => {
    it("returns sandbox for sandbox client", () => {
      const client = createClient();
      expect(client.environment).toBe(Environment.Sandbox);
    });

    it("returns production for production client", () => {
      const client = createClient(undefined, {
        environment: Environment.Production,
      });
      expect(client.environment).toBe(Environment.Production);
    });
  });
});
