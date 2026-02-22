/**
 * Shared auth helper for MCP tools that need an authenticated API client.
 *
 * Delegates to the SDK's {@link bootstrapClient} and caches the resulting
 * HttpClient per profile name so that repeated tool calls within a session
 * reuse the same TokenManager (which handles token refresh internally).
 *
 * @module tools/api-client
 */

import { bootstrapClient } from "@hacienda-cr/sdk";
import type { HttpClient } from "@hacienda-cr/sdk";

/** Cached clients keyed by profile name. */
const clientCache = new Map<string, HttpClient>();

/**
 * Returns an authenticated HttpClient for the given profile, using a cache
 * so that repeated calls reuse the same TokenManager / token.
 *
 * @param profileName - Profile name (defaults to "default").
 * @returns Authenticated HTTP client.
 * @throws Error with user-friendly message if auth fails.
 */
export async function createMcpApiClient(profileName?: string): Promise<HttpClient> {
  const key = profileName ?? "default";

  const cached = clientCache.get(key);
  if (cached) {
    return cached;
  }

  const { httpClient } = await bootstrapClient({ profileName: key });
  clientCache.set(key, httpClient);
  return httpClient;
}

/**
 * Clears the client cache. Primarily used for testing.
 */
export function clearClientCache(): void {
  clientCache.clear();
}
