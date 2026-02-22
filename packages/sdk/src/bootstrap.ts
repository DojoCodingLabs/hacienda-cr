/**
 * Bootstrap helper — creates an authenticated HttpClient from a saved config profile.
 *
 * Used by both the CLI and MCP packages to avoid duplicating the
 * config → credentials → TokenManager → HttpClient auth flow.
 *
 * @module bootstrap
 */

import { z } from "zod";

import { loadConfig } from "./config/config-manager.js";
import type { ConfigManagerOptions } from "./config/config-manager.js";
import type { ResolvedConfig } from "./config/types.js";
import { loadCredentials } from "./auth/credentials.js";
import { getEnvironmentConfig } from "./auth/environment.js";
import { TokenManager } from "./auth/token-manager.js";
import { Environment, IdType } from "./auth/types.js";
import { HttpClient } from "./api/http-client.js";

/** Result of bootstrapping an authenticated client. */
export interface BootstrapResult {
  /** Ready-to-use authenticated HTTP client. */
  readonly httpClient: HttpClient;
  /** The resolved config (profile + env vars). */
  readonly config: ResolvedConfig;
}

/** Options for the bootstrap helper. */
export interface BootstrapOptions {
  /** Profile name (defaults to "default"). */
  profileName?: string;
  /** Override config dir and env vars (mainly for testing). */
  configOptions?: ConfigManagerOptions;
}

// Zod schemas for runtime validation of config values
const IdTypeSchema = z.nativeEnum(IdType, {
  message: 'Invalid cedula type in profile. Expected "01", "02", "03", or "04".',
});

const EnvironmentEnumSchema = z.nativeEnum(Environment, {
  message: 'Invalid environment in profile. Expected "sandbox" or "production".',
});

/**
 * Creates an authenticated HttpClient from a saved config profile.
 *
 * Loads the profile, validates types at runtime, authenticates via
 * TokenManager, and returns a ready-to-use HttpClient.
 *
 * @param options - Bootstrap configuration.
 * @returns The authenticated HTTP client and resolved config.
 * @throws If the profile is missing, password is not set, types are invalid,
 *         or authentication fails.
 */
export async function bootstrapClient(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const config = await loadConfig(options.profileName ?? "default", options.configOptions);

  if (!config.password) {
    throw new Error("Missing password. Set the HACIENDA_PASSWORD environment variable.");
  }

  // Runtime-validate the cedula type and environment from the config
  const idType = IdTypeSchema.parse(config.profile.cedula_type);
  const environment = EnvironmentEnumSchema.parse(config.profile.environment);

  const credentials = loadCredentials({
    idType,
    idNumber: config.profile.cedula,
    password: config.password,
  });

  const envConfig = getEnvironmentConfig(environment);
  const tokenManager = new TokenManager({ envConfig });
  await tokenManager.authenticate(credentials);

  const httpClient = new HttpClient({ envConfig, tokenManager });

  return { httpClient, config };
}
