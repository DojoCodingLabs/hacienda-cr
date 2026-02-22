/**
 * `hacienda auth switch` command.
 *
 * Switches between config profiles.
 *
 * @module commands/auth/switch
 */

import { defineCommand } from "citty";
import { listProfiles, loadConfig } from "@hacienda-cr/sdk";
import { success, warn, detail, info, outputJson, dim } from "../../utils/format.js";

export const switchCommand = defineCommand({
  meta: {
    name: "switch",
    description: "Switch between authentication profiles",
  },
  args: {
    name: {
      type: "positional",
      description: "Profile name to switch to",
      required: false,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const profiles = await listProfiles();

      if (profiles.length === 0) {
        if (args.json) {
          outputJson({ success: false, error: "No profiles configured" });
        } else {
          warn("No profiles configured.");
          console.log(`\nRun ${dim("hacienda auth login")} to set up a profile.`);
        }
        return;
      }

      // If no profile name given, list available profiles
      if (!args.name) {
        if (args.json) {
          outputJson({ profiles });
        } else {
          info("Available profiles:");
          for (const name of profiles) {
            try {
              const config = await loadConfig(name);
              console.log(
                `  ${name} ${dim(`(${config.profile.environment}, ${config.profile.cedula})`)}`,
              );
            } catch {
              console.log(`  ${name} ${dim("(error reading profile)")}`);
            }
          }
          console.log(`\nUsage: ${dim("hacienda auth switch <profile-name>")}`);
        }
        return;
      }

      const profileName = args.name;

      if (!profiles.includes(profileName)) {
        if (args.json) {
          outputJson({
            success: false,
            error: `Profile "${profileName}" not found`,
            availableProfiles: profiles,
          });
        } else {
          warn(`Profile "${profileName}" not found.`);
          info(`Available profiles: ${profiles.join(", ")}`);
        }
        process.exitCode = 1;
        return;
      }

      // Load the profile to verify it's valid
      const config = await loadConfig(profileName);

      if (args.json) {
        outputJson({
          success: true,
          profile: profileName,
          environment: config.profile.environment,
          cedula: config.profile.cedula,
        });
      } else {
        success(`Switched to profile "${profileName}"`);
        detail("Environment", config.profile.environment);
        detail("Cedula", config.profile.cedula);
        console.log(
          `\nNote: Use ${dim("--profile " + profileName)} with other commands, or re-run ${dim("hacienda auth login --profile " + profileName)} to authenticate.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        warn(message);
      }
      process.exitCode = 1;
    }
  },
});
