/**
 * HaciendaClient — the primary entry point for `@hacienda-cr/sdk`.
 *
 * Provides a clean facade over the SDK's internal modules (auth, clave,
 * config) so consumers only need to interact with a single class.
 *
 * @example
 * ```ts
 * import { HaciendaClient } from "@hacienda-cr/sdk";
 *
 * const client = new HaciendaClient({
 *   environment: "sandbox",
 *   credentials: {
 *     idType: "02",
 *     idNumber: "3101234567",
 *     password: process.env.HACIENDA_PASSWORD!,
 *   },
 * });
 *
 * await client.authenticate();
 * const clave = client.buildClave({ ... });
 * ```
 *
 * @module client
 */

import { z } from "zod";

import { loadCredentials } from "./auth/credentials.js";
import { getEnvironmentConfig } from "./auth/environment.js";
import { TokenManager } from "./auth/token-manager.js";
import type { TokenManagerOptions } from "./auth/token-manager.js";
import { Environment, IdType, AuthError } from "./auth/types.js";
import type { AuthCredentials } from "./auth/types.js";
import { buildClave } from "./clave/build-clave.js";
import { parseClave } from "./clave/parse-clave.js";
import type { ClaveInput, ClaveParsed } from "./clave/types.js";
import { AuthenticationError, ValidationError } from "./errors.js";

// ---------------------------------------------------------------------------
// Options schema
// ---------------------------------------------------------------------------

/**
 * Zod schema for validating {@link HaciendaClientOptions}.
 */
export const HaciendaClientOptionsSchema = z.object({
  /** Hacienda API environment to target. */
  environment: z.nativeEnum(Environment, {
    message: 'environment must be "sandbox" or "production".',
  }),

  /** Taxpayer credentials for IDP authentication. */
  credentials: z.object({
    /** Identification type code (01-04). */
    idType: z.nativeEnum(IdType, {
      message:
        "Invalid identification type. Must be 01 (Fisica), 02 (Juridica), 03 (DIMEX), or 04 (NITE).",
    }),
    /** Identification number (cedula). */
    idNumber: z
      .string()
      .min(9, "Identification number must be at least 9 digits.")
      .max(12, "Identification number must be at most 12 digits.")
      .regex(/^\d+$/, "Identification number must contain only digits."),
    /** Password for the Hacienda IDP. */
    password: z.string().min(1, "Password is required."),
  }),

  /** Optional path to .p12 certificate file (used for signing, not auth). */
  p12Path: z.string().min(1).optional(),

  /** Optional PIN for the .p12 certificate. */
  p12Pin: z.string().optional(),

  /**
   * Optional custom `fetch` implementation for HTTP requests.
   * Useful for testing or proxying. Defaults to the global `fetch`.
   */
  fetchFn: z.function().optional(),
});

/**
 * Configuration options for creating a {@link HaciendaClient}.
 */
export type HaciendaClientOptions = z.input<typeof HaciendaClientOptionsSchema>;

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------

/**
 * Main SDK client for interacting with the Costa Rica Hacienda API.
 *
 * Orchestrates authentication, clave generation, and (in future milestones)
 * document building, signing, and submission.
 *
 * Lifecycle:
 * 1. Create an instance with {@link HaciendaClientOptions}.
 * 2. Call {@link authenticate} to obtain an IDP token.
 * 3. Use helper methods ({@link buildClave}, {@link parseClave}) or
 *    (future) document submission methods.
 *
 * @example
 * ```ts
 * const client = new HaciendaClient({
 *   environment: "sandbox",
 *   credentials: {
 *     idType: "02",
 *     idNumber: "3101234567",
 *     password: "secret",
 *   },
 * });
 *
 * await client.authenticate();
 * console.log(client.isAuthenticated); // true
 * console.log(client.environment);     // "sandbox"
 *
 * const token = await client.getAccessToken();
 * ```
 */
export class HaciendaClient {
  private readonly tokenManager: TokenManager;
  private readonly authCredentials: AuthCredentials;
  private readonly env: Environment;
  private readonly options: z.output<typeof HaciendaClientOptionsSchema>;

