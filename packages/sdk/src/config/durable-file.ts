import { open, rename, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

/** Exclusive process lock. A timeout never steals another writer's lock. */
export async function withFileLock<T>(path: string, work: () => Promise<T>): Promise<T> {
  const until = Date.now() + 5000;
  while (true) {
    try {
      await mkdir(path);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= until)
        throw new Error("Store is locked; verify the writer before manual recovery");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  try {
    return await work();
  } finally {
    await rm(path, { recursive: true });
  }
}

/** Sync file and directory before acknowledging replacement (local POSIX filesystems). */
export async function writeDurableJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomBytes(12).toString("hex")}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(value) + "\n", "utf8");
    await file.sync();
  } finally {
    await file.close();
  }
  try {
    await rename(temporary, path);
    const directory = await open(dirname(path), "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } finally {
    await rm(temporary, { force: true });
  }
}
