/**
 * Main CLI command definition.
 *
 * Defines the root `hacienda` command with all subcommands.
 * Separated from index.ts so tests can import without triggering runMain().
 *
 * @module main
 */

import { defineCommand } from "citty";
import {
  authCommand,
  submitCommand,
  statusCommand,
  listCommand,
  getCommand,
  signCommand,
  validateCommand,
  lookupCommand,
  draftCommand,
} from "./commands/index.js";

export const PACKAGE_NAME = "@hacienda-cr/cli" as const;
export const VERSION = "0.0.1" as const;

export const main = defineCommand({
  meta: {
    name: "hacienda",
    version: VERSION,
    description: "Costa Rica electronic invoicing CLI (Ministerio de Hacienda API v4.4)",
  },
  subCommands: {
    auth: authCommand,
    submit: submitCommand,
    status: statusCommand,
    list: listCommand,
    get: getCommand,
    sign: signCommand,
    validate: validateCommand,
    lookup: lookupCommand,
    draft: draftCommand,
  },
});
