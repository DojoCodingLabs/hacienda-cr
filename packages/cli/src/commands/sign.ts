/**
 * `hacienda sign` command.
 *
 * Signs an XML document with XAdES-EPES using a .p12 certificate.
 * Stubbed — requires the signing module (spike S-01).
 *
 * @module commands/sign
 */

import { defineCommand } from "citty";
import { warn, outputJson } from "../utils/format.js";

export const signCommand = defineCommand({
  meta: {
    name: "sign",
    description: "Sign an XML document with a .p12 certificate (XAdES-EPES)",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to XML file to sign",
      required: false,
    },
    p12: {
      type: "string",
      description: "Path to .p12 certificate file",
      required: false,
    },
    output: {
      type: "string",
      description: "Output path for signed XML",
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
        error: "The sign command is not yet implemented. Pending signing module (spike S-01).",
      });
    } else {
      warn("The sign command is not yet implemented. Pending signing module (spike S-01).");
      console.log(
        "\nThis command will sign XML documents using XAdES-EPES with a .p12 certificate.",
      );
    }
  },
});
