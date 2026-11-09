import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const runner = fileURLToPath(new URL("./validate-sdk-sandbox.mjs", import.meta.url));
function run(command, overrides = {}, args = []) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("HACIENDA_")) delete env[key];
  const result = spawnSync(process.execPath, [runner, command, ...args], {
    encoding: "utf8",
    env: { ...env, ...overrides },
  });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

function tempRun() {
  return mkdtempSync(join(tmpdir(), "sdk-sandbox-run-"));
}

test("auth requires explicit sandbox opt-in even when credentials exist", () => {
  const result = run("auth", { HACIENDA_USERNAME: "private", HACIENDA_PASSWORD: "do-not-print" });
  assert.equal(result.code, "OPT_IN_REQUIRED");
  assert.ok(!JSON.stringify(result).includes("do-not-print"));
});
test("auth refuses a production username before making requests", () => {
  assert.equal(
    run("auth", {
      HACIENDA_SANDBOX_TEST: "1",
      HACIENDA_USERNAME: "test@prod.comprobanteselectronicos.go.cr",
      HACIENDA_PASSWORD: "secret",
    }).code,
    "SANDBOX_USERNAME_REQUIRED",
  );
});
test("preflight lists the missing field without disclosing configured values", () => {
  assert.equal(
    run("preflight", {
      HACIENDA_SANDBOX_TEST: "1",
      HACIENDA_USERNAME: "test@stag.comprobanteselectronicos.go.cr",
    }).code,
    "MISSING_HACIENDA_PASSWORD",
  );
});
test("unrecognized commands fail without network calls", () => {
  assert.equal(run("production").code, "VALIDATION_FAILED");
});

test("document run refuses an unknown family", () => {
  const dir = tempRun();
  try {
    writeFileSync(join(dir, "document.json"), JSON.stringify({ family: "FOO", input: {} }));
    assert.equal(run("sign", {}, [dir]).code, "UNKNOWN_FAMILY");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("document run refuses invalid input", () => {
  const dir = tempRun();
  try {
    writeFileSync(join(dir, "document.json"), JSON.stringify({ family: "FE", input: {} }));
    assert.equal(run("sign", {}, [dir]).code, "INVALID_DOCUMENT_INPUT");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("document run requires a family", () => {
  const dir = tempRun();
  try {
    writeFileSync(join(dir, "document.json"), JSON.stringify({ input: {} }));
    assert.equal(run("sign", {}, [dir]).code, "MISSING_FAMILY");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
