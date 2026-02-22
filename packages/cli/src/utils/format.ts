/**
 * CLI output formatting utilities.
 *
 * Provides consistent output formatting for all CLI commands:
 * - JSON mode (--json flag) for machine consumption
 * - Table/human-readable mode for terminal output
 * - Color-coded status indicators
 *
 * @module utils/format
 */

// ---------------------------------------------------------------------------
// ANSI color helpers (no external dependency)
// ---------------------------------------------------------------------------

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

/**
 * Whether ANSI colors should be used in output.
 * Respects NO_COLOR environment variable.
 */
function useColor(): boolean {
  return !process.env["NO_COLOR"];
}

function color(text: string, ansi: string): string {
  return useColor() ? `${ansi}${text}${ANSI.reset}` : text;
}

export function bold(text: string): string {
  return color(text, ANSI.bold);
}

export function dim(text: string): string {
  return color(text, ANSI.dim);
}

export function green(text: string): string {
  return color(text, ANSI.green);
}

export function red(text: string): string {
  return color(text, ANSI.red);
}

export function yellow(text: string): string {
  return color(text, ANSI.yellow);
}

export function cyan(text: string): string {
  return color(text, ANSI.cyan);
}

export function gray(text: string): string {
  return color(text, ANSI.gray);
}

// ---------------------------------------------------------------------------
// Status colorization
// ---------------------------------------------------------------------------

/** Color-coded Hacienda document statuses. */
export function colorStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "aceptado":
      return green(status);
    case "rechazado":
      return red(status);
    case "procesando":
    case "recibido":
      return yellow(status);
    case "error":
      return red(status);
    default:
      return status;
  }
}

// ---------------------------------------------------------------------------
// Table formatting
// ---------------------------------------------------------------------------

export interface TableColumn {
  /** Header label. */
  header: string;
  /** Key in the row object. */
  key: string;
  /** Minimum width (defaults to header length). */
  minWidth?: number;
  /** Optional transform for display value. */
  format?: (value: unknown) => string;
}

/**
 * Renders tabular data as a formatted ASCII table.
 *
 * @param columns - Column definitions.
 * @param rows - Array of data objects.
 * @returns Formatted table string.
 */
export function formatTable(columns: TableColumn[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return dim("(no results)");
  }

  // Compute column widths
  const widths = columns.map((col) => {
    const headerLen = col.header.length;
    const minW = col.minWidth ?? headerLen;
    const maxDataLen = rows.reduce((max, row) => {
      const val = col.format ? col.format(row[col.key]) : String(row[col.key] ?? "");
      return Math.max(max, val.length);
    }, 0);
    return Math.max(minW, headerLen, maxDataLen);
  });

  // Build header
  const header = columns.map((col, i) => bold(col.header.padEnd(widths[i] ?? 0))).join("  ");

  const separator = columns.map((_col, i) => dim("-".repeat(widths[i] ?? 0))).join("  ");

  // Build rows
  const lines = rows.map((row) =>
    columns
      .map((col, i) => {
        const val = col.format ? col.format(row[col.key]) : String(row[col.key] ?? "");
        return val.padEnd(widths[i] ?? 0);
      })
      .join("  "),
  );

  return [header, separator, ...lines].join("\n");
}

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

/**
 * Outputs data as formatted JSON to stdout.
 *
 * @param data - Any JSON-serializable data.
 */
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------

/** Prints a success message. */
export function success(message: string): void {
  console.log(`${green("✓")} ${message}`);
}

/** Prints an error message. */
export function error(message: string): void {
  console.error(`${red("✗")} ${message}`);
}

/** Prints a warning message. */
export function warn(message: string): void {
  console.log(`${yellow("!")} ${message}`);
}

/** Prints an info message. */
export function info(message: string): void {
  console.log(`${cyan("i")} ${message}`);
}

/** Prints a key-value detail line. */
export function detail(label: string, value: string): void {
  console.log(`  ${dim(label + ":")} ${value}`);
}
