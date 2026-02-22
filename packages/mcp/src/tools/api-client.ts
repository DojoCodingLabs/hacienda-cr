/**
 * Shared auth helper for MCP tools that need an authenticated API client.
 *
 * Loads a config profile, authenticates, and returns a ready-to-use HttpClient.
 * On failure, returns MCP-friendly error text.
 *
 * @module tools/api-client
 */

import {
  loadConfig,
  loadCredentials,
  TokenManager,
  getEnvironmentConfig,
  HttpClient,
} from "@hacienda-cr/sdk";
import type { IdType, Environment } from "@hacienda-cr/sdk";

/**
 * Creates an authenticated HttpClient from a saved config profile.
 *
 * For v0.1.0, MCP tools require a config profile set up via CLI
 * (`hacienda auth login`).
 *
 * @param profileName - Profile name (defaults to "default").
 * @returns Authenticated HTTP client.
 * @throws Error with user-friendly message if auth fails.
 */
export async function createMcpApiClient(profileName?: string): Promise<HttpClient> {
  const config = await loadConfig(profileName ?? "default");

  if (!config.password) {
    throw new Error(
      "Missing password. Set the HACIENDA_PASSWORD environment variable " +
        "and ensure you have run `hacienda auth login` to create a profile.",
    );
  }

  const credentials = loadCredentials({
    idType: config.profile.cedula_type as IdType,
    idNumber: config.profile.cedula,
    password: config.password,
  });

  const envConfig = getEnvironmentConfig(config.profile.environment as Environment);
  const tokenManager = new TokenManager({ envConfig });
  await tokenManager.authenticate(credentials);

  return new HttpClient({ envConfig, tokenManager });
}
