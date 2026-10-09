import { readFileSync } from "node:fs";
import { join } from "node:path";
import { basenameOf, compareVersions, parseVersion } from "./util.mjs";

export function loadManifest(schemasDir) {
  return JSON.parse(readFileSync(join(schemasDir, "manifest.json"), "utf8"));
}

export function surfaceById(manifest, id) {
  return (manifest.surfaces ?? []).find((surface) => surface.id === id) ?? null;
}

export function setById(manifest, id) {
  return (manifest.sets ?? []).find((set) => set.id === id) ?? null;
}

export function versionOfSet(set) {
  return parseVersion(set?.version ?? set?.id);
}

export function currentSet(manifest) {
  const set = setById(manifest, manifest.currentSet);
  if (!set) throw new Error(`manifest.currentSet desconocido: ${manifest.currentSet}`);
  if (set.policyOnly === true)
    throw new Error(`manifest.currentSet es policyOnly: ${manifest.currentSet}`);
  const version = versionOfSet(set);
  if (!version) throw new Error(`set vigente sin versión: ${set.id}`);
  return { set, version };
}

export function setForLink(manifest, link, version) {
  const candidates = (manifest.sets ?? []).filter(
    (set) =>
      set.sourceSurface === link.surfaceId &&
      versionOfSet(set) &&
      compareVersions(versionOfSet(set), version) === 0,
  );
  const current = candidates.find((set) => set.id === manifest.currentSet);
  return current ?? candidates[0] ?? null;
}

export function setForSourceVersion(manifest, surfaceId, version) {
  if (!version) return null;
  const candidates = (manifest.sets ?? []).filter(
    (set) =>
      set.sourceSurface === surfaceId &&
      versionOfSet(set) &&
      compareVersions(versionOfSet(set), version) === 0,
  );
  const current = candidates.find((set) => set.id === manifest.currentSet);
  return current ?? candidates[0] ?? null;
}

export function watchedManifestFiles(manifest) {
  const files = [];
  for (const file of manifest.files ?? []) {
    if (!file || file.set === null || file.set === undefined) continue;
    const set = setById(manifest, file.set);
    if (!set) continue;
    const surface = surfaceById(manifest, set.sourceSurface);
    const version = versionOfSet(set);
    if (!surface || !version) continue;
    files.push({
      path: file.path,
      basename: basenameOf(file.path),
      sha256: file.sha256,
      bytes: file.bytes,
      lastModified: file.lastModified ?? null,
      vendored: file.vendored === true,
      set: file.set,
      surfaceId: surface.id,
      surfaceType: surface.type,
      version,
    });
  }
  return files;
}
