import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { analyze } from "./analyze.mjs";
import { evaluateCanary } from "./canary.mjs";
import { MIN_LINKS } from "./constants.mjs";
import { discover } from "./discover.mjs";
import { allowedHostsFor, createHttp } from "./http.mjs";
import { currentSet, setById, setForSourceVersion } from "./manifest.mjs";
import { isoDay, parseVersion, sha256Hex } from "./util.mjs";

export function validateSetFlag(manifest, setId) {
  const target = setById(manifest, setId);
  if (!target) throw new Error(`spec:update: set desconocido: ${setId}`);
  if (target.policyOnly === true) {
    throw new Error(`spec:update: set policyOnly no puede ser vigente: ${setId}`);
  }
  return target;
}

export function applySetFlag(manifest, setId) {
  validateSetFlag(manifest, setId);
  if (manifest.currentSet === setId) return manifest;
  manifest.currentSet = setId;
  if (manifest.nextSet && manifest.nextSet.id === setId) delete manifest.nextSet;
  return manifest;
}

function count(bytes) {
  return Buffer.byteLength(bytes);
}

export async function runUpdate({
  manifest,
  schemasDir,
  fetchFn = fetch,
  timeoutMs,
  maxBytes,
  minLinks = MIN_LINKS,
  setFlag,
  now = new Date(),
  fs = { mkdirSync, writeFileSync },
  verifyFn,
}) {
  if (setFlag !== undefined && setFlag !== null) validateSetFlag(manifest, setFlag);
  if (setFlag !== undefined && setFlag !== null) applySetFlag(manifest, setFlag);

  const http = createHttp({
    fetchFn,
    timeoutMs,
    maxBytes,
    allowedHosts: allowedHostsFor(manifest),
  });
  const discovery = await discover({ manifest, http });
  const canary = evaluateCanary({ manifest, discovery, minLinks });
  if (canary.length > 0) {
    return { code: 2, stdout: "", stderr: `${canary.join("\n")}\n`, writes: [] };
  }

  let analysis;
  try {
    analysis = await analyze({ manifest, discovery, http, download: true });
  } catch (error) {
    return {
      code: 2,
      stdout: "",
      stderr: `spec:update: fallo operativo: ${error.message}\n`,
      writes: [],
    };
  }

  const removed = analysis.findings.filter(
    (item) => item.section === 3 && item.kind === "eliminado",
  );
  if (removed.length > 0) {
    const message = removed
      .map(
        (item) =>
          `spec:update: archivo vigilado ausente en su superficie: ${item.path} (${item.surface})`,
      )
      .join("\n");
    return { code: 2, stdout: "", stderr: `${message}\n`, writes: [] };
  }

  const { set } = currentSet(manifest);

  const writes = [];

  for (const finding of analysis.findings) {
    if (
      finding.section === 3 &&
      finding.kind === "agregado" &&
      finding.set === set.id &&
      finding.body
    ) {
      writes.push({ path: finding.path, body: finding.body });
    }
  }

  for (const [path, link] of analysis.matched) {
    const file = analysis.files.find((candidate) => candidate.path === path);
    if (!file) continue;
    if (file.set !== set.id) continue;
    const body = link.body;
    if (!body) continue;
    if (sha256Hex(body) === file.sha256) continue;
    writes.push({ path, body });
  }

  for (const probe of discovery.probes ?? []) {
    if (probe.status !== "ok" || !probe.body) continue;
    if (!probe.entry) {
      const targetSet = setForSourceVersion(
        manifest,
        probe.surfaceId,
        parseVersion(probe.basename),
      );
      if (targetSet)
        writes.push({
          path: `${targetSet.id}/${probe.basename}`,
          body: probe.body,
          setId: targetSet.id,
        });
      continue;
    }
    if (sha256Hex(probe.body) !== probe.entry.sha256) {
      writes.push({ path: probe.entry.path, body: probe.body, setId: probe.entry.set });
    }
  }

  const manifestFiles = manifest.files ?? [];
  const byPath = new Map(manifestFiles.map((file) => [file.path, file]));
  for (const probe of discovery.probes ?? []) {
    if (probe.status !== "ok" || !probe.body || !probe.entry || !probe.lastModified) continue;
    const existing = byPath.get(probe.entry.path);
    if (existing) existing.lastModified = probe.lastModified;
  }
  for (const write of writes) {
    const body = write.body;
    const hash = sha256Hex(body);
    const existing = byPath.get(write.path);
    if (existing) {
      existing.sha256 = hash;
      existing.bytes = count(body);
      existing.vendored = true;
    } else {
      manifestFiles.push({
        path: write.path,
        set: write.setId ?? set.id,
        sha256: hash,
        bytes: count(body),
        vendored: true,
      });
    }
  }
  manifest.files = manifestFiles.sort((a, b) => a.path.localeCompare(b.path));

  const downloadedSets = new Set([set.id]);
  for (const path of analysis.matched.keys()) {
    const file = analysis.files.find((candidate) => candidate.path === path);
    if (file) downloadedSets.add(file.set);
  }
  for (const probe of discovery.probes ?? []) {
    if (probe.status === "ok" && probe.body && probe.entry) downloadedSets.add(probe.entry.set);
  }
  for (const setId of downloadedSets) {
    const downloadedSet = setById(manifest, setId);
    if (downloadedSet) downloadedSet.downloadedAt = isoDay(now);
  }
  manifest.lastSyncedAt = isoDay(now);

  try {
    for (const write of writes) {
      const target = join(schemasDir, write.path);
      fs.mkdirSync(dirname(target), { recursive: true });
      fs.writeFileSync(target, write.body);
    }
    fs.writeFileSync(join(schemasDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    return {
      code: 2,
      stdout: "",
      stderr: `spec:update: fallo al escribir: ${error.message}\n`,
      writes,
    };
  }

  try {
    if (verifyFn) verifyFn({ schemasDir, manifest });
  } catch (error) {
    return {
      code: 2,
      stdout: "",
      stderr: `spec:update: el gate spec:verify falló: ${error.message}\n`,
      writes,
    };
  }

  const summary = `spec:update: OK (${writes.length} archivos escritos, currentSet=${manifest.currentSet})\n`;
  return { code: 0, stdout: summary, stderr: "", writes };
}
