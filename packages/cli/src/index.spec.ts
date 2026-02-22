import { describe, it, expect } from "vitest";
import { PACKAGE_NAME, VERSION, main } from "./main.js";

describe("@dojocoding/hacienda-cli", () => {
  it("should export the package name", () => {
    expect(PACKAGE_NAME).toBe("@dojocoding/hacienda-cli");
  });

  it("should export the version", () => {
    expect(VERSION).toBe("0.0.1");
  });

  it("should define the main command with all subcommands", async () => {
    const resolved =
      typeof main === "function"
        ? await (main as () => Promise<Record<string, unknown>>)()
        : (main as Record<string, unknown>);
    const meta = resolved.meta as { name: string; version: string };
    expect(meta.name).toBe("hacienda");
    expect(meta.version).toBe("0.0.1");

    const subCommands = resolved.subCommands as Record<string, unknown>;
    expect(Object.keys(subCommands).sort()).toEqual([
      "auth",
      "draft",
      "get",
      "list",
      "lookup",
      "sign",
      "status",
      "submit",
      "validate",
    ]);
  });
});
