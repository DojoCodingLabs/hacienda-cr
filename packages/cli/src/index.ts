/**
 * @dojocoding/hacienda-cli
 *
 * CLI entry point for Costa Rica electronic invoicing.
 * Provides the `hacienda` command for submitting, querying, and managing invoices.
 *
 * @example
 * ```bash
 * hacienda auth login --cedula-type 02 --cedula 3101234567
 * hacienda submit invoice.json
 * hacienda status <clave>
 * hacienda list
 * ```
 */

import { runMain } from "citty";
import { main } from "./main.js";

// Re-export public constants
export { PACKAGE_NAME, VERSION, main } from "./main.js";

runMain(main);
