/**
 * Tests for the structured logger.
 */

import { describe, it, expect } from "vitest";
import { Logger, LogLevel, noopLogger } from "./logger.js";
import type { LogEntry } from "./logger.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collects log output into an array. */
function createCollector(): { lines: string[]; writer: (output: string) => void } {
  const lines: string[] = [];
  return { lines, writer: (output: string) => lines.push(output) };
}

/** Returns the first element of an array, or undefined. */
function first<T>(arr: readonly T[]): T | undefined {
  return arr[0];
}

// ---------------------------------------------------------------------------
// Log levels
// ---------------------------------------------------------------------------

describe("Logger", () => {
  describe("log levels", () => {
    it("suppresses messages below the configured level", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({ level: LogLevel.WARN, writer });

      logger.debug("debug msg");
      logger.info("info msg");
      logger.warn("warn msg");
      logger.error("error msg");

      expect(lines).toHaveLength(2);
      expect(first(lines)).toContain("warn msg");
      expect(lines[1]).toContain("error msg");
    });

    it("outputs all messages at DEBUG level", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({ level: LogLevel.DEBUG, writer });

      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");

      expect(lines).toHaveLength(4);
    });

    it("suppresses all messages at SILENT level", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({ level: LogLevel.SILENT, writer });

      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");

      expect(lines).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Text format
  // ---------------------------------------------------------------------------

  describe("text format", () => {
    it("formats messages with timestamp, level, context", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({ level: LogLevel.INFO, format: "text", context: "test", writer });

      logger.info("hello");

      const line = first(lines);
      expect(line).toBeDefined();
      expect(line).toMatch(/^\[.*\] INFO \[test\] hello$/);
    });

    it("includes data as JSON suffix", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({ level: LogLevel.DEBUG, format: "text", writer });

      logger.debug("request", { method: "POST", path: "/recepcion" });

      const line = first(lines);
      expect(line).toContain("request");
      expect(line).toContain('"method":"POST"');
    });
  });

  // ---------------------------------------------------------------------------
  // JSON format
  // ---------------------------------------------------------------------------

  describe("json format", () => {
    it("outputs valid JSON with all fields", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({
        level: LogLevel.INFO,
        format: "json",
        context: "api",
        writer,
      });

      logger.info("submitted", { clave: "506..." });

      const line = first(lines);
      expect(line).toBeDefined();

      const parsed = JSON.parse(line as string) as LogEntry;
      expect(parsed.level).toBe("INFO");
      expect(parsed.context).toBe("api");
      expect(parsed.message).toBe("submitted");
      expect(parsed.timestamp).toBeTruthy();
      expect(parsed.data).toEqual({ clave: "506..." });
    });

    it("omits data field when not provided", () => {
      const { lines, writer } = createCollector();
      const logger = new Logger({ level: LogLevel.INFO, format: "json", writer });

      logger.info("simple message");

      const parsed = JSON.parse(first(lines) as string) as LogEntry;
      expect(parsed.data).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Child loggers
  // ---------------------------------------------------------------------------

  describe("child loggers", () => {
    it("creates a child with concatenated context", () => {
      const { lines, writer } = createCollector();
      const parent = new Logger({ level: LogLevel.DEBUG, context: "sdk", writer });
      const child = parent.child("http");

      child.info("request sent");

      const line = first(lines);
      expect(line).toContain("[sdk:http]");
    });

    it("inherits parent level and format", () => {
      const { lines, writer } = createCollector();
      const parent = new Logger({ level: LogLevel.WARN, format: "json", writer });
      const child = parent.child("auth");

      child.info("should be suppressed");
      child.warn("should appear");

      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(first(lines) as string) as LogEntry;
      expect(parsed.context).toBe("sdk:auth");
    });
  });

  // ---------------------------------------------------------------------------
  // isLevelEnabled
  // ---------------------------------------------------------------------------

  describe("isLevelEnabled", () => {
    it("returns true for levels at or above threshold", () => {
      const logger = new Logger({ level: LogLevel.WARN });

      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // noopLogger
  // ---------------------------------------------------------------------------

  describe("noopLogger", () => {
    it("is a Logger instance with SILENT level", () => {
      expect(noopLogger).toBeInstanceOf(Logger);
      expect(noopLogger.level).toBe(LogLevel.SILENT);
    });

    it("does not throw when called", () => {
      expect(() => {
        noopLogger.debug("test");
        noopLogger.info("test");
        noopLogger.warn("test");
        noopLogger.error("test");
      }).not.toThrow();
    });
  });
});
