import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node22",
  outDir: "dist",
  // Keep dependencies external — this is a Node library/CLI, not a browser bundle.
  // tsup bundles workspace deps by default, but external packages should stay external.
  external: [
    "@modelcontextprotocol/sdk",
    "@modelcontextprotocol/sdk/server/mcp.js",
    "@modelcontextprotocol/sdk/server/stdio.js",
    "zod",
    "zod/v4",
  ],
  noExternal: ["@hacienda-cr/sdk", "@hacienda-cr/shared"],
});
