import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalManifest } from "./package-artifacts.mjs";
test("canonicalizes asynchronous workspace maps while preserving conditional exports", () => {
  const first = {
    name: "test",
    dependencies: { sdk: "0.4.0", shared: "0.4.0" },
    exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
  };
  const second = { ...first, dependencies: { shared: "0.4.0", sdk: "0.4.0" } };
  assert.equal(JSON.stringify(canonicalManifest(first)), JSON.stringify(canonicalManifest(second)));
  assert.deepEqual(Object.keys(canonicalManifest(first).exports["."]), ["types", "import"]);
  assert.deepEqual(Object.keys(first.dependencies), ["sdk", "shared"]);
});
