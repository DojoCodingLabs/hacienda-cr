import { watchedManifestFiles } from "./manifest.mjs";
import { foldName } from "./util.mjs";

export function probeUrl(surface, basename) {
  if (/[/?#\\]/.test(basename) || basename.includes("..")) {
    throw new Error(`knownFiles con nombre inválido: ${surface.id}/${basename}`);
  }
  const base = surface.baseUrl.endsWith("/") ? surface.baseUrl : `${surface.baseUrl}/`;
  return new URL(basename, base).href;
}

export function probeTargets(manifest, surface) {
  const names = [];
  const seen = new Set();
  for (const name of surface.knownFiles ?? []) {
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  for (const file of watchedManifestFiles(manifest)) {
    if (file.surfaceId !== surface.id || seen.has(file.basename)) continue;
    seen.add(file.basename);
    names.push(file.basename);
  }
  return names;
}

function entryFor(manifest, surfaceId, basename) {
  const folded = foldName(basename);
  return (
    watchedManifestFiles(manifest).find(
      (file) => file.surfaceId === surfaceId && foldName(file.basename) === folded,
    ) ?? null
  );
}

function needsFetch(entry, meta) {
  if (!entry) return true;
  if (meta.methodNotAllowed) return true;
  if (meta.contentLength !== null && meta.contentLength !== entry.bytes) return true;
  if (entry.lastModified && meta.lastModified && entry.lastModified !== meta.lastModified)
    return true;
  if (!entry.lastModified || !meta.lastModified) return true;
  return false;
}

export async function probeSurface({ manifest, surface, http }) {
  const records = [];
  for (const basename of probeTargets(manifest, surface)) {
    const url = probeUrl(surface, basename);
    const entry = entryFor(manifest, surface.id, basename);
    const meta = await http.head(url);
    if (meta.missing || meta.methodNotAllowed || needsFetch(entry, meta)) {
      const fetched = await http.getMeta(url);
      if (fetched.missing) {
        records.push({
          surfaceId: surface.id,
          surfaceType: surface.type,
          basename,
          url,
          entry,
          status: "missing",
        });
        continue;
      }
      records.push({
        surfaceId: surface.id,
        surfaceType: surface.type,
        basename,
        url,
        entry,
        status: "ok",
        body: fetched.body,
        lastModified: fetched.lastModified,
        fetched: true,
      });
      continue;
    }
    records.push({
      surfaceId: surface.id,
      surfaceType: surface.type,
      basename,
      url,
      entry,
      status: "ok",
      body: null,
      lastModified: meta.lastModified,
      fetched: false,
    });
  }
  return records;
}
