/**
 * `hacienda auth status` command.
 *
 * Shows current authentication status from the config file.
 *
 * @module commands/auth/status
 */

import { defineCommand } from "citty";
import { loadConfig, listProfiles, getConfigPath } from "@dojocoding/hacienda-sdk";
import { success, warn, detail, info, outputJson, dim } from "../../utils/format.js";

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Show current authentication status",
  },
  args: {
    profile: {
      type: "string",
      description: "Profile name to check",
      default: "default",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const profileName = args.profile as string;
      const profiles = await listProfiles();

      if (profiles.length === 0) {
        if (args.json) {
          outputJson({
            authenticated: false,
            profiles: [],
            configPath: getConfigPath(),
          });
        } else {
          warn("No profiles configured.");
          console.log(`\nRun ${dim("hacienda auth login")} to set up authentication.`);
        }
        return;
      }

      const config = await loadConfig(profileName);

      if (args.json) {
        outputJson({
          authenticated: true,
          profileName: config.profileName,
          environment: config.profile.environment,
          cedula_type: config.profile.cedula_type,
          cedula: config.profile.cedula,
          p12_path: config.profile.p12_path,
          hasPassword: config.password !== undefined,
          hasP12Pin: config.p12Pin !== undefined,
          configPath: getConfigPath(),
          availableProfiles: profiles,
        });
      } else {
        success("Profile configured");
        detail("Profile", config.profileName);
        detail("Environment", config.profile.environment);
        detail("Cedula Type", config.profile.cedula_type);
        detail("Cedula", config.profile.cedula);
        detail("P12 Path", config.profile.p12_path || "(not set)");
        detail("Password", config.password ? "(set via HACIENDA_PASSWORD)" : "(not set)");
        detail("P12 PIN", config.p12Pin ? "(set via HACIENDA_P12_PIN)" : "(not set)");
        detail("Config File", getConfigPath());

        if (profiles.length > 1) {
          info(`Available profiles: ${profiles.join(", ")}`);
        }

        console.log(`\nNote: Tokens are obtained per session via ${dim("hacienda auth login")}.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ authenticated: false, error: message });
      } else {
        warn(message);
        console.log(`\nRun ${dim("hacienda auth login")} to set up authentication.`);
      }
    }
  },
});
