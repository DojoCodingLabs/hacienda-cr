import { AUXILIARY_PREFIXES } from "./constants.mjs";
import { extensionOf, foldName, stemOf } from "./util.mjs";

export function isAuxiliaryBasename(basename) {
  const folded = foldName(basename);
  return AUXILIARY_PREFIXES.some((prefix) => folded.startsWith(prefix));
}

export function isResolutionBasename(basename) {
  const folded = foldName(stemOf(basename));
  return folded.startsWith("resolucion") && folded.includes("general");
}

export function isAnnexBasename(basename) {
  return foldName(stemOf(basename)).startsWith("anexos");
}

export function isWatchedBasename(basename) {
  if (extensionOf(basename) === ".xsd") return true;
  if (isAnnexBasename(basename)) return true;
  if (isAuxiliaryBasename(basename)) return true;
  return isResolutionBasename(basename);
}

export function isCanaryBasename(basename) {
  return (
    extensionOf(basename) === ".xsd" || isAnnexBasename(basename) || isAuxiliaryBasename(basename)
  );
}

export function isPriorityBasename(basename) {
  return isAnnexBasename(basename) || isResolutionBasename(basename);
}
