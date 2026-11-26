/**
 * Submission-identity guard: one clave, one set of signed bytes, and an
 * explicit API for resending the same bytes. Mocked HTTP and temporary
 * directories only.
 */

import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { HttpClient } from "../api/http-client.js";
import { submitAndWait } from "../api/orchestrator.js";
import { reconcileByClave, submitDocument } from "../api/submission.js";
import { ValidationError } from "../errors.js";
import { FileDocumentStore } from "./file-store.js";
import {
  FileSubmissionIdentityStore,
  SubmissionIdentityError,
  createDefaultSubmissionIdentityStore,
  guardSubmissionIdentity,
  signedXmlSha256,
} from "./submission-identity.js";
import type { SubmissionIdentityStore } from "./submission-identity.js";
import type { SubmissionRequest } from "@dojocoding/hacienda-shared";
import type { TokenManager } from "../auth/token-manager.js";

const clave = "50601012300310123456700100001010000000001199999999";
const signedA = Buffer.from("<FacturaElectronica>A<ds:Signature/></FacturaElectronica>");
const signedB = Buffer.from("<FacturaElectronica>B<ds:Signature/></FacturaElectronica>");
const request = (bytes: Buffer): SubmissionRequest => ({
  clave,
  fecha: "2026-01-01T10:00:00-06:00",
  emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
  comprobanteXml: bytes.toString("base64"),
});
// HttpClient only calls getAccessToken; type the stub to that narrow surface.
const tokenStub: Pick<TokenManager, "getAccessToken"> = {
  getAccessToken: async () => "synthetic-token",
};
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function isolated(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "hacienda-identity-test-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function client(fetchFn: typeof fetch): HttpClient {
  return new HttpClient({
    envConfig: {
      name: "Synthetic",
      apiBaseUrl: "https://identity.example.test/v1",
      idpTokenUrl: "https://identity.example.test/token",
      clientId: "synthetic",
    },
    tokenManager: tokenStub as TokenManager,
    fetchFn,
    rateLimiterOptions: false,
    retryOptions: { maxRetries: 0 },
    requestTimeoutMs: 1000,
  });
}

const created = () => new Response(null, { status: 202 });

describe("signedXmlSha256", () => {
  it("hashes the decoded signed bytes", () => {
    expect(signedXmlSha256(signedA.toString("base64"))).toBe(sha(signedA));
  });

  it.each(["", "not base64!", "QUJD\nREVG", "QUJ", "QUJDRA="])(
    "rejects non-strict Base64 %j",
    (value) => {
      expect(() => signedXmlSha256(value)).toThrow(ValidationError);
    },
  );
});

