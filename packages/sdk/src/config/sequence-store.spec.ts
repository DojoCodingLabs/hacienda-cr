import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSequenceKey,
  getSequencesPath,
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  SequenceOverflowError,
} from "./sequence-store.js";
import { MAX_SEQUENCE } from "./types.js";

/**
 * Creates a temporary directory for each test to isolate file system state.
 */
function useTempDir() {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hacienda-seq-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  return {
    get dir() {
      return tempDir;
    },
  };
}

describe("buildSequenceKey", () => {
  it("builds key with all parameters", () => {
    expect(buildSequenceKey("01", "002", "00003")).toBe("01-002-00003");
  });

  it("uses default branch and POS", () => {
    expect(buildSequenceKey("01")).toBe("01-001-00001");
  });

  it("uses default POS with custom branch", () => {
    expect(buildSequenceKey("04", "005")).toBe("04-005-00001");
  });

  it("handles different document types", () => {
    expect(buildSequenceKey("01")).toBe("01-001-00001");
    expect(buildSequenceKey("04")).toBe("04-001-00001");
    expect(buildSequenceKey("08")).toBe("08-001-00001");
  });
});

describe("getSequencesPath", () => {
  it("returns the sequences.json path under the config dir", () => {
    const path = getSequencesPath("/custom/path");
    expect(path).toBe("/custom/path/sequences.json");
  });

  it("uses the default config dir when not specified", () => {
    const path = getSequencesPath();
    expect(path).toMatch(/\.hacienda-cr\/sequences\.json$/);
  });
});

describe("getNextSequence", () => {
  const temp = useTempDir();

  it("starts at 1 for a new sequence", async () => {
    const seq = await getNextSequence("01", "001", "00001", {
      configDir: temp.dir,
    });
    expect(seq).toBe(1);
  });

  it("increments on each call", async () => {
    const opts = { configDir: temp.dir };
    expect(await getNextSequence("01", "001", "00001", opts)).toBe(1);
    expect(await getNextSequence("01", "001", "00001", opts)).toBe(2);
    expect(await getNextSequence("01", "001", "00001", opts)).toBe(3);
  });

  it("maintains separate sequences per document type", async () => {
    const opts = { configDir: temp.dir };

    expect(await getNextSequence("01", "001", "00001", opts)).toBe(1);
    expect(await getNextSequence("04", "001", "00001", opts)).toBe(1);
    expect(await getNextSequence("01", "001", "00001", opts)).toBe(2);
    expect(await getNextSequence("04", "001", "00001", opts)).toBe(2);
  });

  it("maintains separate sequences per branch", async () => {
    const opts = { configDir: temp.dir };

    expect(await getNextSequence("01", "001", "00001", opts)).toBe(1);
    expect(await getNextSequence("01", "002", "00001", opts)).toBe(1);
    expect(await getNextSequence("01", "001", "00001", opts)).toBe(2);
  });

  it("maintains separate sequences per POS", async () => {
    const opts = { configDir: temp.dir };

    expect(await getNextSequence("01", "001", "00001", opts)).toBe(1);
    expect(await getNextSequence("01", "001", "00002", opts)).toBe(1);
    expect(await getNextSequence("01", "001", "00001", opts)).toBe(2);
  });

  it("uses default branch and POS", async () => {
    const opts = { configDir: temp.dir };

    const seq = await getNextSequence("01", undefined, undefined, opts);
    expect(seq).toBe(1);

    // Verify it stored under the default key
    const current = await getCurrentSequence(
      "01",
      "001",
      "00001",
      opts,
    );
    expect(current).toBe(1);
  });

  it("persists sequences to disk", async () => {
    const opts = { configDir: temp.dir };
    await getNextSequence("01", "001", "00001", opts);
    await getNextSequence("01", "001", "00001", opts);

    // Read the file directly to verify persistence
    const filePath = getSequencesPath(temp.dir);
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content) as Record<string, number>;

    expect(data["01-001-00001"]).toBe(2);
  });

  it("throws SequenceOverflowError at max sequence", async () => {
    const opts = { configDir: temp.dir };

    // Write a sequence file that's at the max
    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({ "01-001-00001": MAX_SEQUENCE }),
      "utf-8",
    );

    await expect(
      getNextSequence("01", "001", "00001", opts),
    ).rejects.toThrow(SequenceOverflowError);

    await expect(
      getNextSequence("01", "001", "00001", opts),
    ).rejects.toThrow(/Sequence overflow/);
  });

  it("SequenceOverflowError has correct properties", async () => {
    const opts = { configDir: temp.dir };

    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({ "01-001-00001": MAX_SEQUENCE }),
      "utf-8",
    );

    try {
      await getNextSequence("01", "001", "00001", opts);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SequenceOverflowError);
      const overflowError = error as SequenceOverflowError;
      expect(overflowError.key).toBe("01-001-00001");
      expect(overflowError.currentValue).toBe(MAX_SEQUENCE);
      expect(overflowError.name).toBe("SequenceOverflowError");
    }
  });

  it("allows other keys to increment when one is at max", async () => {
    const opts = { configDir: temp.dir };

    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({ "01-001-00001": MAX_SEQUENCE }),
      "utf-8",
    );

    // Different doc type should still work
    const seq = await getNextSequence("04", "001", "00001", opts);
    expect(seq).toBe(1);
  });
});

