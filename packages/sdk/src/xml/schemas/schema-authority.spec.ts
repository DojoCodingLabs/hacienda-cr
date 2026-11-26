/**
 * Golden test for the declared schema authority.
 *
 * The April 2026 revision of Anexos y Estructuras v4.4 is mandatory since
 * 2026-11-01 (Hacienda, "Actualización de los Anexos y Estructuras versión
 * 4.4", https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf).
 * `manifest.json` therefore declares `2026/v4.4` as `currentSet`, and the SDK
 * build embeds that set. The SHA-256 values below were taken from the files
 * served by https://www.hacienda.go.cr/docs/<File>_V4.4.xsd on 2026-11-26
 * (see docs/specs/v4-4-schema-provenance.md). They are pinned here on purpose,
 * independently of the manifest, so a re-vendoring that changes bytes has to
 * update this table, the manifest and the provenance record together.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemasRoot = path.resolve(here, "../../../schemas");

interface ManifestFile {
  path: string;
  set: string | null;
  sha256: string;
  bytes: number;
  vendored: boolean;
}
interface Manifest {
  currentSet: string;
  codesSet?: string;
  nextSet?: unknown;
  sets: { id: string; effectiveFrom?: string; sourceSurface: string }[];
  files: ManifestFile[];
}

const manifest = JSON.parse(
  readFileSync(path.join(schemasRoot, "manifest.json"), "utf8"),
) as Manifest;

const GOLDEN_2026: Record<string, { sha256: string; bytes: number }> = {
  "FacturaElectronica_V4.4.xsd": {
    sha256: "926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f",
    bytes: 119689,
  },
  "FacturaElectronicaCompra_V4.4.xsd": {
    sha256: "57e4cedb12d5045884670ff2e4795d2027e69b96d45752f60cd1a1930e2768a3",
    bytes: 97300,
  },
  "FacturaElectronicaExportacion_V4.4.xsd": {
    sha256: "e571d8296bb74e86cb9ef7889601844c61ac50bedca90aa8d52badf15198242e",
    bytes: 101881,
  },
  "MensajeHacienda_V4.4.xsd": {
    sha256: "b2606156042b7aa7b7f7f61945f0ff1323661b43b5a1489ad5eafad1c52fd25e",
    bytes: 7799,
  },
  "MensajeReceptor_V4.4.xsd": {
    sha256: "b883e3a9321eadf2ccc1a9dc853d9e3bd483918dcd6e2152d902ddf2f244365f",
    bytes: 6564,
  },
  "NotaCreditoElectronica_V4.4.xsd": {
    sha256: "b7ed3347c5599e78e5683d9ae83842695ab9497e173df9cd3be8d77c0851f556",
    bytes: 123011,
  },
  "NotaDebitoElectronica_V4.4.xsd": {
    sha256: "3709389ccc434fb1ef4571079b1a628654fa04f07c1f3f1044b2416ba12eb7ff",
    bytes: 123029,
  },
  "ReciboElectronicoPago_V4.4.xsd": {
    sha256: "86e3aa5f0615b757a3b2e9c300973d573ac321f76adba7b4b05e59d854da82b7",
    bytes: 41655,
  },
  "TiqueteElectronico_V4.4.xsd": {
    sha256: "d7783baf818f316596d0b58b17481be689595982a248d98102d707f72967ae6e",
    bytes: 117940,
  },
};

describe("schema authority", () => {
  it("declares 2026/v4.4 as the current set and keeps 2024/v4.4 as the previous set", () => {
    expect(manifest.currentSet).toBe("2026/v4.4");
    // No published set becomes mandatory later, so the key is omitted.
    expect("nextSet" in manifest).toBe(false);
    const ids = manifest.sets.map((set) => set.id);
    expect(ids).toContain("2024/v4.4");
    const current = manifest.sets.find((set) => set.id === "2026/v4.4");
    expect(current?.effectiveFrom).toBe("2026-11-01");
    expect(current?.sourceSurface).toBe("ovi");
  });

  it("records exactly the nine pinned 2026 XSDs for the current set", () => {
    const xsds = manifest.files
      .filter((file) => file.set === "2026/v4.4" && file.path.endsWith(".xsd"))
      .map((file) => file.path.slice("2026/v4.4/".length))
      .sort();
    expect(xsds).toEqual(Object.keys(GOLDEN_2026).sort());
  });

  it.each(Object.entries(GOLDEN_2026))(
    "vendored 2026/v4.4/%s matches the recorded hash and size",
    (name, golden) => {
      const entry = manifest.files.find((file) => file.path === `2026/v4.4/${name}`);
      expect(entry).toMatchObject({ sha256: golden.sha256, bytes: golden.bytes, vendored: true });
      const bytes = readFileSync(path.join(schemasRoot, "2026/v4.4", name));
      expect(bytes.length).toBe(golden.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(golden.sha256);
    },
  );

  it("embeds only the current set in the SDK build", () => {
    const source = readFileSync(path.join(here, "index.ts"), "utf8");
    const imported = [...source.matchAll(/schemas\/(\d{4}\/v[\d.]+)\/([^"?]+)\?raw/g)];
    expect(imported).toHaveLength(Object.keys(GOLDEN_2026).length);
    for (const [, set, name] of imported) {
      expect(set).toBe(manifest.currentSet);
      expect(Object.keys(GOLDEN_2026)).toContain(name);
    }
  });
});
