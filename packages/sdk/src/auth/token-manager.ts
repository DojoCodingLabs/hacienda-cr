/**
 * OAuth2 ROPC token manager with auto-refresh for the Hacienda IDP.
 *
 * Handles the full token lifecycle:
 * - Initial authentication via Resource Owner Password Credentials grant
 * - In-memory token caching
 * - Automatic refresh 30 seconds before access token expiry
 * - Graceful invalidation
 *
 * Uses Node.js 22 native `fetch` — no external HTTP dependencies.
 *
 * @module auth/token-manager
 */

import type { AuthCredentials, EnvironmentConfig, TokenState } from "./types.js";
import { AuthError, AuthErrorCode, TokenResponseSchema } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of seconds before access token expiry to trigger a refresh. */
const REFRESH_BUFFER_SECONDS = 30;

// ---------------------------------------------------------------------------
// TokenManager
// ---------------------------------------------------------------------------

/**
 * Options for creating a {@link TokenManager}.
 */
export interface TokenManagerOptions {
  /** Environment configuration (URLs, client ID). */
  readonly envConfig: EnvironmentConfig;
  /**
   * Optional custom `fetch` implementation — useful for testing.
   * Defaults to the global `fetch`.
   */
  readonly fetchFn?: typeof fetch;
}

/**
 * Manages OAuth2 ROPC token lifecycle against the Hacienda IDP.
 *
 * @example
 * ```ts
 * const tm = new TokenManager({
 *   envConfig: getEnvironmentConfig(Environment.Sandbox),
 * });
 *
 * await tm.authenticate({ username: "cpj-02-3101234567", password: "secret" });
 * const token = await tm.getAccessToken(); // cached, auto-refreshes
 * ```
 */
export class TokenManager {
  private readonly envConfig: EnvironmentConfig;
  private readonly fetchFn: typeof fetch;
  private tokenState: TokenState | null = null;
  private credentials: AuthCredentials | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(options: TokenManagerOptions) {
    this.envConfig = options.envConfig;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Authenticates with the Hacienda IDP using the ROPC grant.
   *
   * Stores the credentials for future refresh requests and caches
   * the returned tokens in memory.
   *
   * @param credentials - Username and password for the IDP.
   * @throws {AuthError} If the request fails or the response is invalid.
   */
  async authenticate(credentials: AuthCredentials): Promise<void> {
    this.credentials = credentials;

    const body = new URLSearchParams({
      grant_type: "password",
      client_id: this.envConfig.clientId,
      username: credentials.username,
      password: credentials.password,
    });

    await this.requestToken(body);
  }

  /**
   * Returns a valid access token, refreshing automatically if needed.
   *
   * - If the token is still valid (more than 30 s remaining), returns it.
   * - If it will expire within 30 s, triggers a refresh.
   * - If no token exists, throws.
   *
   * @returns A valid JWT access token string.
   * @throws {AuthError} If not authenticated or refresh fails.
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokenState) {
      throw new AuthError(
        AuthErrorCode.NOT_AUTHENTICATED,
        "No token available. Call authenticate() first.",
      );
    }

    // Check if access token needs refreshing.
    const now = Date.now();
    const bufferMs = REFRESH_BUFFER_SECONDS * 1000;

    if (now >= this.tokenState.accessTokenExpiresAt - bufferMs) {
      await this.refresh();
    }

    // After refresh attempt, token state must exist.
    if (!this.tokenState) {
      throw new AuthError(AuthErrorCode.NOT_AUTHENTICATED, "Token was invalidated during refresh.");
    }

    return this.tokenState.accessToken;
  }

  /**
   * Clears all cached tokens and stored credentials.
   *
   * After calling this, {@link getAccessToken} will throw until
   * {@link authenticate} is called again.
   */
  invalidate(): void {
    this.tokenState = null;
    this.credentials = null;
    this.refreshPromise = null;
  }

  /**
   * Returns true if the manager holds a token (may or may not be expired).
   */
  get isAuthenticated(): boolean {
    return this.tokenState !== null;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Refreshes the access token using the stored refresh token.
   *
   * De-duplicates concurrent refresh calls — only one in-flight request
   * at a time.
   */
  private async refresh(): Promise<void> {
    // De-duplicate concurrent refreshes.
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    if (!this.tokenState) {
      throw new AuthError(AuthErrorCode.NOT_AUTHENTICATED, "Cannot refresh — no token state.");
    }

    // If the refresh token itself has expired, we need to re-authenticate.
    const now = Date.now();
    if (now >= this.tokenState.refreshTokenExpiresAt) {
      if (this.credentials) {
        // Re-authenticate from scratch using stored credentials.
        const body = new URLSearchParams({
          grant_type: "password",
          client_id: this.envConfig.clientId,
          username: this.credentials.username,
          password: this.credentials.password,
        });
        await this.requestToken(body);
        return;
      }

      this.tokenState = null;
      throw new AuthError(
        AuthErrorCode.REFRESH_TOKEN_EXPIRED,
        "Refresh token has expired and no credentials are stored for re-authentication.",
      );
    }

    // Normal refresh using the refresh token.
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.envConfig.clientId,
      refresh_token: this.tokenState.refreshToken,
    });

    try {
      await this.requestToken(body);
    } catch (error) {
      // If refresh fails and we have credentials, try a full re-auth.
      if (this.credentials) {
        const reAuthBody = new URLSearchParams({
          grant_type: "password",
          client_id: this.envConfig.clientId,
          username: this.credentials.username,
          password: this.credentials.password,
        });
        try {
          await this.requestToken(reAuthBody);
          return;
        } catch {
          // Fall through to throw original error.
        }
      }

      throw new AuthError(AuthErrorCode.TOKEN_REFRESH_FAILED, "Token refresh failed.", error);
    }
  }

  /**
   * Sends a token request to the IDP and stores the result.
   */
  private async requestToken(body: URLSearchParams): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchFn(this.envConfig.idpTokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch (error) {
      throw new AuthError(
        AuthErrorCode.TOKEN_REQUEST_FAILED,
        `Token request failed: network error.`,
        error,
      );
    }

    if (!response.ok) {
      let detail = "";
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        detail = ` — ${errorBody["error_description"] ?? errorBody["error"] ?? response.statusText}`;
      } catch {
        detail = ` — ${response.statusText}`;
      }

      throw new AuthError(
        AuthErrorCode.TOKEN_REQUEST_FAILED,
        `Token request failed with status ${response.status.toString()}${detail}`,
      );
    }

    const json: unknown = await response.json();

    const parseResult = TokenResponseSchema.safeParse(json);
    if (!parseResult.success) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN_RESPONSE,
        `Invalid token response from IDP: ${parseResult.error.message}`,
      );
    }

    const tokenData = parseResult.data;
    const now = Date.now();

    this.tokenState = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      accessTokenExpiresAt: now + tokenData.expires_in * 1000,
      refreshTokenExpiresAt: now + tokenData.refresh_expires_in * 1000,
    };
  }
}
