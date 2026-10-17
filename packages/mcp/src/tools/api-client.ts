/** Authenticated clients are reused only while the resolved profile and secrets match. */
import { createHash } from "node:crypto";
import { bootstrapClient, loadConfig } from "@dojocoding/hacienda-sdk";
import type { HttpClient, ResolvedConfig } from "@dojocoding/hacienda-sdk";

interface CachedClient {
  fingerprint: string;
  promise: Promise<HttpClient>;
}
const clientCache = new Map<string, CachedClient>();

// Secrets contribute to invalidation without appearing in cache keys or logs.
function fingerprint(config: ResolvedConfig): string {
  return createHash("sha256")
    .update(JSON.stringify([config.profileName, config.profile, config.password, config.p12Pin]))
    .digest("hex");
}

export async function createMcpApiClient(profileName = "default"): Promise<HttpClient> {
  const env = {
    HACIENDA_USERNAME: process.env.HACIENDA_USERNAME,
    HACIENDA_PASSWORD: process.env.HACIENDA_PASSWORD,
    HACIENDA_P12_PIN: process.env.HACIENDA_P12_PIN,
  };
  // Read the file on every call: edits, deletion and environment changes must
  // never be hidden by a previously authenticated client.
  const config = await loadConfig(profileName, { env });
  const identity = fingerprint(config);
  const cached = clientCache.get(profileName);
  if (cached?.fingerprint === identity) return cached.promise;

  const promise = bootstrapClient({ profileName, configOptions: { env } })
    .then(({ httpClient, config: authenticatedConfig }) => {
      // bootstrap re-reads the profile; retain its actual snapshot if the file
      // changed during authentication. An older request cannot replace a newer one.
      if (clientCache.get(profileName) === entry)
        entry.fingerprint = fingerprint(authenticatedConfig);
      return httpClient;
    })
    .catch((error: unknown) => {
      if (clientCache.get(profileName) === entry) clientCache.delete(profileName);
      throw error;
    });
  const entry: CachedClient = { fingerprint: identity, promise };
  clientCache.set(profileName, entry);
  return entry.promise;
}

export function clearClientCache(): void {
  clientCache.clear();
}
