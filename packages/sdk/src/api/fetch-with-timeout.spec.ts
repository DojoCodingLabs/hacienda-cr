import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetch-with-timeout.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A fetch that never settles unless its signal aborts. */
function hangingFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
          once: true,
        });
      }),
  );
}

describe("fetchWithTimeout", () => {
  it("returns the response and defaults to redirect: error", async () => {
    const fetchFn = vi.fn(async () => new Response("ok"));
    const response = await fetchWithTimeout(
      "https://example.test/",
      { method: "GET" },
      { fetchFn },
    );
    expect(await response.text()).toBe("ok");
    const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.redirect).toBe("error");
    expect(init.method).toBe("GET");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects with a TimeoutError when headers do not arrive in time", async () => {
    const fetchFn = hangingFetch();
    const error = await fetchWithTimeout("https://example.test/", {}, { fetchFn, timeoutMs: 10 })
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("TimeoutError");
    const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
  });

  it("times out even if the fetch implementation ignores the signal", async () => {
    const fetchFn = vi.fn(() => new Promise<Response>(() => undefined));
    await expect(
      fetchWithTimeout("https://example.test/", {}, { fetchFn, timeoutMs: 10 }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("propagates an external abort reason and aborts the underlying request", async () => {
    const fetchFn = hangingFetch();
    const controller = new AbortController();
    const pending = fetchWithTimeout(
      "https://example.test/",
      { signal: controller.signal },
      { fetchFn, timeoutMs: 10_000 },
    );
    await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledOnce());
    const reason = new Error("caller cancelled");
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
  });

  it("does not call fetch when the external signal is already aborted", async () => {
    const fetchFn = vi.fn();
    const reason = new Error("already cancelled");
    await expect(
      fetchWithTimeout("https://example.test/", { signal: AbortSignal.abort(reason) }, { fetchFn }),
    ).rejects.toBe(reason);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject", "timeout"] as const)(
    "removes its external abort listener and timer after %s",
    async (outcome) => {
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const clear = vi.spyOn(globalThis, "clearTimeout");
      const fetchFn =
        outcome === "resolve"
          ? vi.fn(async () => new Response("ok"))
          : outcome === "reject"
            ? vi.fn(async () => {
                throw new TypeError("fetch failed");
              })
            : hangingFetch();
      await fetchWithTimeout(
        "https://example.test/",
        { signal: controller.signal },
        { fetchFn, timeoutMs: 10 },
      ).catch(() => undefined);
      const added = add.mock.calls.filter(([type]) => type === "abort").map(([, l]) => l);
      const removed = remove.mock.calls.filter(([type]) => type === "abort").map(([, l]) => l);
      expect(added).toHaveLength(1);
      expect(removed).toContain(added[0]);
      expect(clear).toHaveBeenCalled();
    },
  );

  it("does not abort the returned response when the caller aborts afterwards", async () => {
    const fetchFn = hangingFetch();
    fetchFn.mockImplementationOnce(async () => new Response("ok"));
    const controller = new AbortController();
    const response = await fetchWithTimeout(
      "https://example.test/",
      { signal: controller.signal },
      { fetchFn },
    );
    controller.abort();
    const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.signal?.aborted).toBe(false);
    expect(await response.text()).toBe("ok");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 31])(
    "rejects invalid timeout %s before calling fetch",
    async (timeoutMs) => {
      const fetchFn = vi.fn();
      await expect(
        fetchWithTimeout("https://example.test/", {}, { fetchFn, timeoutMs }),
      ).rejects.toThrow(RangeError);
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );
});
