import { describe, expect, it, vi } from "vitest";
import { resolveProveedorSistemas, type ProviderIdDeps } from "./provider-id.js";

// Synthetic dependencies only: these tests never read ~/.hacienda-cr.
function deps(profiles: Record<string, { provider_id?: string }>): ProviderIdDeps {
  return {
    listProfiles: vi.fn(async () => Object.keys(profiles)),
    loadConfig: vi.fn(async (name: string) => {
      const profile = profiles[name];
      if (!profile) throw new Error(`Profile "${name}" not found`);
      return { profile };
    }),
  };
}

const ISSUER = "3101234567";

describe("resolveProveedorSistemas", () => {
  it("uses the profile's provider_id without a warning", async () => {
    const result = await resolveProveedorSistemas(
      ISSUER,
      "default",
      deps({ default: { provider_id: "310ABC1234" } }),
    );
    expect(result).toEqual({ value: "310ABC1234", source: "profile" });
  });

  it("falls back to the issuer's identification with a warning when provider_id is absent", async () => {
    const result = await resolveProveedorSistemas(ISSUER, "default", deps({ default: {} }));
    expect(result.value).toBe(ISSUER);
    expect(result.source).toBe("issuer");
    expect(result.warning).toMatch(/profile "default" has no provider_id/);
    expect(result.warning).toMatch(/self-developed or custom-built/);
    expect(result.warning).toMatch(/--provider-id/);
  });

  it("falls back with a warning when the profile does not exist", async () => {
    const d = deps({ other: { provider_id: "310ABC1234" } });
    const result = await resolveProveedorSistemas(ISSUER, "default", d);
    expect(result.value).toBe(ISSUER);
    expect(result.warning).toMatch(/profile "default" not found/);
    expect(d.loadConfig).not.toHaveBeenCalled();
  });

  it("propagates an invalid config file instead of silently falling back", async () => {
    const failing: ProviderIdDeps = {
      listProfiles: async () => {
        throw new Error("Invalid config file at config.toml: provider_id");
      },
      loadConfig: vi.fn(),
    };
    await expect(resolveProveedorSistemas(ISSUER, "default", failing)).rejects.toThrow(
      /Invalid config file/,
    );
  });
});
