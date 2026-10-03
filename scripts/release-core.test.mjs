import { test } from "node:test";
import assert from "node:assert/strict";
import {
  integrity,
  validateRelease,
  publicationAction,
  registryMetadata,
  planPublication,
  publishPlan,
  verifyPublishedArtifact,
} from "./release-core.mjs";
const artifact = {
  name: "@example/sdk",
  version: "0.4.0",
  integrity: integrity(Buffer.from("verified bytes")),
};
const metadata = { ...artifact, dist: { integrity: artifact.integrity } };
const pkg = { ...artifact, engines: { node: ">=22" }, publishConfig: { access: "public" } };
test("release rejects mismatched tags and pending changesets", () => {
  validateRelease("v0.4.0", [pkg], []);
  for (const tag of ["../unsafe", "v0.3.0", "v0.4.0-beta.1", undefined])
    assert.throws(() => validateRelease(tag, [pkg], []));
  assert.throws(() => validateRelease("v0.4.0", [pkg], ["pending.md"]));
});
test("recovery skips only the exact published artifact", () => {
  assert.equal(publicationAction(null, artifact, false), "publish");
  assert.throws(() => publicationAction(metadata, artifact, false));
  assert.equal(publicationAction(metadata, artifact, true), "skip");
  assert.throws(() =>
    publicationAction({ ...metadata, dist: { integrity: "different" } }, artifact, true),
  );
});
test("registry failures are never interpreted as missing versions", async () => {
  for (const response of [
    new Response("failure", { status: 500 }),
    new Response("{}", { status: 404 }),
    new Response("{}"),
  ])
    await assert.rejects(registryMetadata(artifact.name, artifact.version, async () => response));
  assert.equal(
    await registryMetadata(
      artifact.name,
      artifact.version,
      async () => new Response('{"error":"Not found"}', { status: 404 }),
    ),
    null,
  );
  await assert.rejects(
    registryMetadata(artifact.name, artifact.version, async () => {
      throw new Error("offline");
    }),
  );
});
test("preflight checks all targets before any publication", async () => {
  const checked = [];
  await assert.rejects(
    planPublication([artifact, { ...artifact, name: "@example/cli" }], false, async (name) => {
      checked.push(name);
      return name === artifact.name ? null : metadata;
    }),
  );
  assert.equal(checked.length, 2);
});
test("partial publish stops dependents and identical-artifact recovery completes them", async () => {
  const artifacts = [
    artifact,
    { ...artifact, name: "@example/cli" },
    { ...artifact, name: "@example/mcp" },
  ];
  const registry = new Map(),
    published = [];
  const lookup = async (name) => registry.get(name) ?? null;
  const initial = await planPublication(artifacts, false, lookup);
  await assert.rejects(
    publishPlan(
      initial,
      async (item) => {
        if (item.name.endsWith("/cli")) throw new Error("publish interrupted");
        published.push(item.name);
        registry.set(item.name, { ...item, dist: { integrity: item.integrity } });
      },
      async (item) => publicationAction(await lookup(item.name), item, true),
    ),
  );
  assert.deepEqual(published, [artifact.name]);
  const recovery = await planPublication(artifacts, true, lookup);
  await publishPlan(
    recovery,
    async (item) => {
      published.push(item.name);
      registry.set(item.name, { ...item, dist: { integrity: item.integrity } });
    },
    async (item) => publicationAction(await lookup(item.name), item, true),
  );
  assert.deepEqual(
    published,
    artifacts.map((item) => item.name),
  );
});

test("registry accepts npm's JSON-string version-not-found response", async () => {
  assert.equal(
    await registryMetadata(
      artifact.name,
      artifact.version,
      async () => new Response(JSON.stringify("version not found: 0.4.0"), { status: 404 }),
    ),
    null,
  );
  await assert.rejects(
    registryMetadata(
      artifact.name,
      artifact.version,
      async () => new Response(JSON.stringify("version not found: 9.9.9"), { status: 404 }),
    ),
  );
});

test("waits for registry indexing and verifies the exact artifact", async () => {
  let lookups = 0,
    waits = 0;
  await verifyPublishedArtifact(artifact, {
    lookup: async () => (++lookups < 3 ? null : metadata),
    wait: async () => {
      waits++;
    },
    attempts: 3,
  });
  assert.equal(lookups, 3);
  assert.equal(waits, 2);
});
test("stops immediately on conflicting bytes or registry failures", async () => {
  const wait = async () => {
    throw new Error("should not wait");
  };
  await assert.rejects(
    verifyPublishedArtifact(artifact, {
      wait,
      lookup: async () => ({ ...metadata, dist: { integrity: "different" } }),
    }),
    /differs/,
  );
  await assert.rejects(
    verifyPublishedArtifact(artifact, {
      wait,
      lookup: async () => {
        throw new Error("offline");
      },
    }),
    /offline/,
  );
});
test("bounds indexing waits without attempting another publish", async () => {
  let lookups = 0,
    waits = 0;
  await assert.rejects(
    verifyPublishedArtifact(artifact, {
      lookup: async () => {
        lookups++;
        return null;
      },
      wait: async () => {
        waits++;
      },
      attempts: 3,
    }),
    /not visible/,
  );
  assert.equal(lookups, 3);
  assert.equal(waits, 2);
});
