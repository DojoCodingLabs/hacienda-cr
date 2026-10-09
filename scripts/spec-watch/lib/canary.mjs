import { MIN_LINKS } from "./constants.mjs";
import { identitiesMatch } from "./identity.mjs";
import { currentSet, watchedManifestFiles } from "./manifest.mjs";
import { foldName } from "./util.mjs";
import { isCanaryBasename } from "./watched.mjs";

function probeFailures(manifest, discovery) {
  const failures = [];
  const records = discovery.probes ?? [];
  for (const surface of manifest.surfaces ?? []) {
    if (surface.type !== "known-file-probe") continue;
    for (const name of surface.knownFiles ?? []) {
      const record = records.find(
        (candidate) =>
          candidate.surfaceId === surface.id && foldName(candidate.basename) === foldName(name),
      );
      if (!record || record.status === "missing") {
        failures.push(`spec:watch: superficie ${surface.id}: archivo sin responder ${name}`);
      }
    }
  }
  return failures;
}

export function evaluateCanary({ manifest, discovery, minLinks = MIN_LINKS }) {
  const failures = [];
  for (const surface of manifest.surfaces ?? []) {
    const status = discovery.surfaceStatus?.[surface.id];
    if (!status || status.error) {
      failures.push(
        `spec:watch: superficie ${surface.id}: inaccesible (${status?.error ?? "sin respuesta"})`,
      );
      continue;
    }
    const minimum = minLinks[surface.type];
    if (minimum === undefined) continue;
    const count = status.count ?? 0;
    if (count === 0) {
      failures.push(
        `spec:watch: superficie ${surface.id}: parseo vacío (0 enlaces, mínimo ${minimum})`,
      );
    } else if (count < minimum) {
      failures.push(`spec:watch: superficie ${surface.id}: ${count} enlaces, mínimo ${minimum}`);
    }
  }

  failures.push(...probeFailures(manifest, discovery));

  const { set } = currentSet(manifest);
  const known = watchedManifestFiles(manifest).filter(
    (file) =>
      file.set === set.id &&
      file.surfaceType !== "known-file-probe" &&
      isCanaryBasename(file.basename),
  );
  for (const file of known) {
    const found = discovery.links.some((link) => link.watched && identitiesMatch(file, link));
    if (!found) {
      failures.push(
        `spec:watch: superficie ${file.surfaceId}: archivo conocido faltante ${file.path}`,
      );
    }
  }
  return failures;
}
