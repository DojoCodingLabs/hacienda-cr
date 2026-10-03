import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const PACKAGES = [
  "@dojocoding/hacienda-sdk",
  "@dojocoding/hacienda-cli",
  "@dojocoding/hacienda-mcp",
  "@dojocoding/hacienda-shared",
];
const DAY = 86_400_000;
const isoDay = (date) => date.toISOString().slice(0, 10);
const parseDay = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    isoDay(date) !== value
  ) {
    throw new Error(`Invalid npm date: ${value}`);
  }
  return date;
};

export async function collectDownloads({
  fetchFn = fetch,
  packages = PACKAGES,
  now = new Date(),
} = {}) {
  async function get(url) {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`npm request failed (${response.status}): ${url}`);
    return response.json();
  }
  function validateCount(data, name) {
    if (data.package !== name || !Number.isSafeInteger(data.downloads) || data.downloads < 0) {
      throw new Error(`Invalid npm download response for ${name}`);
    }
    parseDay(data.start);
    parseDay(data.end);
    if (data.start > data.end || data.end >= isoDay(now)) {
      throw new Error(`Invalid npm download period for ${name}`);
    }
  }

  const counts = [];
  for (const name of packages) {
    const metadata = await get(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    const created = new Date(metadata.time?.created);
    if (!Number.isFinite(created.getTime()) || created > now)
      throw new Error(`Missing or invalid npm creation date for ${name}`);
    const start = isoDay(created);
    const latest = await get(
      `https://api.npmjs.org/downloads/point/last-day/${encodeURIComponent(name)}`,
    );
    validateCount(latest, name);
    const through = latest.end;
    let cursor = parseDay(start);
    const end = parseDay(through);
    let downloads = 0;
    // Inclusive, non-overlapping windows keep the full lifetime below npm's 18-month request limit.
    while (cursor <= end) {
      const windowEnd = new Date(Math.min(cursor.getTime() + 364 * DAY, end.getTime()));
      const period = `${isoDay(cursor)}:${isoDay(windowEnd)}`;
      const data = await get(
        `https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(name)}`,
      );
      validateCount(data, name);
      if (data.start !== isoDay(cursor) || data.end !== isoDay(windowEnd)) {
        throw new Error(`npm returned an incomplete period for ${name}: ${period}`);
      }
      downloads += data.downloads;
      if (!Number.isSafeInteger(downloads)) throw new Error(`Download total overflow for ${name}`);
      cursor = new Date(windowEnd.getTime() + DAY);
    }
    counts.push({ package: name, start, through, downloads });
  }
  const total = counts.reduce((sum, item) => sum + item.downloads, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Invalid total download count");
  return {
    schemaVersion: 1,
    label: "npm · descargas históricas",
    message: new Intl.NumberFormat("en-US").format(total),
    color: "FF7151",
    labelColor: "201E3D",
    cacheSeconds: 3600,
    total,
    updatedAt: now.toISOString(),
    source: "https://github.com/npm/registry/blob/main/docs/download-counts.md",
    packages: counts,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await collectDownloads();
  // Fetch and validate every package before replacing the last successful snapshot.
  await writeFile(
    new URL("../docs/npm-downloads.json", import.meta.url),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(`Updated npm lifetime downloads: ${result.total}`);
}
