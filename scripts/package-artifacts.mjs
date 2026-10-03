import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
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
  return (await readdir(directory))
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => join(directory, file));
}
