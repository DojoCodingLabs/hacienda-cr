/**
 * Typed HTTP client with automatic auth header injection.
 *
 * Uses Node.js 22 native `fetch` and the {@link TokenManager} for
 * automatic Bearer token injection on every request.
 *
 * Handles JSON and XML content types, proper error mapping, and
 * Hacienda-specific error responses.
 *
 * @module api/http-client
 */

import type { TokenManager } from "../auth/token-manager.js";
import type { EnvironmentConfig } from "../auth/types.js";
import { ApiError } from "../errors.js";
import { getHttpStatusDescription } from "./error-codes.js";
import { RateLimiter } from "./rate-limiter.js";
import type { RateLimiterOptions } from "./rate-limiter.js";
import { withRetry } from "./retry.js";
import type { RetryOptions } from "./retry.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the HTTP client. */
export interface HttpClientOptions {
  /** Environment configuration (provides the base URL). */
  readonly envConfig: EnvironmentConfig;
  /** Token manager for Bearer token injection. */
  readonly tokenManager: TokenManager;
  /** Optional custom fetch implementation (useful for testing). */
  readonly fetchFn?: typeof fetch;
  /** Optional retry configuration. */
  readonly retryOptions?: RetryOptions;
  /** Optional rate limiter configuration. Set to `false` to disable. */
  readonly rateLimiterOptions?: RateLimiterOptions | false;
}

/** Options for individual HTTP requests. */
export interface RequestOptions {
  /** HTTP method. */
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** URL path relative to the API base URL (e.g., "/recepcion"). */
  readonly path: string;
  /** Request body (will be JSON-serialized). */
  readonly body?: unknown;
  /** Additional headers to include. */
  readonly headers?: Record<string, string>;
  /** Whether to skip authentication header (default: false). */
  readonly skipAuth?: boolean;
  /** Whether to skip retry logic (default: false). */
  readonly skipRetry?: boolean;
}

/** A typed HTTP response. */
export interface HttpResponse<T = unknown> {
  /** HTTP status code. */
  readonly status: number;
  /** Response headers. */
  readonly headers: Headers;
  /** Parsed response body. */
  readonly data: T;
}

// ---------------------------------------------------------------------------
// HttpClient
// ---------------------------------------------------------------------------

/**
 * Typed HTTP client for the Hacienda REST API.
 *
 * Automatically injects `Authorization: Bearer <token>` headers via
 * the configured {@link TokenManager}. Handles JSON serialization,
 * error mapping, and retry logic.
 *
 * @example
 * ```ts
 * const client = new HttpClient({
 *   envConfig: getEnvironmentConfig(Environment.Sandbox),
 *   tokenManager,
 * });
 *
 * const response = await client.post<SubmissionResponse>("/recepcion", body);
 * ```
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenManager: TokenManager;
  private readonly fetchFn: typeof fetch;
  private readonly retryOptions: RetryOptions | undefined;
  private readonly rateLimiter: RateLimiter | undefined;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.envConfig.apiBaseUrl;
    this.tokenManager = options.tokenManager;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.retryOptions = options.retryOptions;

    // Initialize rate limiter (enabled by default, disable with `false`)
    if (options.rateLimiterOptions !== false) {
      this.rateLimiter = new RateLimiter(options.rateLimiterOptions);
    }
  }

  // -------------------------------------------------------------------------
  // Convenience methods
  // -------------------------------------------------------------------------

  /**
   * Sends a GET request.
   *
   * @param path - URL path relative to the API base URL.
   * @param options - Optional request configuration.
   * @returns Typed HTTP response.
   */
  async get<T = unknown>(
    path: string,
    options?: Partial<Pick<RequestOptions, "headers" | "skipAuth" | "skipRetry">>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: "GET", path, ...options });
  }

  /**
   * Sends a POST request.
   *
   * @param path - URL path relative to the API base URL.
   * @param body - Request body (will be JSON-serialized).
   * @param options - Optional request configuration.
   * @returns Typed HTTP response.
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: Partial<Pick<RequestOptions, "headers" | "skipAuth" | "skipRetry">>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: "POST", path, body, ...options });
  }

  // -------------------------------------------------------------------------
  // Core request method
  // -------------------------------------------------------------------------

  /**
   * Sends an HTTP request with auth injection and error handling.
   *
   * @param options - Full request options.
   * @returns Typed HTTP response.
   * @throws {ApiError} If the request fails or the server returns an error.
   */
  async request<T = unknown>(options: RequestOptions): Promise<HttpResponse<T>> {
    const execute = async (): Promise<HttpResponse<T>> => {
      const url = `${this.baseUrl}${options.path}`;

      // Build headers
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...options.headers,
      };

      // Inject auth header
      if (!options.skipAuth) {
        const token = await this.tokenManager.getAccessToken();
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Add content-type for request bodies
      if (options.body !== undefined && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      // Execute the fetch (through rate limiter if enabled)
      let response: Response;
      try {
        const doFetch = () =>
          this.fetchFn(url, {
            method: options.method,
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          });

        response = this.rateLimiter ? await this.rateLimiter.execute(doFetch) : await doFetch();
      } catch (error) {
        throw new ApiError(
          `Network error calling ${options.method} ${options.path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          undefined,
          undefined,
          error,
        );
      }

      // Parse the response body
      const data = await this.parseResponseBody<T>(response);

      // Check for HTTP errors
      if (!response.ok) {
        const description = getHttpStatusDescription(response.status);
        throw new ApiError(
          `${options.method} ${options.path} failed (${String(response.status)}): ${description}`,
          response.status,
          data,
        );
      }

      return {
        status: response.status,
        headers: response.headers,
        data,
      };
    };

    // Wrap with retry unless explicitly skipped
    if (options.skipRetry) {
      return execute();
    }

    return withRetry(execute, this.retryOptions);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Parses the response body based on content type.
   */
  private async parseResponseBody<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
      return (await response.text()) as T;
    }

    // For empty responses (e.g., 204 No Content)
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    // Try to parse as JSON
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}
