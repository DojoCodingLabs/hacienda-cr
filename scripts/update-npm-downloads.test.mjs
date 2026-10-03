import assert from "node:assert/strict";
import test from "node:test";
import { collectDownloads } from "./update-npm-downloads.mjs";

const packages = ["@dojo/sdk", "@dojo/cli"];
const now = new Date("2026-10-03T12:00:00Z");
function mockFetch({
  start = "2024-01-01",
  end = "2026-10-02",
  fail = false,
  incomplete = false,
  negative = false,
} = {}) {
  const windows = [];
  return {
    windows,
    fetchFn: async (url) => {
      if (url.includes("registry.npmjs.org"))
        return { ok: true, json: async () => ({ time: { created: `${start}T00:00:00Z` } }) };
      if (fail) return { ok: false, status: 503 };
      const name = decodeURIComponent(url.split("/").at(-1));
      const period = url.split("/").at(-2);
      const [from, through] = period === "last-day" ? [end, end] : period.split(":");
      if (period !== "last-day") windows.push({ name, from, through });
      const days = (Date.parse(through) - Date.parse(from)) / 86_400_000 + 1;
      return {
        ok: true,
        json: async () => ({
          package: name,
          start: from,
          end:
            incomplete && period !== "last-day"
              ? new Date(Date.parse(through) - 86_400_000).toISOString().slice(0, 10)
              : through,
          downloads: negative ? -1 : days,
        }),
      };
    },
  };
}

test("sums the full lifetime across leap years and packages without overlapping windows", async () => {
  const mock = mockFetch();
  const result = await collectDownloads({ ...mock, packages, now });
  const days = (Date.parse("2026-10-02") - Date.parse("2024-01-01")) / 86_400_000 + 1;
  assert.equal(result.total, days * 2);
  assert.equal(result.packages.length, 2);
  for (const name of packages) {
    const ranges = mock.windows.filter((range) => range.name === name);
    assert.equal(ranges[0].from, "2024-01-01");
    assert.equal(ranges.at(-1).through, "2026-10-02");
    ranges.forEach((range, i) => {
      assert.ok((Date.parse(range.through) - Date.parse(range.from)) / 86_400_000 < 365);
      if (i) assert.equal(Date.parse(range.from) - Date.parse(ranges[i - 1].through), 86_400_000);
    });
  }
});

test("a package created after the last available day has zero historical downloads", async () => {
  const mock = mockFetch({ start: "2026-10-03" });
  const result = await collectDownloads({ ...mock, packages, now });
  assert.equal(result.total, 0);
  assert.equal(mock.windows.length, 0);
});

test("request failures reject rather than publish partial totals", async () => {
  await assert.rejects(collectDownloads({ ...mockFetch({ fail: true }), packages, now }), /503/);
});

test("incomplete periods reject rather than silently drop history", async () => {
  await assert.rejects(
    collectDownloads({ ...mockFetch({ incomplete: true }), packages, now }),
    /incomplete period/,
  );
});

test("invalid download counts reject", async () => {
  await assert.rejects(
    collectDownloads({ ...mockFetch({ negative: true }), packages, now }),
    /Invalid npm download response/,
  );
});
