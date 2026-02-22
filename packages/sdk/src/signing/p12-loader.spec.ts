/**
 * Tests for PKCS#12 (.p12) loader error paths.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { loadP12 } from "./p12-loader.js";
import { SigningError } from "../errors.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_P12_PIN = "test1234";

let p12Buffer: Buffer | undefined;

beforeAll(() => {
  const tempDir = mkdtempSync(join(tmpdir(), "hacienda-p12-test-"));
  const keyPath = join(tempDir, "test.key");
  const certPath = join(tempDir, "test.crt");
  const p12Path = join(tempDir, "test.p12");

  try {
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: "pipe" });
    execSync(
      `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=Test/O=TestOrg/C=CR"`,
      { stdio: "pipe" },
    );
    try {
      execSync(
        `openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -passout pass:${TEST_P12_PIN} -legacy`,
        { stdio: "pipe" },
      );
    } catch {
      execSync(
        `openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -passout pass:${TEST_P12_PIN}`,
        { stdio: "pipe" },
      );
    }
    p12Buffer = readFileSync(p12Path);
  } catch {
    console.warn("openssl not available, wrong-PIN test will be skipped");
  }

  return () => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("loadP12 – error paths", () => {
  it("throws SigningError for invalid/corrupt buffer", async () => {
    const corruptBuffer = Buffer.from("not a valid p12 file contents");

    await expect(loadP12(corruptBuffer, "1234")).rejects.toThrow(SigningError);
  });

  it("throws SigningError for wrong PIN", async () => {
    if (!p12Buffer) return;

    await expect(loadP12(p12Buffer, "wrong-pin")).rejects.toThrow(SigningError);
  });

  it("throws SigningError for empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);

    await expect(loadP12(emptyBuffer, "any-pin")).rejects.toThrow(SigningError);
  });
});
