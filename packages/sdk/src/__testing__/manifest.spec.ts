/**
 * Integrity check for packages/sdk/schemas/manifest.json (see the folder's
 * README). Catches silent drift: a re-downloaded or reformatted vendored
 * file must fail here before CI stays green with a manifest that lies.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const schemasDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../schemas");

interface ManifestFile {
  path: string;
  sha256: string;
  bytes: number;
  vendored: boolean;
}

interface Manifest {
  policy: { digestValue: string; resolvedUrl?: string };
  files: ManifestFile[];
}

const manifest = JSON.parse(
  readFileSync(path.join(schemasDir, "manifest.json"), "utf8"),
) as Manifest;

const POLICY_PDF =
  "2024/v4.4/Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf";

const ALLOWLIST = new Set(["manifest.json", "README.md", "codes.json"]);

function listFiles(rel = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(schemasDir, rel), {
    withFileTypes: true,
  })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(relPath));
    else out.push(relPath);
  }
  return out;
}

describe("schema manifest integrity", () => {
  it("declares vendored files with unique, lexicographically sorted paths", () => {
    const paths = manifest.files.map((file) => file.path);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
    expect(manifest.files.every((file) => file.vendored)).toBe(true);
  });

  it("every manifest entry matches the sha256 and byte count on disk", () => {
    for (const entry of manifest.files) {
      const bytes = readFileSync(path.join(schemasDir, entry.path));
      expect(bytes.length, `${entry.path}: bytes`).toBe(entry.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), `${entry.path}: sha256`).toBe(
        entry.sha256,
      );
    }
  });

  it("every file on disk is listed in the manifest", () => {
    const onDisk = listFiles()
      .filter((relPath) => !ALLOWLIST.has(relPath))
      .sort();
    expect(onDisk).toEqual(manifest.files.map((file) => file.path));
  });

  it("policy.digestValue is the base64 SHA-256 of the vendored policy PDF", () => {
    const pdf = readFileSync(path.join(schemasDir, POLICY_PDF));
    expect(createHash("sha256").update(pdf).digest("base64")).toBe(manifest.policy.digestValue);
  });
});
