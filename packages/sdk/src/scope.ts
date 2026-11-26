/**
 * Explicit fiscal scope for multi-tenant SDK consumers.
 *
 * A service that holds credentials for several issuers can carry a `Scope`
 * with each operation and key its own caches by {@link fingerprintScope}, so
 * one tenant's client, token or sequence is never reused for another.
 *
 * The CLI and MCP server do not accept a scope from their callers: each
 * request derives its scope from the selected configuration profile.
 *
 * @module scope
 */

import { z } from "zod";
import { CedulaTypeSchema, EnvironmentSchema } from "./config/types.js";

/** Fiscal environments supported by the SDK. */
export const ScopeEnvironmentSchema = EnvironmentSchema;

/** Fiscal issuer identity used for authentication and numbering. */
export const ScopeIssuerSchema = z
  .object({
    idType: CedulaTypeSchema,
    /** Same bounds as a configuration profile's `cedula`. */
    idNumber: z.string().min(9).max(12),
  })
  .strict();

/** Explicit scope for multi-tenant service usage. */
export const ScopeSchema = z
  .object({
    tenantId: z.string().min(1).max(128).optional(),
    environment: ScopeEnvironmentSchema,
    issuer: ScopeIssuerSchema,
  })
  .strict();

export type Scope = z.infer<typeof ScopeSchema>;

/** Computes a stable, collision-free fingerprint for a scope. */
export function fingerprintScope(scope: Scope): string {
  return JSON.stringify([
    scope.tenantId ?? null,
    scope.environment,
    scope.issuer.idType,
    scope.issuer.idNumber,
  ]);
}
