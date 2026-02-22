/**
 * `hacienda lookup` command.
 *
 * Looks up taxpayer economic activities from the Hacienda public API.
 * This endpoint does not require authentication.
 *
 * @module commands/lookup
 */

import { defineCommand } from "citty";
import { lookupTaxpayer } from "@dojocoding/hacienda-sdk";
import { success, error, detail, info, outputJson } from "../utils/format.js";

export const lookupCommand = defineCommand({
  meta: {
    name: "lookup",
    description: "Look up taxpayer economic activities by cedula",
  },
  args: {
    cedula: {
      type: "positional",
      description: "Taxpayer identification number (9-12 digits)",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const cedula = args.cedula;

      // Basic cedula format validation
      if (!/^\d{9,12}$/.test(cedula)) {
        error("Invalid cedula. Must be a 9-12 digit numeric string.");
        process.exitCode = 1;
        return;
      }

      const taxpayer = await lookupTaxpayer(cedula);

      if (args.json) {
        outputJson({
          success: true,
          nombre: taxpayer.nombre,
          tipoIdentificacion: taxpayer.tipoIdentificacion,
          actividades: taxpayer.actividades,
        });
      } else {
        success(`Taxpayer found: ${taxpayer.nombre}`);
        info(`Identification type: ${taxpayer.tipoIdentificacion}`);

        if (taxpayer.actividades.length === 0) {
          detail("Activities", "None registered");
        } else {
          console.log(`\n  Economic activities (${String(taxpayer.actividades.length)}):\n`);
          for (const act of taxpayer.actividades) {
            const status = act.estado === "A" ? "Active" : act.estado;
            console.log(`    [${act.codigo}] ${act.descripcion} (${status})`);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      if (args.json) {
        outputJson({ success: false, error: message });
      } else {
        error(message);
      }
      process.exitCode = 1;
    }
  },
});
