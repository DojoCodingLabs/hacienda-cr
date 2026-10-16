#!/usr/bin/env node
/**
 * Property-test runner — `pnpm test:properties`.
 *
 * Runs the `*.properties.spec.ts` suites (Money arithmetic and invoice
 * calculation invariants) with a large randomized-case budget. The number of
 * generated cases per property is controlled by `PROPERTY_RUNS` (default
 * 10_000), which each suite reads through `process.env`.
 *
 * The same suites also run under `pnpm test` with a small budget so ordinary
 * test runs stay fast; this script is the exhaustive, CI-gated pass.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const runs = Number(process.env.PROPERTY_RUNS ?? 10_000);
if (!Number.isInteger(runs) || runs < 1) {
  throw new Error(
    `PROPERTY_RUNS must be a positive integer, received: ${process.env.PROPERTY_RUNS}`,
  );
}

const xsdRuns = Number(process.env.XSD_RUNS ?? 200);
if (!Number.isInteger(xsdRuns) || xsdRuns < 1) {
  throw new Error(`XSD_RUNS must be a positive integer, received: ${process.env.XSD_RUNS}`);
}

/** Suites that share the `PROPERTY_RUNS` budget. */
const targets = [
  { pkg: "@dojocoding/hacienda-shared", spec: "src/types/money.properties.spec.ts" },
  { pkg: "@dojocoding/hacienda-sdk", spec: "src/tax/calculator.properties.spec.ts" },
  { pkg: "@dojocoding/hacienda-sdk", spec: "src/documents/document-generation.properties.spec.ts" },
];

const env = { ...process.env, PROPERTY_RUNS: String(runs), XSD_RUNS: String(xsdRuns) };
const started = Date.now();

for (const target of targets) {
  console.log(`\n▶ ${target.pkg} — ${target.spec} (PROPERTY_RUNS=${runs})`);
  execFileSync("pnpm", ["--filter", target.pkg, "exec", "vitest", "run", target.spec], {
    cwd: root,
    env,
    stdio: "inherit",
  });
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `\ntest:properties OK — ${targets.length} suites, PROPERTY_RUNS=${runs} casos por propiedad, ${seconds}s`,
);
