/**
 * Structured logging module for the SDK.
 *
 * Provides a configurable logger with support for:
 * - Log levels (DEBUG, INFO, WARN, ERROR, SILENT)
 * - Text and JSON output formats
 * - Child loggers with inherited configuration
 * - Custom writers for output redirection
 *
 * @module logging/logger
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Available log levels, ordered by verbosity. */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  /** Suppresses all logging. */
  SILENT = 4,
}

/** Output format for log messages. */
export type LogFormat = "text" | "json";

/** A structured log entry. */
export interface LogEntry {
  /** ISO 8601 timestamp. */
  readonly timestamp: string;
  /** Log level name. */
  readonly level: string;
  /** Logger context (component name). */
  readonly context: string;
  /** Log message. */
  readonly message: string;
  /** Optional structured data. */
  readonly data?: Record<string, unknown>;
}

/** A writer function that receives formatted log output. */
export type LogWriter = (output: string) => void;

/** Configuration options for creating a logger. */
export interface LoggerOptions {
  /** Minimum log level (default: INFO). */
  readonly level?: LogLevel;
  /** Output format (default: "text"). */
  readonly format?: LogFormat;
  /** Logger context name (default: "sdk"). */
  readonly context?: string;
  /** Custom writer function (default: console.error). */
  readonly writer?: LogWriter;
}

// ---------------------------------------------------------------------------
// Level names
// ---------------------------------------------------------------------------

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.SILENT]: "SILENT",
};

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

/**
 * Structured logger with configurable levels, formats, and output.
 *
 * @example
 * ```ts
 * const logger = new Logger({ level: LogLevel.DEBUG, format: "json" });
 * logger.info("Starting submission", { clave: "506..." });
 *
 * const childLogger = logger.child("http-client");
 * childLogger.debug("Sending request", { method: "POST", path: "/recepcion" });
 * ```
 */
export class Logger {
  readonly level: LogLevel;
  readonly format: LogFormat;
  readonly context: string;
  private readonly writer: LogWriter;

  constructor(options?: LoggerOptions) {
    this.level = options?.level ?? LogLevel.INFO;
    this.format = options?.format ?? "text";
    this.context = options?.context ?? "sdk";
    this.writer = options?.writer ?? defaultWriter;
  }

  /** Logs a DEBUG-level message. */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /** Logs an INFO-level message. */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /** Logs a WARN-level message. */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /** Logs an ERROR-level message. */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Checks whether the given level would produce output.
   *
   * Useful for avoiding expensive string formatting or data
   * serialization when the message would be suppressed.
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.level;
  }

  /**
   * Creates a child logger that inherits the parent's configuration
   * but uses a different context name.
   *
   * @param childContext - Context name for the child logger.
   * @returns A new Logger instance with the child context.
   */
  child(childContext: string): Logger {
    return new Logger({
      level: this.level,
      format: this.format,
      context: `${this.context}:${childContext}`,
      writer: this.writer,
    });
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      context: this.context,
      message,
      ...(data !== undefined ? { data } : {}),
    };

    const output = this.format === "json" ? formatJson(entry) : formatText(entry);
    this.writer(output);
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatText(entry: LogEntry): string {
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
  return `[${entry.timestamp}] ${entry.level} [${entry.context}] ${entry.message}${dataStr}`;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// ---------------------------------------------------------------------------
// Default writer
// ---------------------------------------------------------------------------

function defaultWriter(output: string): void {
  console.error(output);
}

// ---------------------------------------------------------------------------
// No-op logger
// ---------------------------------------------------------------------------

/**
 * A logger that discards all output.
 *
 * Useful as a default when callers don't want logging but the
 * API requires a Logger instance.
 */
export const noopLogger = new Logger({ level: LogLevel.SILENT });
