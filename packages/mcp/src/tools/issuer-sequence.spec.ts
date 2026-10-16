import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { issuerSequenceDirectory, nextIssuerSequence } from "./issuer-sequence.js";

describe("MCP local numbering isolation", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "hacienda-issuer-series-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const id = "3101234567";
  it("allocates independent series for issuer, environment, document, branch and terminal", async () => {
    const next = (
      env: "sandbox" | "production",
      issuer = id,
      type = "01",
      branch = "001",
      pos = "00001",
    ) => nextIssuerSequence(env, "02", issuer, type, branch, pos, directory);
    expect(await next("sandbox")).toBe(1);
    expect(await next("sandbox")).toBe(2);
    expect(await next("sandbox", "3107654321")).toBe(1);
    expect(await next("production")).toBe(1);
    expect(await next("sandbox", id, "04")).toBe(1);
    expect(await next("sandbox", id, "01", "002")).toBe(1);
    expect(await next("sandbox", id, "01", "001", "00002")).toBe(1);
  });
  it("serializes concurrent allocations without duplicates and survives subsequent calls", async () => {
    const values = await Promise.all(
      Array.from({ length: 10 }, () =>
        nextIssuerSequence("sandbox", "02", id, "01", "001", "00001", directory),
      ),
    );
    expect(values.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(await nextIssuerSequence("sandbox", "02", id, "01", "001", "00001", directory)).toBe(11);
  });
  it("blocks an unseeded scoped series when legacy numbering exists", async () => {
    await writeFile(join(directory, "sequences.json"), JSON.stringify({ "01-001-00001": 500 }));
    await expect(
      nextIssuerSequence("sandbox", "02", id, "01", "001", "00001", directory),
    ).rejects.toThrow("Migrate and seed");
  });
  it("never lets identity strings escape the namespace directory", () => {
    const path = issuerSequenceDirectory("sandbox", "02", "../../outside", directory);
    expect(path.startsWith(join(directory, "issuer-sequences", "sandbox") + "/")).toBe(true);
  });
});
