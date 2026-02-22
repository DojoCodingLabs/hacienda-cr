/**
 * Shared auth helper for CLI commands that need an authenticated API client.
 *
 * Loads a config profile, authenticates, and returns a ready-to-use HttpClient.
 *
 * @module utils/api-client
 */

import {
  loadConfig,
  loadCredentials,
  TokenManager,
  getEnvironmentConfig,
  HttpClient,
} from "@hacienda-cr/sdk";
import type { IdType, ResolvedConfig, Environment } from "@hacienda-cr/sdk";

export interface AuthenticatedClient {
  readonly httpClient: HttpClient;
  readonly config: ResolvedConfig;
}

/**
 * Creates an authenticated HttpClient from a saved config profile.
 *
 * @param profileName - Profile name (defaults to "default").
 * @returns Authenticated HTTP client and resolved config.
 * @throws If the profile is missing, password is not set, or authentication fails.
 */
export async function createAuthenticatedClient(
  profileName?: string,
): Promise<AuthenticatedClient> {
  const config = await loadConfig(profileName ?? "default");

  if (!config.password) {
    throw new Error(
      "Missing password. Set the HACIENDA_PASSWORD environment variable.",
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

  const httpClient = new HttpClient({ envConfig, tokenManager });

  return { httpClient, config };
}
