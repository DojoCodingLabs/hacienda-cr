/**
 * `hacienda draft` command.
 *
 * Creates an invoice JSON draft from a template or interactive prompts.
 * Stubbed — will be fleshed out in a future milestone.
 *
 * @module commands/draft
 */

import { defineCommand } from "citty";
import { warn, outputJson } from "../utils/format.js";

export const draftCommand = defineCommand({
  meta: {
    name: "draft",
    description: "Create an invoice JSON draft from a template",
  },
  args: {
    output: {
      type: "string",
      description: "Output file path for the draft",
      required: false,
    },
    template: {
      type: "string",
      description: "Template type: factura, nota-credito, nota-debito, tiquete",
      default: "factura",
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
        error:
          "The draft command is not yet implemented. It will create invoice templates in a future milestone.",
      });
    } else {
      warn("The draft command is not yet implemented.");
      console.log("\nThis command will generate invoice JSON drafts/templates that can be");
      console.log("edited and submitted via `hacienda submit`.");
      console.log(`\nRequested template type: ${args.template}`);
    }
  },
});