describe("FileSubmissionIdentityStore", () => {
  it("binds the first digest durably with mode 0600 and refuses a different one", () =>
    isolated(async (directory) => {
      const store = new FileSubmissionIdentityStore({ baseDir: join(directory, "ids") });
      const at = new Date("2026-01-01T16:00:00.000Z");
      const first = await store.claim(clave, sha(signedA), "first", at);
      expect(first).toEqual({
        outcome: "first",
        record: {
          clave,
          sha256: sha(signedA),
          firstAttemptAt: at.toISOString(),
          lastAttemptAt: at.toISOString(),
          attempts: 1,
        },
      });
      const file = join(directory, "ids", `${clave}.json`);
      expect((await stat(file)).mode & 0o777).toBe(0o600);
      expect((await stat(join(directory, "ids"))).mode & 0o777).toBe(0o700);
      expect(JSON.parse(await readFile(file, "utf8"))).toEqual(first.record);

      const conflict = await store.claim(clave, sha(signedB), "retry", new Date());
      expect(conflict).toEqual({ outcome: "conflict", record: first.record });
      const repeated = await store.claim(clave, sha(signedA), "first", new Date());
      expect(repeated).toEqual({ outcome: "already_attempted", record: first.record });
      expect(await store.get(clave)).toEqual(first.record);

      const later = new Date("2026-01-01T17:00:00.000Z");
      const retry = await store.claim(clave, sha(signedA), "retry", later);
      expect(retry).toEqual({
        outcome: "retry",
        record: { ...first.record, lastAttemptAt: later.toISOString(), attempts: 2 },
      });
      // No temporary files or lock directories are left behind.
      expect((await readdir(join(directory, "ids"))).sort()).toEqual([`${clave}.json`]);
    }));

  it("lets exactly one of several concurrent first claims win", () =>
    isolated(async (directory) => {
      const store = new FileSubmissionIdentityStore({ baseDir: directory });
      const claims = await Promise.all(
        [signedA, signedA, signedB, signedA].map((bytes) =>
          store.claim(clave, sha(bytes), "first", new Date()),
        ),
      );
      expect(claims.filter((claim) => claim.outcome === "first")).toHaveLength(1);
      const winner = claims.find((claim) => claim.outcome === "first")?.record.sha256;
      expect(winner).toMatch(/^[0-9a-f]{64}$/);
      for (const claim of claims) expect(claim.record.sha256).toBe(winner);
    }));

  it("reports a corrupt record instead of treating it as absent", () =>
    isolated(async (directory) => {
      const store = new FileSubmissionIdentityStore({ baseDir: directory });
      await writeFile(join(directory, `${clave}.json`), "not JSON");
      await expect(store.get(clave)).rejects.toThrow();
      await expect(store.claim(clave, sha(signedA), "first", new Date())).rejects.toThrow();
      await writeFile(
        join(directory, `${clave}.json`),
        JSON.stringify({
          clave: clave.slice(0, -1) + "0",
          sha256: sha(signedA),
          firstAttemptAt: "2026-01-01T00:00:00.000Z",
          lastAttemptAt: "2026-01-01T00:00:00.000Z",
          attempts: 1,
        }),
      );
      await expect(store.get(clave)).rejects.toThrow(/corrupt/);
    }));

  it("validates keys, digests, modes and times before touching the disk", () =>
    isolated(async (directory) => {
      const baseDir = join(directory, "never-created");
      const store = new FileSubmissionIdentityStore({ baseDir });
      await expect(store.get("../" + clave)).rejects.toThrow(ValidationError);
      await expect(store.claim(clave, "ABC", "first", new Date())).rejects.toThrow(ValidationError);
      await expect(
        store.claim(clave, sha(signedA), "other" as "first", new Date()),
      ).rejects.toThrow(ValidationError);
      await expect(store.claim(clave, sha(signedA), "first", new Date(NaN))).rejects.toThrow(
        ValidationError,
      );
      await expect(stat(baseDir)).rejects.toMatchObject({ code: "ENOENT" });
    }));

  it("defaults to <configDir>/submission-identity", () =>
    isolated(async (directory) => {
      const store = createDefaultSubmissionIdentityStore(directory);
      await store.claim(clave, sha(signedA), "first", new Date());
      await expect(
        stat(join(directory, "submission-identity", `${clave}.json`)),
      ).resolves.toBeTruthy();
    }));
});