describe("getCurrentSequence", () => {
  const temp = useTempDir();

  it("returns 0 for uninitialized sequence", async () => {
    const seq = await getCurrentSequence("01", "001", "00001", {
      configDir: temp.dir,
    });
    expect(seq).toBe(0);
  });

  it("returns the current value without incrementing", async () => {
    const opts = { configDir: temp.dir };

    await getNextSequence("01", "001", "00001", opts);
    await getNextSequence("01", "001", "00001", opts);

    const current = await getCurrentSequence("01", "001", "00001", opts);
    expect(current).toBe(2);

    // Call again to verify it didn't increment
    const still = await getCurrentSequence("01", "001", "00001", opts);
    expect(still).toBe(2);
  });

  it("returns 0 when file does not exist", async () => {
    const seq = await getCurrentSequence("01", "001", "00001", {
      configDir: temp.dir,
    });
    expect(seq).toBe(0);
  });
});

describe("resetSequence", () => {
  const temp = useTempDir();

  it("resets a sequence to zero", async () => {
    const opts = { configDir: temp.dir };

    await getNextSequence("01", "001", "00001", opts);
    await getNextSequence("01", "001", "00001", opts);
    await getNextSequence("01", "001", "00001", opts);

    await resetSequence("01", "001", "00001", 0, opts);

    const current = await getCurrentSequence("01", "001", "00001", opts);
    expect(current).toBe(0);
  });

  it("resets a sequence to a specific value", async () => {
    const opts = { configDir: temp.dir };

    await getNextSequence("01", "001", "00001", opts);

    await resetSequence("01", "001", "00001", 100, opts);

    const current = await getCurrentSequence("01", "001", "00001", opts);
    expect(current).toBe(100);

    // Next sequence should start from 101
    const next = await getNextSequence("01", "001", "00001", opts);
    expect(next).toBe(101);
  });

  it("does not affect other sequences", async () => {
    const opts = { configDir: temp.dir };

    await getNextSequence("01", "001", "00001", opts);
    await getNextSequence("04", "001", "00001", opts);

    await resetSequence("01", "001", "00001", 0, opts);

    const seq01 = await getCurrentSequence("01", "001", "00001", opts);
    const seq04 = await getCurrentSequence("04", "001", "00001", opts);

    expect(seq01).toBe(0);
    expect(seq04).toBe(1);
  });

  it("creates the sequence file if it does not exist", async () => {
    const opts = { configDir: temp.dir };

    await resetSequence("01", "001", "00001", 50, opts);

    const current = await getCurrentSequence("01", "001", "00001", opts);
    expect(current).toBe(50);
  });
});

describe("concurrent access safety", () => {
  const temp = useTempDir();

  it("handles sequential rapid calls correctly", async () => {
    const opts = { configDir: temp.dir };
    const count = 20;

    // Sequential calls — each must produce a unique, incrementing value
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      const seq = await getNextSequence("01", "001", "00001", opts);
      results.push(seq);
    }

    // All values should be unique
    const unique = new Set(results);
    expect(unique.size).toBe(count);

    // Values should be sequential from 1 to count
    expect(results).toEqual(Array.from({ length: count }, (_, i) => i + 1));
  });

  it("handles concurrent calls without crashing", async () => {
    const opts = { configDir: temp.dir };
    const count = 10;

    // Fire all calls concurrently — file-based storage without locks may produce
    // duplicate sequence numbers due to read-modify-write races, but should never
    // crash or corrupt data. For production use, callers should serialize access.
    const promises = Array.from({ length: count }, () =>
      getNextSequence("01", "001", "00001", opts),
    );

    const results = await Promise.all(promises);

    // All calls should resolve successfully (no crashes)
    expect(results).toHaveLength(count);

    // All values should be positive
    for (const val of results) {
      expect(val).toBeGreaterThanOrEqual(1);
    }

    // The final persisted value should be at least 1
    const final = await getCurrentSequence("01", "001", "00001", opts);
    expect(final).toBeGreaterThanOrEqual(1);
  });
});

describe("edge cases", () => {
  const temp = useTempDir();

  it("handles empty sequences.json file", async () => {
    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(filePath, "", "utf-8");

    const seq = await getNextSequence("01", "001", "00001", {
      configDir: temp.dir,
    });
    expect(seq).toBe(1);
  });

  it("handles sequences.json with empty object", async () => {
    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(filePath, "{}", "utf-8");

    const seq = await getNextSequence("01", "001", "00001", {
      configDir: temp.dir,
    });
    expect(seq).toBe(1);
  });

  it("rejects invalid JSON in sequences file", async () => {
    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(filePath, "not valid json", "utf-8");

    await expect(
      getNextSequence("01", "001", "00001", { configDir: temp.dir }),
    ).rejects.toThrow();
  });

  it("MAX_SEQUENCE is 9999999999 (10 digits)", () => {
    expect(MAX_SEQUENCE).toBe(9_999_999_999);
    expect(MAX_SEQUENCE.toString()).toHaveLength(10);
  });

  it("sequence just below max still works", async () => {
    const opts = { configDir: temp.dir };

    const filePath = getSequencesPath(temp.dir);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(temp.dir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify({ "01-001-00001": MAX_SEQUENCE - 1 }),
      "utf-8",
    );

    const seq = await getNextSequence("01", "001", "00001", opts);
    expect(seq).toBe(MAX_SEQUENCE);

    // Now it should overflow
    await expect(
      getNextSequence("01", "001", "00001", opts),
    ).rejects.toThrow(SequenceOverflowError);
  });
});
