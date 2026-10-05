import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapClient } from "./bootstrap.js";
import { saveConfig } from "./config/config-manager.js";

const username = "cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr";
const profile = {
  environment: "sandbox" as const,
  cedula_type: "01" as const,
  cedula: "112345678",
  p12_path: "",
};

describe("profile authentication bootstrap", () => {
  let configDir: string;
  const fetchFn = vi.fn<typeof fetch>();
  beforeEach(async () => {
    configDir = await mkdtemp(join(tmpdir(), "hacienda-auth-"));
    fetchFn.mockReset().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 300,
            refresh_expires_in: 36000,
            token_type: "bearer",
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchFn);
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(configDir, { recursive: true, force: true });
  });

  it.each([
    [username, undefined, username],
    [
      username,
      "another-issued-user@stag.comprobanteselectronicos.go.cr",
      "another-issued-user@stag.comprobanteselectronicos.go.cr",
    ],
    [undefined, username, username],
    [undefined, undefined, "cpf-01-112345678"],
  ])("uses profile username %s with env override %s", async (saved, override, expected) => {
    await saveConfig({ ...profile, ...(saved ? { username: saved } : {}) }, "test", { configDir });
    const result = await bootstrapClient({
      profileName: "test",
      configOptions: {
        configDir,
        env: { HACIENDA_PASSWORD: "secret", HACIENDA_USERNAME: override },
      },
    });
    expect(result.config.profile.cedula).toBe(profile.cedula);
    const call = fetchFn.mock.calls[0];
    if (!call) throw new Error("Expected token request");
    const [url, init] = call;
    expect(url).toContain("/rut-stag/");
    expect(new URLSearchParams(init?.body as string).get("username")).toBe(expected);
    const toml = await readFile(join(configDir, "config.toml"), "utf8");
    expect(toml).not.toContain("secret");
    if (saved) expect(toml).toContain(saved);
  });

  it("rejects an empty env username instead of silently using the legacy username", async () => {
    await saveConfig({ ...profile, username }, "test", { configDir });
    await expect(
      bootstrapClient({
        profileName: "test",
        configOptions: {
          configDir,
          env: { HACIENDA_PASSWORD: "secret", HACIENDA_USERNAME: "" },
        },
      }),
    ).rejects.toThrow("Invalid credentials");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
