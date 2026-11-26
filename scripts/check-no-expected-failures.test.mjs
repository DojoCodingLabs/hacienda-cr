import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findExpectedFailures } from "./check-no-expected-failures.mjs";

const script = resolve(import.meta.dirname, "check-no-expected-failures.mjs");
// Built at runtime so this file does not itself contain the guarded pattern.
const fails = (name) => `${name}.${"fails"}(`;

function tree(files) {
  const root = mkdtempSync(join(tmpdir(), "dojo-no-expected-failures-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

// Run from an unrelated cwd: paths must resolve against the scanned root.
function runCli(root) {
  return spawnSync(process.execPath, [script, "--root", root], {
    cwd: tmpdir(),
    encoding: "utf8",
  });
}

test("passes a tree without un-exempted .fails cases", async () => {
  const root = tree({
    "packages/a/src/ok.spec.ts": 'it("works", () => {});\n',
    "shared/src/allowed.spec.ts": `// allowed-fails\n${fails("it")}"documented gap", () => {});\n`,
    "scripts/inline.test.mjs": `${fails("test")}"x", () => {}); // allowed-fails\n`,
    "packages/a/node_modules/dep/bad.spec.ts": `${fails("it")}"ignored", () => {});\n`,
  });
  try {
    const result = await findExpectedFailures(root);
    assert.deepEqual(result.offending, []);
    assert.deepEqual(result.unreadable, []);
    assert.equal(result.scanned, 3);
    const cli = runCli(root);
    assert.equal(cli.status, 0, cli.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports each un-exempted it.fails/test.fails with its relative path and line", async () => {
  const root = tree({
    "packages/a/src/bad.spec.ts": `it("ok", () => {});\n${fails("it")}"silenced", () => {});\n`,
    "scripts/bad.test.mjs": `${fails("test")}"silenced", () => {});\n`,
    "scripts/helper.mjs": `${fails("it")}"not a test file", () => {});\n`,
  });
  try {
    const result = await findExpectedFailures(root);
    assert.deepEqual(result.offending, [
      { file: "packages/a/src/bad.spec.ts", line: 2 },
      { file: "scripts/bad.test.mjs", line: 1 },
    ]);
    const cli = runCli(root);
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /packages\/a\/src\/bad\.spec\.ts:2/);
    assert.match(cli.stderr, /scripts\/bad\.test\.mjs:1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails instead of skipping a spec file it cannot read", async () => {
  const root = tree({ "shared/src/ok.spec.ts": 'it("ok", () => {});\n' });
  try {
    symlinkSync(join(root, "missing-target.ts"), join(root, "shared/src/broken.spec.ts"));
    const result = await findExpectedFailures(root);
    assert.deepEqual(result.offending, []);
    assert.deepEqual(
      result.unreadable.map(({ file }) => file),
      ["shared/src/broken.spec.ts"],
    );
    const cli = runCli(root);
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /no se pudieron leer.*\n.*shared\/src\/broken\.spec\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the repository itself has no un-exempted .fails cases", async () => {
  const result = await findExpectedFailures(resolve(import.meta.dirname, ".."));
  assert.deepEqual(result.unreadable, []);
  assert.deepEqual(result.offending, []);
  assert.ok(result.scanned > 0);
});
