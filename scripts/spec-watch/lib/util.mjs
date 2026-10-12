import { createHash } from "node:crypto";
import { SCHEMA_EXTENSIONS } from "./constants.mjs";

export function foldName(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function basenameOf(url) {
  const withoutQuery = String(url).split(/[?#]/)[0] ?? "";
  const segments = withoutQuery.split("/");
  const last = segments[segments.length - 1] ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

// Last path segment, but safe to use as a file name: a name scraped from a
// surface is untrusted input, and `decodeURIComponent` can turn `%2F` or
// `%2E%2E` into a traversal once it reaches `join()`.
export function safeBasename(value, origin = String(value)) {
  const basename = basenameOf(value);
  if (!basename || basename === "." || basename.includes("..") || /[\\/]/.test(basename)) {
    throw new Error(`nombre de archivo inseguro: ${basename} (${origin})`);
  }
  return basename;
}

export function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

export function stemOf(name) {
  const ext = extensionOf(name);
  return ext ? name.slice(0, -ext.length) : name;
}

export function isSchemaExtension(name) {
  return SCHEMA_EXTENSIONS.includes(extensionOf(name));
}

export function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function parseVersion(value) {
  const match = String(value).match(/v?(\d+)\.(\d+)/i);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), raw: `${match[1]}.${match[2]}` };
}

export function compareVersions(a, b) {
  if (!a || !b) return 0;
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}

export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}
