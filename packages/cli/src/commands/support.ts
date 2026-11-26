/**
 * `hacienda support` command.
 *
 * Prints the SDK document-family support matrix: what can be built, signed
 * and submitted, and which real Hacienda evidence exists. Offline.
 *
 * @module commands/support
 */

import { defineCommand } from "citty";
import { getFamilySupport, SUPPORT_MATRIX_URL } from "@dojocoding/hacienda-sdk";
import { formatTable, info, outputJson } from "../utils/format.js";

export const supportCommand = defineCommand({
  meta: {
    name: "support",
    description: "Show which document families can be built, signed and submitted",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  run({ args }) {
    const matrix = getFamilySupport();
    if (args.json) {
      outputJson({ success: true, docsUrl: SUPPORT_MATRIX_URL, families: matrix });
      return;
    }
    const yesNo = (value: unknown) => (value ? "yes" : "no");
    console.log(
      formatTable(
        [
          { header: "Family", key: "family" },
          { header: "Types", key: "types" },
          { header: "Legacy", key: "legacy", format: yesNo },
          { header: "Exact", key: "exact", format: yesNo },
          { header: "XSD", key: "xsd", format: yesNo },
          { header: "Submit", key: "submit" },
          { header: "Sandbox", key: "sandbox" },
          { header: "Production", key: "production" },
        ],
        matrix.map((row) => ({
          family: row.family,
          types: row.documentTypes.join("/"),
          legacy: row.build.legacyNumber,
          exact: row.build.exact.length > 0,
          xsd: row.xsdConformance,
          submit: row.submit,
          sandbox: row.sandboxEvidence ? "accepted" : "none",
          production: row.productionEvidence ? "recorded" : "none",
        })),
      ),
    );
    for (const row of matrix) if (row.note) info(`${row.family}: ${row.note}`);
    info(`Details: ${SUPPORT_MATRIX_URL}`);
  },
});
