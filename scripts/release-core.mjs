import { setTimeout as sleep } from "node:timers/promises";
import { createHash } from "node:crypto";
export function integrity(buffer) {
  return `sha512-${createHash("sha512").update(buffer).digest("base64")}`;
}
export function validateRelease(tag, packages, changesets) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? ""))
    throw new Error("Expected a stable release tag such as v0.4.0.");
  if (changesets.length)
    throw new Error("Consume pending changesets in a reviewed version PR first.");
  for (const pkg of packages) {
    if (pkg.version !== tag.slice(1))
      throw new Error(`Tag does not match ${pkg.name}@${pkg.version}.`);
    if (pkg.engines?.node !== ">=22" || pkg.publishConfig?.access !== "public")
      throw new Error(`Invalid release metadata: ${pkg.name}.`);
  }
}
export function publicationAction(metadata, artifact, resume) {
  if (metadata === null) return "publish";
  if (!resume)
    throw new Error(`${artifact.name}@${artifact.version} already exists; use verified recovery.`);
  if (
    metadata.name !== artifact.name ||
    metadata.version !== artifact.version ||
    metadata.dist?.integrity !== artifact.integrity
  )
    throw new Error(`Published artifact differs: ${artifact.name}.`);
  return "skip";
}
export async function registryMetadata(name, version, fetchFn = fetch) {
  const response = await fetchFn(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    {
      signal: AbortSignal.timeout(15000),
      redirect: "error",
      headers: { "Cache-Control": "no-cache" },
    },
  );
  if (response.status === 404) {
    const body = await response.json();
    const message = typeof body === "string" ? body : body?.error;
    if (message === "Not found" || message === `version not found: ${version}`) return null;
    throw new Error("Unexpected registry 404 response.");
  }
  if (!response.ok) throw new Error(`Registry lookup failed: ${response.status}.`);
  const data = await response.json();
  if (data.name !== name || data.version !== version || typeof data.dist?.integrity !== "string")
    throw new Error("Invalid registry metadata.");
  return data;
}
export async function planPublication(artifacts, resume, lookup = registryMetadata) {
  const actions = await Promise.all(
    artifacts.map(async (artifact) =>
      publicationAction(await lookup(artifact.name, artifact.version), artifact, resume),
    ),
  );
  return artifacts.map((artifact, i) => ({ ...artifact, action: actions[i] }));
}
export async function publishPlan(plan, publish, verify) {
  // Sequential dependency order; an error stops dependents. Recovery checks exact bytes.
  for (const artifact of plan) {
    if (artifact.action === "publish") await publish(artifact);
    await verify(artifact);
  }
}

/** A successful npm publish may precede registry indexing by several minutes. */
export async function verifyPublishedArtifact(
  artifact,
  { lookup = registryMetadata, wait = sleep, attempts = 37, delayMs = 5000 } = {},
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const metadata = await lookup(artifact.name, artifact.version);
    if (metadata !== null) {
      publicationAction(metadata, artifact, true);
      return;
    }
    if (attempt + 1 < attempts) await wait(delayMs);
  }
  throw new Error(
    `Published version is not visible yet: ${artifact.name}. Use verified recovery after indexing completes.`,
  );
}
