/**
 * Configuration file management for ~/.hacienda-cr/config.toml
 *
 * Supports multiple profiles (like AWS credentials).
 * Sensitive values (password, p12 PIN) are sourced from environment variables,
 * NEVER stored in the config file.
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "smol-toml";
import type { Profile, ConfigFile, ResolvedConfig } from "./types.js";
import { ProfileSchema, ConfigFileSchema } from "./types.js";

/** Default config directory name */
const CONFIG_DIR_NAME = ".hacienda-cr";

/** Default config file name */
const CONFIG_FILE_NAME = "config.toml";

/** Default profile name */
const DEFAULT_PROFILE = "default";

/**
 * Options for customizing config behavior.
 * Primarily used for testing with temporary directories.
 */
export interface ConfigManagerOptions {
  /** Override the config directory path (defaults to ~/.hacienda-cr/) */
  configDir?: string;
  /** Override environment variable lookup (defaults to process.env) */
  env?: Record<string, string | undefined>;
}

/**
 * Returns the config directory path.
 *
 * @param configDir - Optional override for the config directory
 * @returns Absolute path to the config directory
 */
export function getConfigDir(configDir?: string): string {
  return configDir ?? join(homedir(), CONFIG_DIR_NAME);
}

/**
 * Returns the full path to the config.toml file.
 *
 * @param configDir - Optional override for the config directory
 * @returns Absolute path to config.toml
 */
export function getConfigPath(configDir?: string): string {
  return join(getConfigDir(configDir), CONFIG_FILE_NAME);
}

/**
 * Creates the config directory (~/.hacienda-cr/) if it doesn't exist.
 *
 * @param configDir - Optional override for the config directory
 */
export async function ensureConfigDir(configDir?: string): Promise<void> {
  const dir = getConfigDir(configDir);
  await mkdir(dir, { recursive: true });
}

/**
 * Checks whether the config file exists.
 *
 * @param configDir - Optional override for the config directory
 * @returns true if config.toml exists
 */
async function configFileExists(configDir?: string): Promise<boolean> {
  try {
    await access(getConfigPath(configDir));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads and parses the raw config file into a ConfigFile record.
 *
 * @param configDir - Optional override for the config directory
 * @returns Parsed config file contents, or empty object if file doesn't exist
 * @throws If the file exists but contains invalid TOML or fails schema validation
 */
async function readConfigFile(configDir?: string): Promise<ConfigFile> {
  const configPath = getConfigPath(configDir);

  if (!(await configFileExists(configDir))) {
    return {};
  }

  const content = await readFile(configPath, "utf-8");

  if (content.trim() === "") {
    return {};
  }

  const parsed = parse(content);

  // Validate the entire config file structure
  const result = ConfigFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid config file at ${configPath}: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Writes a ConfigFile record back to disk as TOML.
 *
 * @param config - The full config file contents
 * @param configDir - Optional override for the config directory
 */
async function writeConfigFile(config: ConfigFile, configDir?: string): Promise<void> {
  await ensureConfigDir(configDir);
  const configPath = getConfigPath(configDir);
  const toml = stringify(config);
  await writeFile(configPath, toml, "utf-8");
}

/**
 * Loads a configuration profile from config.toml and merges it with
 * environment variables for sensitive values.
 *
 * @param profileName - Name of the profile to load (default: "default")
 * @param options - Optional overrides for config dir and env vars
 * @returns The resolved configuration with env vars merged in
 * @throws If the profile doesn't exist or validation fails
 */
export async function loadConfig(
  profileName: string = DEFAULT_PROFILE,
  options: ConfigManagerOptions = {},
): Promise<ResolvedConfig> {
  const configFile = await readConfigFile(options.configDir);
  const profileData = configFile[profileName];

  if (!profileData) {
    throw new Error(
      `Profile "${profileName}" not found in config. ` +
        `Available profiles: ${Object.keys(configFile).join(", ") || "(none)"}. ` +
        `Run the CLI setup command or create ${getConfigPath(options.configDir)} manually.`,
    );
  }

  // Validate the profile data
  const result = ProfileSchema.safeParse(profileData);
  if (!result.success) {
    throw new Error(`Invalid profile "${profileName}": ${result.error.message}`);
  }

  const env = options.env ?? process.env;

  return {
    profile: result.data,
    profileName,
    password: env.HACIENDA_PASSWORD,
    p12Pin: env.HACIENDA_P12_PIN,
  };
}

/**
 * Saves a profile to config.toml. Creates the file/directory if needed.
 * Merges with existing profiles (does not overwrite other profiles).
 *
 * @param profile - The profile data to save
 * @param profileName - Name for the profile (default: "default")
 * @param options - Optional overrides for config dir
 */
export async function saveConfig(
  profile: Profile,
  profileName: string = DEFAULT_PROFILE,
  options: ConfigManagerOptions = {},
): Promise<void> {
  // Validate the profile before saving
  const result = ProfileSchema.safeParse(profile);
  if (!result.success) {
    throw new Error(`Invalid profile data: ${result.error.message}`);
  }

  const configFile = await readConfigFile(options.configDir);
  configFile[profileName] = result.data;
  await writeConfigFile(configFile, options.configDir);
}

/**
 * Lists all available profile names from config.toml.
 *
 * @param options - Optional overrides for config dir
 * @returns Array of profile names, empty if no config file exists
 */
export async function listProfiles(options: ConfigManagerOptions = {}): Promise<string[]> {
  const configFile = await readConfigFile(options.configDir);
  return Object.keys(configFile);
}

/**
 * Deletes a profile from config.toml.
 *
 * @param profileName - Name of the profile to delete
 * @param options - Optional overrides for config dir
 * @returns true if the profile was deleted, false if it didn't exist
 */
export async function deleteProfile(
  profileName: string,
  options: ConfigManagerOptions = {},
): Promise<boolean> {
  const configFile = await readConfigFile(options.configDir);

  if (!(profileName in configFile)) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete configFile[profileName];
  await writeConfigFile(configFile, options.configDir);
  return true;
}
