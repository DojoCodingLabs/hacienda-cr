/**
 * Tests for the token bucket rate limiter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "./rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("uses default options when none provided", () => {
      const limiter = new RateLimiter();
      // Default is 10 requests per second
      expect(limiter.availableTokens).toBe(10);
    });

    it("accepts custom options", () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 2000 });
      expect(limiter.availableTokens).toBe(5);
    });
  });

  describe("execute", () => {
    it("executes the function immediately when under the limit", async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("result");

      const result = await limiter.execute(fn);

      expect(fn).toHaveBeenCalledOnce();
      expect(result).toBe("result");
    });

    it("returns the function result", async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue({ data: "hello" });

      const result = await limiter.execute(fn);

      expect(result).toEqual({ data: "hello" });
    });

    it("propagates errors from the executed function", async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
      const fn = vi.fn().mockRejectedValue(new Error("boom"));

      await expect(limiter.execute(fn)).rejects.toThrow("boom");
    });

    it("allows multiple requests within the limit", async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      await limiter.execute(fn);
      await limiter.execute(fn);
      await limiter.execute(fn);

      expect(fn).toHaveBeenCalledTimes(3);
      expect(limiter.availableTokens).toBe(0);
    });

    it("delays execution when rate limit is reached", async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      // Fill up the bucket
      await limiter.execute(fn);
      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(0);

      // The third request should be delayed
      const promise = limiter.execute(fn);

      // Advance time past the window
      await vi.advanceTimersByTimeAsync(1001);

      await promise;

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe("availableTokens", () => {
    it("starts at maxRequests", () => {
      const limiter = new RateLimiter({ maxRequests: 7, windowMs: 1000 });
      expect(limiter.availableTokens).toBe(7);
    });

    it("decreases as requests are made", async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(4);

      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(3);
    });

    it("recovers after the window expires", async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      await limiter.execute(fn);
      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(1);

      // Advance past the window
      vi.advanceTimersByTime(1001);

      expect(limiter.availableTokens).toBe(3);
    });

    it("never goes below zero", async () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears all tracked timestamps", async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      await limiter.execute(fn);
      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(1);

      limiter.reset();
      expect(limiter.availableTokens).toBe(3);
    });
  });

  describe("sliding window behavior", () => {
    it("prunes old timestamps as they expire", async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
      const fn = vi.fn().mockResolvedValue("ok");

      // Make first request at t=0
      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(1);

      // Advance 500ms, make second request
      vi.advanceTimersByTime(500);
      await limiter.execute(fn);
      expect(limiter.availableTokens).toBe(0);

      // Advance to t=1001 — first request should have expired
      vi.advanceTimersByTime(501);
      expect(limiter.availableTokens).toBe(1);

      // Advance to t=1501 — second request should also have expired
      vi.advanceTimersByTime(500);
      expect(limiter.availableTokens).toBe(2);
    });
  });
});
