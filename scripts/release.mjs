import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { packagePaths, manifests, packPackages, run } from "./package-artifacts.mjs";
import {
  integrity,
  validateRelease,
  planPublication,
  publishPlan,
  verifyPublishedArtifact,
} from "./release-core.mjs";
const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const mode = args.shift();
const tagIndex = args.indexOf("--tag");
const tag = tagIndex >= 0 ? args[tagIndex + 1] : process.env.GITHUB_REF_NAME;
const resume = args.includes("--resume");
const stage = join(root, ".release", tag ?? "invalid");
if (!/^(prepare|publish)$/.test(mode ?? ""))
  throw new Error("Use release:prepare or release:publish with --tag vX.Y.Z [--resume].");
const packages = await manifests(root);
validateRelease(
  tag,
  packages,
  (await readdir(join(root, ".changeset"))).filter((file) => file.endsWith(".md")),
);
const commit = run("git", ["rev-parse", "HEAD"], root).trim();
if (run("git", ["status", "--porcelain", "--untracked-files=normal"], root).trim())
  throw new Error("Release requires a clean, committed checkout.");
if (mode === "prepare") {
  // Fail before expensive checks if any target is already published in a fresh release.
  if (!resume) await planPublication(packages, false);
  run("pnpm", ["verify"], root, { stdio: "inherit", timeout: 600000 });
  await mkdir(stage, { recursive: true });
  const tarballs = await packPackages(root, join(stage, "packed"));
  const artifacts = [];
  for (const pkg of packages) {
    const file = tarballs.find((file) =>
      file.endsWith(`${pkg.name.slice(1).replaceAll("/", "-")}-${pkg.version}.tgz`),
    );
    if (!file) throw new Error(`Missing tarball: ${pkg.name}.`);
    artifacts.push({
      name: pkg.name,
      version: pkg.version,
      file: relative(stage, file),
      integrity: integrity(await readFile(file)),
    });
  }
  run(
    process.execPath,
    ["scripts/verify-packages.mjs", "--pack-dir", join(stage, "packed")],
    root,
    { stdio: "inherit" },
  );
  await planPublication(artifacts, resume);
  await writeFile(
    join(stage, "release.json"),
    JSON.stringify({ tag, commit, artifacts }, null, 2) + "\n",
  );
  console.log(`Verified artifacts prepared in ${relative(root, stage)}. No packages published.`);
} else {
  if (run("git", ["rev-parse", `refs/tags/${tag}^{commit}`], root).trim() !== commit)
    throw new Error("Publish requires the reviewed release tag at HEAD.");
  run("git", ["merge-base", "--is-ancestor", "HEAD", "origin/main"], root);
  const prepared = JSON.parse(await readFile(join(stage, "release.json"), "utf8"));
  if (
    prepared.tag !== tag ||
    prepared.commit !== commit ||
    prepared.artifacts.length !== packagePaths.length
  )
    throw new Error("Prepared release does not match this commit/tag.");
  for (const [i, artifact] of prepared.artifacts.entries()) {
    if (
      artifact.name !== packages[i].name ||
      artifact.version !== packages[i].version ||
      artifact.file !==
        `packed/${artifact.name.slice(1).replaceAll("/", "-")}-${artifact.version}.tgz` ||
      integrity(await readFile(join(stage, artifact.file))) !== artifact.integrity
    )
      throw new Error("Prepared artifact identity/integrity mismatch.");
  }
  const plan = await planPublication(prepared.artifacts, resume);
  await publishPlan(
    plan,
    (artifact) =>
      run(
        "npm",
        ["publish", join(stage, artifact.file), "--access", "public", "--provenance"],
        root,
        { stdio: "inherit" },
      ),
    (artifact) => verifyPublishedArtifact(artifact),
  );
  console.log(
    "All release artifacts published or verified as identical. Check npm dist-tags and provenance before announcing.",
  );
}
