import { describe, expect, it } from "vitest";
import { ScopeSchema, fingerprintScope } from "./scope.js";

const issuer = { idType: "02", idNumber: "3101234567" } as const;

describe("ScopeSchema", () => {
  it("accepts a profile-shaped scope with an optional tenant", () => {
    expect(ScopeSchema.parse({ environment: "sandbox", issuer })).toEqual({
      environment: "sandbox",
      issuer,
    });
    expect(ScopeSchema.parse({ tenantId: "t1", environment: "production", issuer }).tenantId).toBe(
      "t1",
    );
  });

  it.each([
    { environment: "staging", issuer },
    { environment: "sandbox", issuer: { ...issuer, idType: "05" } },
    { environment: "sandbox", issuer: { ...issuer, idNumber: "12345678" } },
    { environment: "sandbox", issuer: { ...issuer, idNumber: "1234567890123" } },
    { tenantId: "", environment: "sandbox", issuer },
    { tenantId: "x".repeat(129), environment: "sandbox", issuer },
    { environment: "sandbox", issuer, extra: true },
  ])("rejects %j", (input) => {
    expect(ScopeSchema.safeParse(input).success).toBe(false);
  });
});

describe("fingerprintScope", () => {
  it("separates tenants and identities without delimiter collisions", () => {
    const base = { environment: "sandbox", issuer } as const;
    const prints = new Set([
      fingerprintScope(base),
      fingerprintScope({ ...base, tenantId: "a" }),
      fingerprintScope({ ...base, tenantId: "b" }),
      fingerprintScope({ ...base, environment: "production" }),
      fingerprintScope({ ...base, issuer: { idType: "01", idNumber: "3101234567" } }),
      fingerprintScope({ ...base, tenantId: 'a","sandbox' }),
    ]);
    expect(prints.size).toBe(6);
    expect(fingerprintScope({ ...base, tenantId: "a" })).toBe(
      fingerprintScope({ tenantId: "a", issuer, environment: "sandbox" }),
    );
  });
});
