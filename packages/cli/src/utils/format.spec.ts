import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  bold,
  dim,
  green,
  red,
  yellow,
  cyan,
  gray,
  colorStatus,
  formatTable,
  outputJson,
  success,
  error,
  warn,
  info,
  detail,
} from "./format.js";
import type { TableColumn } from "./format.js";

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

describe("ANSI color helpers", () => {
  afterEach(() => {
    delete process.env["NO_COLOR"];
  });

  it("bold wraps text with bold ANSI codes", () => {
    expect(bold("test")).toBe("\x1b[1mtest\x1b[0m");
  });

  it("dim wraps text with dim ANSI codes", () => {
    expect(dim("test")).toBe("\x1b[2mtest\x1b[0m");
  });

  it("green wraps text with green ANSI codes", () => {
    expect(green("test")).toBe("\x1b[32mtest\x1b[0m");
  });

  it("red wraps text with red ANSI codes", () => {
    expect(red("test")).toBe("\x1b[31mtest\x1b[0m");
  });

  it("yellow wraps text with yellow ANSI codes", () => {
    expect(yellow("test")).toBe("\x1b[33mtest\x1b[0m");
  });

  it("cyan wraps text with cyan ANSI codes", () => {
    expect(cyan("test")).toBe("\x1b[36mtest\x1b[0m");
  });

  it("gray wraps text with gray ANSI codes", () => {
    expect(gray("test")).toBe("\x1b[90mtest\x1b[0m");
  });

  it("respects NO_COLOR environment variable", () => {
    process.env["NO_COLOR"] = "1";
    expect(bold("test")).toBe("test");
    expect(green("test")).toBe("test");
    expect(red("test")).toBe("test");
  });
});

// ---------------------------------------------------------------------------
// colorStatus
// ---------------------------------------------------------------------------

describe("colorStatus", () => {
  afterEach(() => {
    delete process.env["NO_COLOR"];
  });

  it("colors 'aceptado' green", () => {
    expect(colorStatus("aceptado")).toBe(green("aceptado"));
  });

  it("colors 'rechazado' red", () => {
    expect(colorStatus("rechazado")).toBe(red("rechazado"));
  });

  it("colors 'procesando' yellow", () => {
    expect(colorStatus("procesando")).toBe(yellow("procesando"));
  });

  it("colors 'recibido' yellow", () => {
    expect(colorStatus("recibido")).toBe(yellow("recibido"));
  });

  it("colors 'error' red", () => {
    expect(colorStatus("error")).toBe(red("error"));
  });

  it("returns unknown statuses unchanged", () => {
    process.env["NO_COLOR"] = "1";
    expect(colorStatus("something")).toBe("something");
  });

  it("is case-insensitive", () => {
    expect(colorStatus("ACEPTADO")).toBe(green("ACEPTADO"));
    expect(colorStatus("Rechazado")).toBe(red("Rechazado"));
  });
});

// ---------------------------------------------------------------------------
// formatTable
// ---------------------------------------------------------------------------

describe("formatTable", () => {
  beforeEach(() => {
    process.env["NO_COLOR"] = "1";
  });

  afterEach(() => {
    delete process.env["NO_COLOR"];
  });

  const columns: TableColumn[] = [
    { header: "NAME", key: "name" },
    { header: "AGE", key: "age" },
  ];

  it("returns '(no results)' for empty rows", () => {
    expect(formatTable(columns, [])).toBe("(no results)");
  });

  it("formats a simple table", () => {
    const rows = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = formatTable(columns, rows);
    const lines = result.split("\n");

    expect(lines.length).toBe(4); // header + separator + 2 rows
    expect(lines[0]).toContain("NAME");
    expect(lines[0]).toContain("AGE");
    expect(lines[2]).toContain("Alice");
    expect(lines[2]).toContain("30");
    expect(lines[3]).toContain("Bob");
    expect(lines[3]).toContain("25");
  });

  it("respects minWidth", () => {
    const cols: TableColumn[] = [{ header: "ID", key: "id", minWidth: 10 }];
    const rows = [{ id: "1" }];
    const result = formatTable(cols, rows);
    const lines = result.split("\n");

    // Header should be padded to at least minWidth
    expect(lines[0]?.length).toBeGreaterThanOrEqual(10);
  });

  it("uses custom format function", () => {
    const cols: TableColumn[] = [
      {
        header: "STATUS",
        key: "status",
        format: (v) => `[${String(v)}]`,
      },
    ];
    const rows = [{ status: "ok" }];
    const result = formatTable(cols, rows);

    expect(result).toContain("[ok]");
  });

  it("handles missing keys gracefully", () => {
    const rows = [{ name: "Alice" }]; // no 'age' key
    const result = formatTable(columns, rows);

    expect(result).toContain("Alice");
    // Missing key shows empty string
    expect(result).not.toContain("undefined");
  });
});

// ---------------------------------------------------------------------------
// outputJson
// ---------------------------------------------------------------------------

describe("outputJson", () => {
  it("outputs formatted JSON to stdout", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    outputJson({ hello: "world", num: 42 });

    expect(spy).toHaveBeenCalledWith(JSON.stringify({ hello: "world", num: 42 }, null, 2));
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------

describe("message helpers", () => {
  beforeEach(() => {
    process.env["NO_COLOR"] = "1";
  });

  afterEach(() => {
    delete process.env["NO_COLOR"];
  });

  it("success logs with checkmark", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    success("done");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("done"));
    spy.mockRestore();
  });

  it("error logs to stderr", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    error("fail");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("fail"));
    spy.mockRestore();
  });

  it("warn logs with exclamation", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    warn("caution");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("caution"));
    spy.mockRestore();
  });

  it("info logs with i", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    info("note");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("note"));
    spy.mockRestore();
  });

  it("detail logs label and value", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    detail("Key", "Value");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Key"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Value"));
    spy.mockRestore();
  });
});