describe("guardSubmissionIdentity", () => {
  it("throws a typed DIFFERENT_BYTES or ALREADY_ATTEMPTED error", () =>
    isolated(async (directory) => {
      const store = new FileSubmissionIdentityStore({ baseDir: directory });
      await guardSubmissionIdentity(store, request(signedA));
      const different = await guardSubmissionIdentity(store, request(signedB), {
        retrySameBytes: true,
      }).catch((error: unknown) => error);
      expect(different).toBeInstanceOf(SubmissionIdentityError);
      expect(different).toBeInstanceOf(ValidationError);
      expect(different).toMatchObject({
        reason: "DIFFERENT_BYTES",
        clave,
        recordedSha256: sha(signedA),
        attemptedSha256: sha(signedB),
      });
      await expect(guardSubmissionIdentity(store, request(signedA))).rejects.toMatchObject({
        name: "SubmissionIdentityError",
        reason: "ALREADY_ATTEMPTED",
      });
      await expect(
        guardSubmissionIdentity(store, request(signedA), { retrySameBytes: true }),
      ).resolves.toMatchObject({ attempts: 2 });
    }));

  it("rejects a malformed clave or payload before calling the store", async () => {
    const store: SubmissionIdentityStore = { get: vi.fn(), claim: vi.fn() };
    await expect(
      guardSubmissionIdentity(store, { ...request(signedA), clave: "../" + clave }),
    ).rejects.toThrow(ValidationError);
    await expect(
      guardSubmissionIdentity(store, { ...request(signedA), comprobanteXml: "<xml/>" }),
    ).rejects.toThrow(ValidationError);
    expect(store.claim).not.toHaveBeenCalled();
  });

  it.each([
    ["a record for another clave", { outcome: "first", record: { clave: "x", sha256: "0" } }],
    ["first with another digest", { outcome: "first", digest: "B" }],
    ["retry when a first attempt was asked", { outcome: "retry", digest: "A" }],
    ["conflict with the same digest", { outcome: "conflict", digest: "A" }],
    ["an unknown outcome", { outcome: "maybe", digest: "A" }],
    ["no answer", undefined],
  ])("fails closed when a custom store returns %s", async (_label, answer) => {
    const recordFor = (digest: string) => ({
      clave,
      sha256: digest === "A" ? sha(signedA) : sha(signedB),
      firstAttemptAt: "2026-01-01T00:00:00.000Z",
      lastAttemptAt: "2026-01-01T00:00:00.000Z",
      attempts: 1,
    });
    const value =
      answer === undefined
        ? undefined
        : "digest" in answer
          ? { outcome: answer.outcome, record: recordFor(answer.digest) }
          : answer;
    const store = {
      get: vi.fn(),
      claim: vi.fn(async () => value),
    } as unknown as SubmissionIdentityStore;
    const fetchFn = vi.fn(async () => created());
    await expect(
      submitDocument(client(fetchFn as typeof fetch), request(signedA), { identityStore: store }),
    ).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("submitDocument with an identity store", () => {
  it("refuses different bytes for the same clave before any network call", () =>
    isolated(async (directory) => {
      const identityStore = new FileSubmissionIdentityStore({ baseDir: directory });
      const fetchFn = vi.fn(async () => created());
      const http = client(fetchFn as typeof fetch);
      await expect(submitDocument(http, request(signedA), { identityStore })).resolves.toEqual({
        status: 202,
        location: undefined,
      });
      expect(fetchFn).toHaveBeenCalledOnce();
      for (const retrySameBytes of [false, true]) {
        await expect(
          submitDocument(http, request(signedB), { identityStore, retrySameBytes }),
        ).rejects.toMatchObject({ name: "SubmissionIdentityError", reason: "DIFFERENT_BYTES" });
      }
      expect(fetchFn).toHaveBeenCalledOnce();
    }));

  it("records the attempt even when the POST outcome is lost", () =>
    isolated(async (directory) => {
      const identityStore = new FileSubmissionIdentityStore({ baseDir: directory });
      const fetchFn = vi.fn(async () => {
        throw new TypeError("socket hang up");
      });
      const http = client(fetchFn as typeof fetch);
      await expect(submitDocument(http, request(signedA), { identityStore })).rejects.toThrow(
        /Network error/,
      );
      await expect(submitDocument(http, request(signedA), { identityStore })).rejects.toMatchObject(
        { reason: "ALREADY_ATTEMPTED" },
      );
      await expect(submitDocument(http, request(signedB), { identityStore })).rejects.toMatchObject(
        { reason: "DIFFERENT_BYTES" },
      );
      expect(fetchFn).toHaveBeenCalledOnce();
    }));

  it("allows the same bytes after an inconclusive not_found only through retrySameBytes", () =>
    isolated(async (directory) => {
      const identityStore = new FileSubmissionIdentityStore({ baseDir: directory });
      const calls: string[] = [];
      let postOutcome: "lost" | "ok" = "lost";
      const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
        calls.push(`${init?.method} ${String(url)}`);
        if (init?.method === "GET")
          return new Response("", {
            status: 400,
            headers: { "X-Error-Cause": `El comprobante ${clave} no ha sido recibido.` },
          });
        if (postOutcome === "lost") throw new TypeError("response lost");
        return created();
      });
      const http = client(fetchFn as typeof fetch);
      await expect(submitDocument(http, request(signedA), { identityStore })).rejects.toThrow();
      const reconciled = await reconcileByClave(http, clave);
      expect(reconciled).toMatchObject({ kind: "not_found", conclusive: false, httpStatus: 400 });

      // A not_found result is not a permission: the default path still refuses.
      await expect(submitDocument(http, request(signedA), { identityStore })).rejects.toMatchObject(
        { reason: "ALREADY_ATTEMPTED" },
      );
      expect(calls.filter((call) => call.startsWith("POST"))).toHaveLength(1);

      postOutcome = "ok";
      await expect(
        submitDocument(http, request(signedA), { identityStore, retrySameBytes: true }),
      ).resolves.toMatchObject({ status: 202 });
      expect(calls.filter((call) => call.startsWith("POST"))).toHaveLength(2);
      expect(await identityStore.get(clave)).toMatchObject({ attempts: 2, sha256: sha(signedA) });
    }));

  it("requires an identity store for retrySameBytes and keeps legacy calls unguarded", async () => {
    const fetchFn = vi.fn(async () => created());
    const http = client(fetchFn as typeof fetch);
    await expect(
      submitDocument(http, request(signedA), { retrySameBytes: true }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(fetchFn).not.toHaveBeenCalled();
    await submitDocument(http, request(signedA));
    await submitDocument(http, request(signedB));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not record an attempt when the caller already cancelled", () =>
    isolated(async (directory) => {
      const identityStore = new FileSubmissionIdentityStore({ baseDir: directory });
      const fetchFn = vi.fn(async () => created());
      await expect(
        submitDocument(client(fetchFn as typeof fetch), request(signedA), {
          identityStore,
          signal: AbortSignal.abort(new Error("cancelled")),
        }),
      ).rejects.toThrow("cancelled");
      expect(await identityStore.get(clave)).toBeNull();
      expect(fetchFn).not.toHaveBeenCalled();
    }));
});

describe("submitAndWait with an identity store", () => {
  const accepted = () =>
    new Response(JSON.stringify({ clave, "ind-estado": "aceptado" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  it("refuses a divergent resubmit before any network call", () =>
    isolated(async (directory) => {
      const identityStore = new FileSubmissionIdentityStore({ baseDir: directory });
      const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) =>
        init?.method === "POST" ? created() : accepted(),
      );
      const http = client(fetchFn as typeof fetch);
      const options = { identityStore, pollIntervalMs: 0, timeoutMs: 1000 };
      expect((await submitAndWait(http, request(signedA), options)).accepted).toBe(true);
      const calls = fetchFn.mock.calls.length;
      await expect(submitAndWait(http, request(signedB), options)).rejects.toMatchObject({
        name: "SubmissionIdentityError",
        reason: "DIFFERENT_BYTES",
      });
      await expect(submitAndWait(http, request(signedA), options)).rejects.toMatchObject({
        reason: "ALREADY_ATTEMPTED",
      });
      expect(fetchFn.mock.calls.length).toBe(calls);
      expect(
        (await submitAndWait(http, request(signedA), { ...options, retrySameBytes: true }))
          .accepted,
      ).toBe(true);
    }));

  it("keeps polling through the sandbox not-received 400 after a POST", async () => {
    let gets = 0;
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === "POST") return created();
      gets++;
      if (gets === 1)
        return new Response("", {
          status: 400,
          headers: { "X-Error-Cause": "El comprobante no ha sido recibido." },
        });
      return accepted();
    });
    const result = await submitAndWait(client(fetchFn as typeof fetch), request(signedA), {
      pollIntervalMs: 0,
      timeoutMs: 1000,
    });
    expect(result).toMatchObject({ accepted: true, pollAttempts: 2 });
  });

  it("still throws a poll 400 whose cause is not the recognized answer", async () => {
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) =>
      init?.method === "POST"
        ? created()
        : new Response("", { status: 400, headers: { "X-Error-Cause": "Otro error" } }),
    );
    await expect(
      submitAndWait(client(fetchFn as typeof fetch), request(signedA), {
        pollIntervalMs: 0,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, errorCause: "Otro error" });
  });
});

describe("persistent submitAndWait (DocumentStore) identity", () => {
  it("raises a typed DIFFERENT_BYTES error for changed bytes", () =>
    isolated(async (directory) => {
      const store = new FileDocumentStore({ baseDir: directory });
      const post = vi.fn(async () => {
        throw new Error("response lost");
      });
      const get = vi.fn();
      const http = { post, get } as unknown as HttpClient;
      await expect(
        submitAndWait(http, request(signedA), { store, pollIntervalMs: 0, timeoutMs: 1000 }),
      ).rejects.toThrow("response lost");
      const error = await submitAndWait(http, request(signedB), { store }).catch(
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(SubmissionIdentityError);
      expect(error).toMatchObject({
        reason: "DIFFERENT_BYTES",
        recordedSha256: sha(signedA),
        attemptedSha256: sha(signedB),
        message: expect.stringContaining("Clave is already bound to different document bytes"),
      });
      expect(post).toHaveBeenCalledOnce();
    }));

  it("refuses retrySameBytes, which would replay a persisted POST", () =>
    isolated(async (directory) => {
      const store = new FileDocumentStore({ baseDir: directory });
      const post = vi.fn();
      await expect(
        submitAndWait({ post, get: vi.fn() } as unknown as HttpClient, request(signedA), {
          store,
          retrySameBytes: true,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(post).not.toHaveBeenCalled();
      expect(await store.get(clave)).toBeNull();
    }));

  it("checks an identity store before leaving FIRMADO and skips it on resume", () =>
    isolated(async (directory) => {
      const store = new FileDocumentStore({ baseDir: join(directory, "delivery") });
      const identityStore = new FileSubmissionIdentityStore({ baseDir: join(directory, "ids") });
      // Another path already bound different bytes to this clave.
      await identityStore.claim(clave, sha(signedB), "first", new Date());
      const post = vi.fn(async () => ({ status: 201, headers: new Headers(), data: {} }));
      const get = vi.fn(async () => ({
        status: 200,
        headers: new Headers(),
        data: { clave, "ind-estado": "aceptado" },
      }));
      const http = { post, get } as unknown as HttpClient;
      await expect(
        submitAndWait(http, request(signedA), { store, identityStore, timeoutMs: 1000 }),
      ).rejects.toMatchObject({ reason: "DIFFERENT_BYTES" });
      expect(await store.getState(clave)).toBe("FIRMADO");
      expect(post).not.toHaveBeenCalled();

      const fresh = new FileSubmissionIdentityStore({ baseDir: join(directory, "ids-2") });
      const lost = vi.fn(async () => {
        throw new Error("response lost");
      });
      await expect(
        submitAndWait({ post: lost, get } as unknown as HttpClient, request(signedA), {
          store,
          identityStore: fresh,
          pollIntervalMs: 0,
          timeoutMs: 1000,
        }),
      ).rejects.toThrow("response lost");
      const resumed = await submitAndWait(http, request(signedA), {
        store,
        identityStore: fresh,
        resumePending: true,
        pollIntervalMs: 0,
        timeoutMs: 1000,
      });
      expect(resumed.accepted).toBe(true);
      expect(post).not.toHaveBeenCalled();
      expect(await fresh.get(clave)).toMatchObject({ attempts: 1 });
    }));
});
