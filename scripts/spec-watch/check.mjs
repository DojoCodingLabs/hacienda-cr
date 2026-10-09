#!/usr/bin/env node
import { resolve } from "node:path";
import { runCheck } from "./lib/check-core.mjs";
import { loadManifest } from "./lib/manifest.mjs";

const override = process.env.SPEC_WATCH_SCHEMAS_DIR;
const schemasDir = override
  ? resolve(process.cwd(), override)
  : resolve(import.meta.dirname, "..", "..", "packages", "sdk", "schemas");

const manifest = loadManifest(schemasDir);
const result = await runCheck({ manifest });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.code);
