/**
 * Tests for the retry module.
 */

import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry.js";
import { ApiError } from "../errors.js";

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  it("returns result on first successful attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx ApiError and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("Server error", 500))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on network errors (ApiError with no status code)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("Network error"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on TypeError (fetch network errors)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 4xx ApiError", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError("Bad request", 400));

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 1 })).rejects.toThrow(ApiError);

    // Only called once — no retries for 4xx
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 401 Unauthorized", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError("Unauthorized", 401));

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 1 })).rejects.toThrow(ApiError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on 409 Conflict", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError("Duplicate", 409));

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 1 })).rejects.toThrow(ApiError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on non-API errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Unexpected error"));

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 1 })).rejects.toThrow(
      "Unexpected error",
    );

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exhausts all retries and throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError("Server error", 503));

    await expect(withRetry(fn, { maxRetries: 2, initialDelayMs: 1 })).rejects.toThrow(ApiError);

    // Initial attempt + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses default options when none provided", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies exponential backoff between retries", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("Error", 500))
      .mockRejectedValueOnce(new ApiError("Error", 500))
      .mockResolvedValue("success");

    const start = Date.now();
    await withRetry(fn, { maxRetries: 3, initialDelayMs: 50, backoffMultiplier: 2 });
    const elapsed = Date.now() - start;

    // First retry: 50ms, second retry: 100ms => ~150ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
