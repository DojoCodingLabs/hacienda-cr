import { describe, it, expect } from "vitest";
import { authCommand } from "./auth/index.js";
import { submitCommand } from "./submit.js";
import { statusCommand } from "./status.js";
import { listCommand } from "./list.js";
import { getCommand } from "./get.js";
import { signCommand } from "./sign.js";
import { validateCommand } from "./validate.js";
import { lookupCommand } from "./lookup.js";
import { draftCommand } from "./draft.js";

// ---------------------------------------------------------------------------
// Helper to resolve lazy command definitions (citty wraps in functions)
// ---------------------------------------------------------------------------

async function resolveCommand(cmd: unknown): Promise<Record<string, unknown>> {
  if (typeof cmd === "function") {
    return (await (cmd as () => Promise<Record<string, unknown>>)()) as Record<string, unknown>;
  }
  return cmd as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Auth command group
// ---------------------------------------------------------------------------

describe("auth command group", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(authCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("auth");
    expect(meta.description).toBeTruthy();
  });

  it("defines login, status, switch subcommands", async () => {
    const resolved = await resolveCommand(authCommand);
    const subCommands = resolved.subCommands as Record<string, unknown>;
    expect(subCommands).toBeDefined();
    expect(subCommands).toHaveProperty("login");
    expect(subCommands).toHaveProperty("status");
    expect(subCommands).toHaveProperty("switch");
  });

  describe("login subcommand", () => {
    it("has correct args", async () => {
      const resolved = await resolveCommand(authCommand);
      const subCommands = resolved.subCommands as Record<string, unknown>;
      const login = await resolveCommand(subCommands.login);
      const args = login.args as Record<string, { type: string }>;

      expect(args["cedula-type"]).toBeDefined();
      expect(args.cedula).toBeDefined();
      expect(args.password).toBeDefined();
      expect(args.environment).toBeDefined();
      expect(args.profile).toBeDefined();
      expect(args.json).toBeDefined();
    });
  });

  describe("status subcommand", () => {
    it("has json arg", async () => {
      const resolved = await resolveCommand(authCommand);
      const subCommands = resolved.subCommands as Record<string, unknown>;
      const status = await resolveCommand(subCommands.status);
      const args = status.args as Record<string, { type: string }>;

      expect(args.json).toBeDefined();
      expect(args.profile).toBeDefined();
    });
  });

  describe("switch subcommand", () => {
    it("has positional name arg", async () => {
      const resolved = await resolveCommand(authCommand);
      const subCommands = resolved.subCommands as Record<string, unknown>;
      const switchCmd = await resolveCommand(subCommands.switch);
      const args = switchCmd.args as Record<string, { type: string; required?: boolean }>;

      expect(args.name).toBeDefined();
      expect(args.name.type).toBe("positional");
    });
  });
});

// ---------------------------------------------------------------------------
// Submit command
// ---------------------------------------------------------------------------

describe("submit command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(submitCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("submit");
    expect(meta.description).toContain("Submit");
  });

  it("has required file positional arg", async () => {
    const resolved = await resolveCommand(submitCommand);
    const args = resolved.args as Record<string, { type: string; required?: boolean }>;
    expect(args.file).toBeDefined();
    expect(args.file.type).toBe("positional");
    expect(args.file.required).toBe(true);
  });

  it("has dry-run and json flags", async () => {
    const resolved = await resolveCommand(submitCommand);
    const args = resolved.args as Record<string, { type: string }>;
    expect(args["dry-run"]).toBeDefined();
    expect(args.json).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Status command
// ---------------------------------------------------------------------------

describe("status command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(statusCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("status");
  });

  it("has required clave positional arg", async () => {
    const resolved = await resolveCommand(statusCommand);
    const args = resolved.args as Record<string, { type: string; required?: boolean }>;
    expect(args.clave).toBeDefined();
    expect(args.clave.type).toBe("positional");
    expect(args.clave.required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// List command
// ---------------------------------------------------------------------------

describe("list command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(listCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("list");
  });

  it("has pagination args", async () => {
    const resolved = await resolveCommand(listCommand);
    const args = resolved.args as Record<string, { type: string }>;
    expect(args.limit).toBeDefined();
    expect(args.offset).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Get command
// ---------------------------------------------------------------------------

describe("get command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(getCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("get");
  });

  it("has required clave positional arg", async () => {
    const resolved = await resolveCommand(getCommand);
    const args = resolved.args as Record<string, { type: string; required?: boolean }>;
    expect(args.clave).toBeDefined();
    expect(args.clave.type).toBe("positional");
    expect(args.clave.required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sign command (stub)
// ---------------------------------------------------------------------------

describe("sign command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(signCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("sign");
    expect(meta.description).toContain("Sign");
  });
});

// ---------------------------------------------------------------------------
// Validate command
// ---------------------------------------------------------------------------

describe("validate command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(validateCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("validate");
  });

  it("has required file positional arg", async () => {
    const resolved = await resolveCommand(validateCommand);
    const args = resolved.args as Record<string, { type: string; required?: boolean }>;
    expect(args.file).toBeDefined();
    expect(args.file.type).toBe("positional");
    expect(args.file.required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lookup command (stub)
// ---------------------------------------------------------------------------

describe("lookup command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(lookupCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("lookup");
    expect(meta.description).toContain("Look up");
  });
});

// ---------------------------------------------------------------------------
// Draft command (stub)
// ---------------------------------------------------------------------------

describe("draft command", () => {
  it("has correct metadata", async () => {
    const resolved = await resolveCommand(draftCommand);
    const meta = resolved.meta as { name: string; description: string };
    expect(meta.name).toBe("draft");
  });

  it("has template arg", async () => {
    const resolved = await resolveCommand(draftCommand);
    const args = resolved.args as Record<string, { type: string; default?: string }>;
    expect(args.template).toBeDefined();
    expect(args.template.default).toBe("factura");
  });
});
