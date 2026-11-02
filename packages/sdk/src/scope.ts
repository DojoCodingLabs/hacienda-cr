import { z } from "zod";

/** Fiscal environments supported by the SDK. */
export const ScopeEnvironmentSchema = z.enum(["sandbox", "production"]);

/** Fiscal issuer identity used for authentication and numbering. */
export const ScopeIssuerSchema = z.object({
  idType: z.string().min(1).max(2),
  idNumber: z.string().min(1).max(20),
});

/** Explicit scope for multi-tenant service usage. */
export const ScopeSchema = z.object({
  tenantId: z.string().min(1).optional(),
  environment: ScopeEnvironmentSchema,
  issuer: ScopeIssuerSchema,
});

export type Scope = z.infer<typeof ScopeSchema>;

/** Computes a stable fingerprint for a scope. */
export function fingerprintScope(scope: Scope): string {
  return JSON.stringify([
    scope.tenantId ?? null,
    scope.environment,
    scope.issuer.idType,
    scope.issuer.idNumber,
  ]);
}
