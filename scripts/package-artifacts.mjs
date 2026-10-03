import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { x } from "tar";
export const packagePaths = ["shared", "packages/sdk", "packages/cli", "packages/mcp"];
export function run(command, args, cwd, options = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}
export async function manifests(root) {
  return Promise.all(
    packagePaths.map(async (path) => ({
      path,
      ...JSON.parse(await readFile(join(root, path, "package.json"), "utf8")),
    })),
  );
}
export async function packPackages(root, directory) {
  await mkdir(directory, { recursive: true });
  if ((await readdir(directory)).length) throw new Error("Pack directory must be empty.");
  for (const path of packagePaths)
    run("pnpm", ["pack", "--pack-destination", directory], join(root, path));
  // pnpm resolves workspace dependencies asynchronously, so their JSON key order
  // can differ between builds. Canonicalize those maps before the final npm pack.
  for (const file of (await readdir(directory)).filter((file) => file.endsWith(".tgz"))) {
    const temporary = await mkdtemp(join(tmpdir(), "hacienda-canonical-pack-"));
    try {
      await x({ file: join(directory, file), cwd: temporary, strict: true });
      const packageRoot = join(temporary, "package");
      const manifestFile = join(packageRoot, "package.json");
      const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
      await writeFile(manifestFile, JSON.stringify(canonicalManifest(manifest), null, 2) + "\n");
      run("npm", ["pack", "--ignore-scripts", "--pack-destination", directory], packageRoot);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
  return (await readdir(directory))
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => join(directory, file));
}

export function canonicalManifest(manifest) {
  const result = structuredClone(manifest);
  for (const key of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"])
    if (result[key])
      result[key] = Object.fromEntries(
        Object.keys(result[key])
          .sort()
          .map((name) => [name, result[key][name]]),
      );
  // Conditional export order is significant; never sort exports or all object keys.
  return result;
}
