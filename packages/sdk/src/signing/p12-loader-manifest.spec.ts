/**
 * Packaging invariant: the published SDK must not require a PKCS#12 parser at
 * install time. Consumers that never load a `.p12` must not inherit the
 * `node-forge` advisory, while the repository keeps the parser for its tests.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

const manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

describe("SDK manifest – optional PKCS#12 parser", () => {
  it("does not require node-forge at runtime", () => {
    expect(manifest.dependencies?.["node-forge"]).toBeUndefined();
  });

  it("declares node-forge as an optional peer dependency", () => {
    expect(manifest.peerDependencies?.["node-forge"]).toBeDefined();
    expect(manifest.peerDependenciesMeta?.["node-forge"]?.optional).toBe(true);
  });

  it("keeps node-forge available to the repository tests", () => {
    expect(manifest.devDependencies?.["node-forge"]).toBeDefined();
  });
});
