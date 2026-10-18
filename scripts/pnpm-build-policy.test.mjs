import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { create } from "tar";

// Exercise the installed CLI and real workspace policy with a harmless, owned
// dependency postinstall. No registry request or global configuration mutation.
test("pnpm's actual install refuses an unreviewed dependency build without executing it", async () => {
  const root = resolve(import.meta.dirname, ".."),
    fixture = mkdtempSync(join(tmpdir(), "dojo-pnpm-build-policy-"));
  try {
    const packageDir = join(fixture, "package"),
      consumer = join(fixture, "consumer"),
      marker = join(fixture, "unreviewed-script-ran");
    mkdirSync(packageDir);
    mkdirSync(consumer);
    writeFileSync(
      join(packageDir, "package.json"),
      JSON.stringify({
        name: "dojo-unreviewed-lifecycle-fixture",
        version: "1.0.0",
        scripts: { postinstall: "node postinstall.cjs" },
      }),
    );
    writeFileSync(
      join(packageDir, "postinstall.cjs"),
      `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'unexpected');`,
    );
    await create({ gzip: true, cwd: fixture, file: join(fixture, "fixture.tgz") }, ["package"]);
    writeFileSync(
      join(consumer, "package.json"),
      JSON.stringify({
        name: "dojo-pnpm-build-policy-check",
        private: true,
        dependencies: { "dojo-unreviewed-lifecycle-fixture": "file:../fixture.tgz" },
      }),
    );
    writeFileSync(
      join(consumer, "pnpm-workspace.yaml"),
      readFileSync(join(root, "pnpm-workspace.yaml")),
    );
    const result = spawnSync(
      "pnpm",
      ["install", "--offline", "--ignore-workspace", "--store-dir", join(fixture, "store")],
      {
        cwd: consumer,
        encoding: "utf8",
        timeout: 20000,
      },
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /ERR_PNPM_IGNORED_BUILDS/);
    assert.equal(existsSync(marker), false, "unreviewed dependency script must not execute");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
