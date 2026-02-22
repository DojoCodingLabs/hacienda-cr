/**
 * `hacienda lookup` command.
 *
 * Looks up taxpayer economic activities from the Hacienda API.
 * Stubbed — requires the API client module.
 *
 * @module commands/lookup
 */

import { defineCommand } from "citty";
import { warn, outputJson } from "../utils/format.js";

export const lookupCommand = defineCommand({
  meta: {
    name: "lookup",
    description: "Look up taxpayer economic activities by cedula",
  },
  args: {
    cedula: {
      type: "positional",
      description: "Taxpayer identification number",
      required: false,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    if (args.json) {
      outputJson({
        success: false,
        error: "The lookup command is not yet implemented. Pending API client module.",
      });
    } else {
      warn("The lookup command is not yet implemented. Pending API client module.");
      console.log("\nThis command will query Hacienda's economic activity API to retrieve");
      console.log("taxpayer information and registered activities by cedula number.");
    }
  },
});
