import { matchManifestEntry } from "./identity.mjs";
import { currentSet, setForLink, setForSourceVersion, watchedManifestFiles } from "./manifest.mjs";
import { compareVersions, foldName, parseVersion, sha256Hex } from "./util.mjs";
import { isAuxiliaryBasename, isCanaryBasename, isPriorityBasename } from "./watched.mjs";

function addedKey(link) {
  return `${link.surfaceId}|${link.url}`;
}

export async function analyze({ manifest, discovery, http, download = false }) {
  const { set, version } = currentSet(manifest);
  const files = watchedManifestFiles(manifest);
  const findings = [];

  const newerSeen = new Set();
  for (const link of discovery.links) {
    if (!link.watched || !link.version || compareVersions(link.version, version) <= 0) continue;
    const key = foldName(link.basename);
    if (newerSeen.has(key)) continue;
    newerSeen.add(key);
    findings.push({
      section: 1,
      kind: "version-nueva",
      path: link.basename,
      url: link.url,
      version: link.version.raw,
      surface: link.surfaceId,
    });
  }

  const matched = new Map();
  const unmatched = [];
  for (const link of discovery.links) {
    if (!link.watched || !link.version || compareVersions(link.version, version) !== 0) continue;
    const entry = matchManifestEntry(files, link);
    if (!entry) {
      unmatched.push(link);
      continue;
    }
    const existing = matched.get(entry.path);
    if (!existing || (link.isPolicy === true && existing.isPolicy !== true))
      matched.set(entry.path, link);
  }

  const downloads = new Map();
  const addedBodies = new Map();
  if (download) {
    for (const [path, link] of matched) {
      const body = link.body ?? (await http.getBytes(link.url));
      link.body = body;
      downloads.set(path, body);
    }
    for (const link of unmatched) {
      const body = link.body ?? (await http.getBytes(link.url));
      link.body = body;
      addedBodies.set(addedKey(link), body);
    }
  }

  if (download) {
    for (const file of files) {
      if (file.set !== set.id) continue;
      const link = matched.get(file.path);
      if (!link) continue;
      const obtained = sha256Hex(downloads.get(file.path));
      if (obtained === file.sha256) continue;
      const auxiliary = isAuxiliaryBasename(file.basename);
      findings.push({
        section: auxiliary ? 4 : 2,
        kind: "hash",
        path: file.path,
        surface: file.surfaceId,
        expected: file.sha256,
        obtained,
        priority: isPriorityBasename(file.basename),
      });
    }
  }

  for (const link of unmatched) {
    const targetSet = setForLink(manifest, link, version);
    findings.push({
      section: 3,
      kind: "agregado",
      path: targetSet ? `${targetSet.id}/${link.basename}` : link.basename,
      url: link.url,
      surface: link.surfaceId,
      set: targetSet ? targetSet.id : null,
      body: download ? addedBodies.get(addedKey(link)) : undefined,
    });
  }

  for (const file of files) {
    if (file.set !== set.id) continue;
    if (file.surfaceType === "known-file-probe") continue;
    if (matched.has(file.path)) continue;
    if (isCanaryBasename(file.basename)) continue;
    findings.push({
      section: 3,
      kind: "eliminado",
      path: file.path,
      surface: file.surfaceId,
      set: file.set,
    });
  }

  for (const probe of discovery.probes ?? []) {
    if (probe.status === "missing") {
      if (probe.entry) {
        findings.push({
          section: 3,
          kind: "eliminado",
          path: probe.entry.path,
          surface: probe.surfaceId,
          set: probe.entry.set,
        });
      }
      continue;
    }
    if (!probe.entry) {
      findings.push({
        section: 3,
        kind: "agregado",
        path: probe.basename,
        url: probe.url,
        surface: probe.surfaceId,
        set:
          setForSourceVersion(manifest, probe.surfaceId, parseVersion(probe.basename))?.id ?? null,
        body: download ? probe.body : undefined,
      });
      continue;
    }
    if (!download || !probe.body) continue;
    const obtained = sha256Hex(probe.body);
    if (obtained === probe.entry.sha256) continue;
    const auxiliary = isAuxiliaryBasename(probe.entry.basename);
    findings.push({
      section: auxiliary ? 4 : 2,
      kind: "hash",
      path: probe.entry.path,
      surface: probe.surfaceId,
      expected: probe.entry.sha256,
      obtained,
      priority: isPriorityBasename(probe.entry.basename),
    });
  }

  findings.sort((a, b) => a.section - b.section || a.path.localeCompare(b.path));
  return { findings, files, matched };
}
