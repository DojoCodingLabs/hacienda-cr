import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getConfigDir,
  getConfigPath,
  ensureConfigDir,
  loadConfig,
  saveConfig,
  listProfiles,
  deleteProfile,
} from "./config-manager.js";
import type { Profile } from "./types.js";

/**
 * Creates a temporary directory for each test to isolate file system state.
 */
function useTempDir() {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hacienda-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  return {
    get dir() {
      return tempDir;
    },
  };
}

const SANDBOX_PROFILE: Profile = {
  environment: "sandbox",
  cedula_type: "01",
  cedula: "012345678",
  p12_path: "/path/to/cert.p12",
};

const PRODUCTION_PROFILE: Profile = {
  environment: "production",
  cedula_type: "02",
  cedula: "3101234567",
  p12_path: "/path/to/prod-cert.p12",
};

describe("getConfigDir", () => {
  it("returns the default directory under home", () => {
    const dir = getConfigDir();
    expect(dir).toMatch(/\.hacienda-cr$/);
  });

  it("returns a custom directory when overridden", () => {
    const dir = getConfigDir("/custom/path");
    expect(dir).toBe("/custom/path");
  });
});

describe("getConfigPath", () => {
  it("returns the config.toml path under the default directory", () => {
    const path = getConfigPath();
    expect(path).toMatch(/\.hacienda-cr\/config\.toml$/);
  });

  it("returns the config.toml path under a custom directory", () => {
    const path = getConfigPath("/custom/path");
    expect(path).toBe("/custom/path/config.toml");
  });
});

describe("ensureConfigDir", () => {
  const temp = useTempDir();

  it("creates the directory if it does not exist", async () => {
    const configDir = join(temp.dir, "new-config-dir");
    await ensureConfigDir(configDir);

    // Directory should now exist — verify by trying to write a file in it
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(configDir, "test.txt"), "ok");
    const content = await readFile(join(configDir, "test.txt"), "utf-8");
    expect(content).toBe("ok");
  });

  it("does not throw if directory already exists", async () => {
    await ensureConfigDir(temp.dir);
    await expect(ensureConfigDir(temp.dir)).resolves.not.toThrow();
  });
});

describe("saveConfig", () => {
  const temp = useTempDir();

  it("creates a new config file with a default profile", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const configPath = getConfigPath(temp.dir);
    const content = await readFile(configPath, "utf-8");

    expect(content).toContain("environment");
    expect(content).toContain("sandbox");
    expect(content).toContain("012345678");
  });

  it("saves a named profile", async () => {
    await saveConfig(PRODUCTION_PROFILE, "production", {
      configDir: temp.dir,
    });

    const configPath = getConfigPath(temp.dir);
    const content = await readFile(configPath, "utf-8");

    expect(content).toContain("production");
    expect(content).toContain("3101234567");
  });

  it("preserves existing profiles when adding a new one", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });
    await saveConfig(PRODUCTION_PROFILE, "production", {
      configDir: temp.dir,
    });

    const profiles = await listProfiles({ configDir: temp.dir });
    expect(profiles).toContain("default");
    expect(profiles).toContain("production");
  });

  it("overwrites an existing profile with the same name", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const updatedProfile: Profile = {
      ...SANDBOX_PROFILE,
      cedula: "999999999",
    };
    await saveConfig(updatedProfile, "default", { configDir: temp.dir });

    const config = await loadConfig("default", { configDir: temp.dir });
    expect(config.profile.cedula).toBe("999999999");
  });

  it("rejects invalid profile data", async () => {
    const invalidProfile = {
      environment: "invalid-env",
      cedula_type: "01",
      cedula: "012345678",
      p12_path: "/path/to/cert.p12",
    };

    await expect(
      saveConfig(invalidProfile as Profile, "default", {
        configDir: temp.dir,
      }),
    ).rejects.toThrow(/Invalid profile data/);
  });

  it("rejects cedula that is too short", async () => {
    const invalidProfile = {
      environment: "sandbox" as const,
      cedula_type: "01" as const,
      cedula: "12345678", // 8 digits, min is 9
      p12_path: "/path/to/cert.p12",
    };

    await expect(saveConfig(invalidProfile, "default", { configDir: temp.dir })).rejects.toThrow(
      /Invalid profile data/,
    );
  });
});

