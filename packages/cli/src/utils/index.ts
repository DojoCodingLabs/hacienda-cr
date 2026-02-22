/**
 * CLI utility exports.
 */

export {
  bold,
  dim,
  green,
  red,
  yellow,
  cyan,
  gray,
  colorStatus,
  formatTable,
  outputJson,
  success,
  error,
  warn,
  info,
  detail,
} from "./format.js";
export type { TableColumn } from "./format.js";

export { createAuthenticatedClient } from "./api-client.js";
export type { AuthenticatedClient } from "./api-client.js";