  /**
   * Creates a new HaciendaClient.
   *
   * Validates the supplied options against the Zod schema and initialises
   * internal sub-systems (TokenManager, credentials).
   *
   * @param options - Client configuration (environment, credentials, etc.).
   * @throws {ValidationError} If the options fail schema validation.
   */
  constructor(options: HaciendaClientOptions) {
    // Validate options
    const result = HaciendaClientOptionsSchema.safeParse(options);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join("; ");
      throw new ValidationError(`Invalid HaciendaClient options: ${messages}`, result.error.issues);
    }

    this.options = result.data;
    this.env = this.options.environment;

    // Build auth credentials via the existing loadCredentials helper
    // (which also validates the credential fields).
    try {
      this.authCredentials = loadCredentials({
        idType: this.options.credentials.idType,
        idNumber: this.options.credentials.idNumber,
        password: this.options.credentials.password,
        p12Path: this.options.p12Path,
        p12Pin: this.options.p12Pin,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new ValidationError(error.message, undefined, error);
      }
      throw error;
    }

    // Initialise the token manager
    const envConfig = getEnvironmentConfig(this.env);
    const tmOptions: TokenManagerOptions = {
      envConfig,
      fetchFn: this.options.fetchFn as typeof fetch | undefined,
    };
    this.tokenManager = new TokenManager(tmOptions);
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  /**
   * Authenticates with the Hacienda IDP using the configured credentials.
   *
   * Must be called before any operation that requires a valid token
   * (e.g., future document submission).
   *
   * @throws {AuthenticationError} If the authentication request fails.
   */
  async authenticate(): Promise<void> {
    try {
      await this.tokenManager.authenticate(this.authCredentials);
    } catch (error) {
      if (error instanceof AuthError) {
        throw new AuthenticationError(`Authentication failed: ${error.message}`, error);
      }
      throw error;
    }
  }

  /**
   * Returns `true` if the client holds a cached token (may or may not
   * have expired — {@link getAccessToken} handles auto-refresh).
   */
  get isAuthenticated(): boolean {
    return this.tokenManager.isAuthenticated;
  }

  /**
   * Returns a valid JWT access token, refreshing automatically when needed.
   *
   * @returns A valid access token string.
   * @throws {AuthenticationError} If not authenticated or refresh fails.
   */
  async getAccessToken(): Promise<string> {
    try {
      return await this.tokenManager.getAccessToken();
    } catch (error) {
      if (error instanceof AuthError) {
        throw new AuthenticationError(`Failed to get access token: ${error.message}`, error);
      }
      throw error;
    }
  }

  /**
   * Clears all cached tokens and forces re-authentication on the next call.
   */
  invalidate(): void {
    this.tokenManager.invalidate();
  }

  // -------------------------------------------------------------------------
  // Clave
  // -------------------------------------------------------------------------

  /**
   * Builds a 50-digit clave numerica from the given input parameters.
   *
   * @param input - Components for building the clave.
   * @returns A 50-digit clave numerica string.
   * @throws {ValidationError} If the input fails validation.
   *
   * @example
   * ```ts
   * import { DocumentType, Situation } from "@hacienda-cr/sdk";
   *
   * const clave = client.buildClave({
   *   date: new Date(),
   *   taxpayerId: "3101234567",
   *   documentType: DocumentType.FACTURA_ELECTRONICA,
   *   sequence: 1,
   *   situation: Situation.NORMAL,
   * });
   * ```
   */
  buildClave(input: ClaveInput): string {
    try {
      return buildClave(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `Invalid clave input: ${error.issues.map((i) => i.message).join("; ")}`,
          error.issues,
          error,
        );
      }
      throw error;
    }
  }

  /**
   * Parses a 50-digit clave numerica string into its component parts.
   *
   * @param clave - A 50-digit numeric string.
   * @returns Parsed clave components.
   * @throws {ValidationError} If the clave string is invalid.
   */
  parseClave(clave: string): ClaveParsed {
    try {
      return parseClave(clave);
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(`Invalid clave: ${error.message}`, undefined, error);
      }
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Config
  // -------------------------------------------------------------------------

  /**
   * The Hacienda API environment this client targets.
   */
  get environment(): Environment {
    return this.env;
  }
}
