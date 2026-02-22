/**
 * `hacienda auth` command group.
 *
 * Subcommands: login, status, switch
 *
 * @module commands/auth
 */

import { defineCommand } from "citty";
import { loginCommand } from "./login.js";
import { statusCommand } from "./status.js";
import { switchCommand } from "./switch.js";

export const authCommand = defineCommand({
  meta: {
    name: "auth",
    description: "Authentication management (login, status, switch profiles)",
  },
  subCommands: {
    login: loginCommand,
    status: statusCommand,
    switch: switchCommand,
  },
});
