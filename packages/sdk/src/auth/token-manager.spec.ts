import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenManager } from "./token-manager.js";
import { AuthError, AuthErrorCode, Environment } from "./types.js";
import { getEnvironmentConfig } from "./environment.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SANDBOX_CONFIG = getEnvironmentConfig(Environment.Sandbox);

function makeTokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 300, // 5 minutes
    refresh_expires_in: 36000, // 10 hours
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

/**
 * Safely extract a call from vi mock calls by index.
 * Throws if the call does not exist (test-only helper).
 */
function getCall(
  fn: ReturnType<typeof vi.fn>,
  index: number,
): [url: unknown, init: RequestInit | undefined] {
  const call = fn.mock.calls[index];
  if (!call) {
    throw new Error(`Expected call at index ${index.toString()} but none found`);
  }
  return call as [unknown, RequestInit | undefined];
}

const TEST_CREDENTIALS = {
  username: "cpj-02-3101234567",
  password: "test-password",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TokenManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // authenticate()
  // -----------------------------------------------------------------------

  describe("authenticate", () => {
    it("sends correct ROPC request to the IDP", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      expect(fetchFn).toHaveBeenCalledOnce();
      const [url, init] = getCall(fetchFn, 0);
      expect(url).toBe(SANDBOX_CONFIG.idpTokenUrl);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
      });

      const body = init?.body as string;
      expect(body).toContain("grant_type=password");
      expect(body).toContain(`client_id=${SANDBOX_CONFIG.clientId}`);
      expect(body).toContain(`username=${TEST_CREDENTIALS.username}`);
      expect(body).toContain(`password=${TEST_CREDENTIALS.password}`);
    });

    it("caches the token after successful authentication", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);
      const token = await tm.getAccessToken();

      expect(token).toBe("test-access-token");
      // Only one fetch call — the original auth, no refresh needed.
      expect(fetchFn).toHaveBeenCalledOnce();
    });

    it("sets isAuthenticated to true after authentication", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      expect(tm.isAuthenticated).toBe(false);
      await tm.authenticate(TEST_CREDENTIALS);
      expect(tm.isAuthenticated).toBe(true);
    });

    it("throws AuthError on HTTP error response", async () => {
      const fetchFn = mockFetch(
        { error: "invalid_grant", error_description: "Bad credentials" },
        401,
      );
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await expect(tm.authenticate(TEST_CREDENTIALS)).rejects.toThrow(AuthError);
      await expect(tm.authenticate(TEST_CREDENTIALS)).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_REQUEST_FAILED,
      });
    });

    it("throws AuthError on network failure", async () => {
      const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await expect(tm.authenticate(TEST_CREDENTIALS)).rejects.toThrow(AuthError);
      await expect(tm.authenticate(TEST_CREDENTIALS)).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_REQUEST_FAILED,
      });
    });

    it("throws AuthError on invalid token response shape", async () => {
      const fetchFn = mockFetch({ unexpected: "data" });
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await expect(tm.authenticate(TEST_CREDENTIALS)).rejects.toThrow(AuthError);
      await expect(tm.authenticate(TEST_CREDENTIALS)).rejects.toMatchObject({
        code: AuthErrorCode.INVALID_TOKEN_RESPONSE,
      });
    });
  });

  // -----------------------------------------------------------------------
  // getAccessToken()
  // -----------------------------------------------------------------------

  describe("getAccessToken", () => {
    it("throws if not authenticated", async () => {
      const tm = new TokenManager({
        envConfig: SANDBOX_CONFIG,
        fetchFn: mockFetch(makeTokenResponse()),
      });

      await expect(tm.getAccessToken()).rejects.toThrow(AuthError);
      await expect(tm.getAccessToken()).rejects.toMatchObject({
        code: AuthErrorCode.NOT_AUTHENTICATED,
      });
    });

    it("returns cached token when still valid", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      // Advance time by 2 minutes — well within the 5-minute TTL.
      vi.advanceTimersByTime(2 * 60 * 1000);

      const token = await tm.getAccessToken();
      expect(token).toBe("test-access-token");
      // Still only the initial fetch call.
      expect(fetchFn).toHaveBeenCalledOnce();
    });

    it("auto-refreshes when within 30s of expiry", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      // Update mock to return a new token on refresh.
      fetchFn.mockResolvedValueOnce(
        new Response(
          JSON.stringify(makeTokenResponse({ access_token: "refreshed-access-token" })),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      // Advance to 4 minutes 35 seconds (5:00 TTL - 0:25 remaining < 30s buffer).
      vi.advanceTimersByTime(4 * 60 * 1000 + 35 * 1000);

      const token = await tm.getAccessToken();
      expect(token).toBe("refreshed-access-token");
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("sends refresh_token grant type on refresh", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "refreshed-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Advance into the refresh window.
      vi.advanceTimersByTime(4 * 60 * 1000 + 35 * 1000);

      await tm.getAccessToken();

      expect(fetchFn).toHaveBeenCalledTimes(2);
      const [, init] = getCall(fetchFn, 1);
      const body = init?.body as string;
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=test-refresh-token");
      expect(body).toContain(`client_id=${SANDBOX_CONFIG.clientId}`);
    });

    it("de-duplicates concurrent refresh calls", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      // Set up a slow refresh response.
      let resolveRefresh: (value: Response) => void = () => {
        /* placeholder */
      };
      const refreshPromise = new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      });
      fetchFn.mockReturnValueOnce(refreshPromise);

      // Advance into the refresh window.
      vi.advanceTimersByTime(4 * 60 * 1000 + 35 * 1000);

      // Trigger two concurrent getAccessToken calls.
      const p1 = tm.getAccessToken();
      const p2 = tm.getAccessToken();

      // Resolve the single refresh.
      resolveRefresh(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "deduped-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const [t1, t2] = await Promise.all([p1, p2]);
      expect(t1).toBe("deduped-token");
      expect(t2).toBe("deduped-token");
      // Only one refresh request.
      expect(fetchFn).toHaveBeenCalledTimes(2); // 1 auth + 1 refresh
    });

    it("re-authenticates when refresh token is expired", async () => {
      const fetchFn = mockFetch(makeTokenResponse({ expires_in: 10, refresh_expires_in: 60 }));
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      // Advance past both the access token and refresh token expiry.
      vi.advanceTimersByTime(61 * 1000);

      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "re-authed-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const token = await tm.getAccessToken();
      expect(token).toBe("re-authed-token");

      // The second call should be a password grant (re-auth), not refresh.
      const [, init] = getCall(fetchFn, 1);
      const body = init?.body as string;
      expect(body).toContain("grant_type=password");
    });
  });

  // -----------------------------------------------------------------------
  // invalidate()
  // -----------------------------------------------------------------------

  describe("invalidate", () => {
    it("clears token state", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);
      expect(tm.isAuthenticated).toBe(true);

      tm.invalidate();
      expect(tm.isAuthenticated).toBe(false);
    });

    it("causes getAccessToken to throw after invalidation", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);
      tm.invalidate();

      await expect(tm.getAccessToken()).rejects.toThrow(AuthError);
      await expect(tm.getAccessToken()).rejects.toMatchObject({
        code: AuthErrorCode.NOT_AUTHENTICATED,
      });
    });

    it("allows re-authentication after invalidation", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);
      tm.invalidate();

      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "new-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await tm.authenticate(TEST_CREDENTIALS);
      const token = await tm.getAccessToken();
      expect(token).toBe("new-token");
    });
  });

  // -----------------------------------------------------------------------
  // Error propagation
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    it("includes error detail from IDP error response", async () => {
      const fetchFn = mockFetch(
        {
          error: "invalid_grant",
          error_description: "Invalid user credentials",
        },
        401,
      );
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      try {
        await tm.authenticate(TEST_CREDENTIALS);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        const authErr = error as AuthError;
        expect(authErr.message).toContain("Invalid user credentials");
        expect(authErr.code).toBe(AuthErrorCode.TOKEN_REQUEST_FAILED);
      }
    });

    it("falls back to re-auth when refresh fails and credentials are stored", async () => {
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: SANDBOX_CONFIG, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      // First call: refresh fails with 401.
      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Second call: re-auth succeeds.
      fetchFn.mockResolvedValueOnce(
        new Response(JSON.stringify(makeTokenResponse({ access_token: "fallback-token" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Advance into refresh window.
      vi.advanceTimersByTime(4 * 60 * 1000 + 35 * 1000);

      const token = await tm.getAccessToken();
      expect(token).toBe("fallback-token");
    });

    it("uses production config correctly", async () => {
      const prodConfig = getEnvironmentConfig(Environment.Production);
      const fetchFn = mockFetch(makeTokenResponse());
      const tm = new TokenManager({ envConfig: prodConfig, fetchFn });

      await tm.authenticate(TEST_CREDENTIALS);

      const [url, init] = getCall(fetchFn, 0);
      expect(url).toBe(prodConfig.idpTokenUrl);

      const body = init?.body as string;
      expect(body).toContain("client_id=api-prod");
    });
  });
});
