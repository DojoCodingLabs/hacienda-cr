/**
 * Shared auth helper for CLI commands that need an authenticated API client.
 *
 * Delegates to the SDK's {@link bootstrapClient} for the full auth flow.
 *
 * @module utils/api-client
 */

import { bootstrapClient } from "@hacienda-cr/sdk";
import type { BootstrapResult } from "@hacienda-cr/sdk";

export type { BootstrapResult };

/**
 * Creates an authenticated HttpClient from a saved config profile.
 *
 * @param profileName - Profile name (defaults to "default").
 * @returns Authenticated HTTP client and resolved config.
 * @throws If the profile is missing, password is not set, or authentication fails.
 */
export async function createAuthenticatedClient(profileName?: string): Promise<BootstrapResult> {
  return bootstrapClient({ profileName });
}
