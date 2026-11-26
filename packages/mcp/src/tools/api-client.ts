/** Authenticated clients are reused only while the resolved profile and secrets match. */
import { createHash } from "node:crypto";
import { bootstrapClient, loadConfig } from "@dojocoding/hacienda-sdk";
import {
  AuthError,
  AuthErrorCode,
  ScopeSchema,
  ValidationError,
  fingerprintScope,
  type Scope,
} from "@dojocoding/hacienda-sdk";
import type { HttpClient, ResolvedConfig } from "@dojocoding/hacienda-sdk";

interface CachedClient {
  fingerprint: string;
  promise: Promise<HttpClient>;
}

/** Upper bound on cached authenticated clients; least recently used is evicted. */
export const MAX_CACHED_CLIENTS = 16;
const clientCache = new Map<string, CachedClient>();

function cacheGet(key: string): CachedClient | undefined {
  const entry = clientCache.get(key);
  if (entry) {
    // Refresh recency: Map iteration order is insertion order.
    clientCache.delete(key);
    clientCache.set(key, entry);
  }
  return entry;
}

function cacheSet(key: string, entry: CachedClient): void {
  clientCache.delete(key);
  clientCache.set(key, entry);
  while (clientCache.size > MAX_CACHED_CLIENTS) {
    const oldest = clientCache.keys().next().value;
    if (oldest === undefined) break;
    clientCache.delete(oldest);
  }
}

/**
 * Derives the request scope from the profile. MCP tools never pass a scope;
 * an explicit one (SDK-style callers) must match the profile identity.
 */
function resolveScope(config: ResolvedConfig, scope?: Scope): Scope {
  const parsed = ScopeSchema.safeParse({
    ...(scope?.tenantId !== undefined ? { tenantId: scope.tenantId } : {}),
    environment: scope?.environment ?? config.profile.environment,
    issuer: scope?.issuer ?? {
      idType: config.profile.cedula_type,
      idNumber: config.profile.cedula,
    },
  });
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid scope.",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  const derived = parsed.data;
  if (
    derived.environment !== config.profile.environment ||
    derived.issuer.idType !== config.profile.cedula_type ||
    derived.issuer.idNumber !== config.profile.cedula
  ) {
    throw new AuthError(
      AuthErrorCode.SCOPE_IDENTITY_MISMATCH,
      "Scope identity does not match the configured profile.",
    );
  }
  return derived;
}

// Secrets contribute to invalidation without appearing in cache keys or logs.
function fingerprint(config: ResolvedConfig, scope: Scope): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        fingerprintScope(scope),
        config.profileName,
        config.profile,
        config.password,
        config.p12Pin,
      ]),
    )
    .digest("hex");
}

export async function createMcpApiClient(
  profileName = "default",
  scope?: Scope,
): Promise<HttpClient> {
  const env = {
    HACIENDA_USERNAME: process.env.HACIENDA_USERNAME,
    HACIENDA_PASSWORD: process.env.HACIENDA_PASSWORD,
    HACIENDA_P12_PIN: process.env.HACIENDA_P12_PIN,
  };
  // Read the file on every call: edits, deletion and environment changes must
  // never be hidden by a previously authenticated client.
  const config = await loadConfig(profileName, { env });
  const resolvedScope = resolveScope(config, scope);
  const identity = fingerprint(config, resolvedScope);
  const cacheKey = JSON.stringify([profileName, fingerprintScope(resolvedScope)]);
  const cached = cacheGet(cacheKey);
  if (cached?.fingerprint === identity) return cached.promise;

  const promise = bootstrapClient({ profileName, configOptions: { env } })
    .then(({ httpClient, config: authenticatedConfig }) => {
      // bootstrap re-reads the profile; retain its actual snapshot if the file
      // changed during authentication. An older request cannot replace a newer one.
      if (clientCache.get(cacheKey) === entry) {
        const authenticatedScope = resolveScope(authenticatedConfig, scope);
        entry.fingerprint = fingerprint(authenticatedConfig, authenticatedScope);
      }
      return httpClient;
    })
    .catch((error: unknown) => {
      if (clientCache.get(cacheKey) === entry) clientCache.delete(cacheKey);
      throw error;
    });
  const entry: CachedClient = { fingerprint: identity, promise };
  cacheSet(cacheKey, entry);
  return entry.promise;
}

export function clearClientCache(): void {
  clientCache.clear();
}
