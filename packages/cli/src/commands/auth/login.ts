/**
 * `hacienda auth login` command.
 *
 * Authenticates with the Hacienda IDP and saves the profile to config.
 *
 * @module commands/auth/login
 */

import { defineCommand } from "citty";
import {
  loadCredentials,
  TokenManager,
  getEnvironmentConfig,
  Environment,
  IdType,
  saveConfig,
  ensureConfigDir,
} from "@hacienda-cr/sdk";
import type { Profile } from "@hacienda-cr/sdk";
import { success, error, detail, outputJson } from "../../utils/format.js";

export const loginCommand = defineCommand({
  meta: {
    name: "login",
    description: "Authenticate with the Hacienda API",
  },
  args: {
    "cedula-type": {
      type: "string",
      description: "Identification type: 01 (Fisica), 02 (Juridica), 03 (DIMEX), 04 (NITE)",
      required: false,
    },
    cedula: {
      type: "string",
      description: "Identification number (cedula)",
      required: false,
    },
    password: {
      type: "string",
      description: "IDP password (or set HACIENDA_PASSWORD env var)",
      required: false,
    },
    environment: {
      type: "string",
      description: 'API environment: "sandbox" or "production"',
      default: "sandbox",
    },
    profile: {
      type: "string",
      description: "Profile name to save as",
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
      const cedulaType = args["cedula-type"];
      const cedula = args.cedula;
      const password = args.password ?? process.env["HACIENDA_PASSWORD"];
      const environment = args.environment as string;
      const profileName = args.profile as string;

      // Validate required fields
      if (!cedulaType) {
        error("Missing --cedula-type. Use 01 (Fisica), 02 (Juridica), 03 (DIMEX), or 04 (NITE).");
        process.exitCode = 1;
        return;
      }

      if (!cedula) {
        error("Missing --cedula. Provide your identification number.");
        process.exitCode = 1;
        return;
      }

      if (!password) {
        error("Missing password. Use --password or set HACIENDA_PASSWORD environment variable.");
        process.exitCode = 1;
        return;
      }

      // Validate environment
      if (environment !== Environment.Sandbox && environment !== Environment.Production) {
        error(`Invalid environment "${environment}". Must be "sandbox" or "production".`);
        process.exitCode = 1;
        return;
      }

      // Validate cedula type
      const validTypes: string[] = [
        IdType.PersonaFisica,
        IdType.PersonaJuridica,
        IdType.DIMEX,
        IdType.NITE,
      ];
      if (!validTypes.includes(cedulaType)) {
        error(`Invalid cedula type "${cedulaType}". Must be 01, 02, 03, or 04.`);
        process.exitCode = 1;
        return;
      }

      // Load credentials (validates format)
      const credentials = loadCredentials({
        idType: cedulaType as IdType,
        idNumber: cedula,
        password,
      });

      // Authenticate
      const envConfig = getEnvironmentConfig(environment as Environment);
      const tokenManager = new TokenManager({ envConfig });
      await tokenManager.authenticate(credentials);

      // Save profile to config (excluding sensitive fields)
      await ensureConfigDir();
      const profile: Profile = {
        environment: environment as "sandbox" | "production",
        cedula_type: cedulaType as "01" | "02" | "03" | "04",
        cedula,
        p12_path: "", // Will be set during signing setup
      };
      await saveConfig(profile, profileName);

      if (args.json) {
        outputJson({
          success: true,
          profile: profileName,
          environment,
          cedula_type: cedulaType,
          cedula,
          message: "Authentication successful",
        });
      } else {
        success("Authentication successful!");
        detail("Profile", profileName);
        detail("Environment", environment);
        detail("Cedula Type", cedulaType);
        detail("Cedula", cedula);
        console.log("\nProfile saved. Tokens are managed automatically per session.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        error(`Authentication failed: ${message}`);
      }
      process.exitCode = 1;
    }
  },
});
