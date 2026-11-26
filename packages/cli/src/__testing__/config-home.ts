/**
 * Test helper: points `~/.hacienda-cr` at a temporary HOME with one profile,
 * so CLI commands never read or write the developer's real config.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { vi } from "vitest";

/** Stubs HOME to `home` and writes a synthetic `default` profile. Returns the config dir. */
export async function useTemporaryConfigHome(
  home: string,
  environment: "sandbox" | "production" = "sandbox",
): Promise<string> {
  vi.stubEnv("HOME", home);
  const configDir = join(home, ".hacienda-cr");
  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await writeFile(
    join(configDir, "config.toml"),
    `[default]\nenvironment = "${environment}"\ncedula_type = "02"\ncedula = "3101234567"\np12_path = ""\n`,
    { mode: 0o600 },
  );
  return configDir;
}
