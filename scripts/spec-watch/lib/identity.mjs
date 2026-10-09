import { compareVersions, foldName, isSchemaExtension, stemOf } from "./util.mjs";

function exactKey(basename, version) {
  return `${foldName(basename)}|${version?.raw ?? ""}`;
}

function stemKey(basename, version) {
  return `${foldName(stemOf(basename))}|${version?.raw ?? ""}`;
}

function sameSurfaceOrUnique(candidates, link) {
  const sameSurface = candidates.find((file) => file.surfaceId === link.surfaceId);
  if (sameSurface) return sameSurface;
  return candidates.length === 1 ? candidates[0] : null;
}

export function matchManifestEntry(files, link) {
  if (!link.version) return null;
  const sameVersion = files.filter((file) => compareVersions(file.version, link.version) === 0);
  const exact = sameVersion.filter(
    (file) => exactKey(file.basename, file.version) === exactKey(link.basename, link.version),
  );
  if (exact.length) return sameSurfaceOrUnique(exact, link);

  if (!isSchemaExtension(link.basename)) return null;
  const byStem = sameVersion.filter(
    (file) =>
      isSchemaExtension(file.basename) &&
      stemKey(file.basename, file.version) === stemKey(link.basename, link.version),
  );
  return sameSurfaceOrUnique(byStem, link);
}

export function identitiesMatch(file, link) {
  if (compareVersions(file.version, link.version) !== 0) return false;
  if (file.surfaceId !== link.surfaceId) return false;
  if (foldName(file.basename) === foldName(link.basename)) return true;
  return (
    isSchemaExtension(file.basename) &&
    isSchemaExtension(link.basename) &&
    foldName(stemOf(file.basename)) === foldName(stemOf(link.basename))
  );
}