describe("loadConfig", () => {
  const temp = useTempDir();

  it("loads a saved default profile", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const config = await loadConfig("default", { configDir: temp.dir });

    expect(config.profileName).toBe("default");
    expect(config.profile.environment).toBe("sandbox");
    expect(config.profile.cedula_type).toBe("01");
    expect(config.profile.cedula).toBe("012345678");
    expect(config.profile.p12_path).toBe("/path/to/cert.p12");
  });

  it("loads a named profile", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });
    await saveConfig(PRODUCTION_PROFILE, "production", {
      configDir: temp.dir,
    });

    const config = await loadConfig("production", { configDir: temp.dir });

    expect(config.profileName).toBe("production");
    expect(config.profile.environment).toBe("production");
    expect(config.profile.cedula).toBe("3101234567");
  });

  it("defaults to 'default' profile name", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const config = await loadConfig(undefined, { configDir: temp.dir });

    expect(config.profileName).toBe("default");
  });

  it("merges HACIENDA_PASSWORD from env", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const config = await loadConfig("default", {
      configDir: temp.dir,
      env: { HACIENDA_PASSWORD: "my-secret-pass" },
    });

    expect(config.password).toBe("my-secret-pass");
  });

  it("merges HACIENDA_P12_PIN from env", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const config = await loadConfig("default", {
      configDir: temp.dir,
      env: { HACIENDA_P12_PIN: "1234" },
    });

    expect(config.p12Pin).toBe("1234");
  });

  it("returns undefined for missing env vars", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const config = await loadConfig("default", {
      configDir: temp.dir,
      env: {},
    });

    expect(config.password).toBeUndefined();
    expect(config.p12Pin).toBeUndefined();
  });

  it("throws when profile does not exist", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    await expect(loadConfig("nonexistent", { configDir: temp.dir })).rejects.toThrow(
      /Profile "nonexistent" not found/,
    );
  });

  it("throws when config file does not exist", async () => {
    await expect(loadConfig("default", { configDir: temp.dir })).rejects.toThrow(
      /Profile "default" not found/,
    );
  });

  it("mentions available profiles in error message", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });
    await saveConfig(PRODUCTION_PROFILE, "production", {
      configDir: temp.dir,
    });

    await expect(loadConfig("nonexistent", { configDir: temp.dir })).rejects.toThrow(
      /default, production/,
    );
  });
});

describe("listProfiles", () => {
  const temp = useTempDir();

  it("returns empty array when no config file exists", async () => {
    const profiles = await listProfiles({ configDir: temp.dir });
    expect(profiles).toEqual([]);
  });

  it("returns profile names from config file", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });
    await saveConfig(PRODUCTION_PROFILE, "production", {
      configDir: temp.dir,
    });

    const profiles = await listProfiles({ configDir: temp.dir });
    expect(profiles).toEqual(expect.arrayContaining(["default", "production"]));
    expect(profiles).toHaveLength(2);
  });

  it("returns single profile", async () => {
    await saveConfig(SANDBOX_PROFILE, "myprofile", { configDir: temp.dir });

    const profiles = await listProfiles({ configDir: temp.dir });
    expect(profiles).toEqual(["myprofile"]);
  });
});

describe("deleteProfile", () => {
  const temp = useTempDir();

  it("deletes an existing profile", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });
    await saveConfig(PRODUCTION_PROFILE, "production", {
      configDir: temp.dir,
    });

    const deleted = await deleteProfile("production", { configDir: temp.dir });
    expect(deleted).toBe(true);

    const profiles = await listProfiles({ configDir: temp.dir });
    expect(profiles).toEqual(["default"]);
  });

  it("returns false when profile does not exist", async () => {
    await saveConfig(SANDBOX_PROFILE, "default", { configDir: temp.dir });

    const deleted = await deleteProfile("nonexistent", {
      configDir: temp.dir,
    });
    expect(deleted).toBe(false);
  });

  it("returns false when no config file exists", async () => {
    const deleted = await deleteProfile("default", { configDir: temp.dir });
    expect(deleted).toBe(false);
  });
});

describe("TOML roundtrip", () => {
  const temp = useTempDir();

  it("preserves all profile fields through save/load cycle", async () => {
    const profile: Profile = {
      environment: "production",
      cedula_type: "03",
      cedula: "123456789012",
      p12_path: "/long/path/to/my-company.p12",
    };

    await saveConfig(profile, "test-profile", { configDir: temp.dir });
    const loaded = await loadConfig("test-profile", { configDir: temp.dir });

    expect(loaded.profile).toEqual(profile);
  });

  it("handles all cedula types", async () => {
    const types = ["01", "02", "03", "04"] as const;

    for (const cedulaType of types) {
      const profile: Profile = {
        environment: "sandbox",
        cedula_type: cedulaType,
        cedula: "123456789",
        p12_path: "/cert.p12",
      };

      await saveConfig(profile, `type-${cedulaType}`, {
        configDir: temp.dir,
      });
      const loaded = await loadConfig(`type-${cedulaType}`, {
        configDir: temp.dir,
      });
      expect(loaded.profile.cedula_type).toBe(cedulaType);
    }
  });
});
