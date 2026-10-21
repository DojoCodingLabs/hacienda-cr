import { describe, it, expect, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileDocumentStore } from "./file-store.js";
import { createStoredDocument, situationFromClave, classifySendResult } from "./state-machine.js";
import { submitAndWait } from "../api/orchestrator.js";
import type { HttpClient } from "../api/http-client.js";
const clave = "50621102600310123456700100001010000000001112345678";
const request = {
  clave,
  fecha: "2026-10-21T10:00:00-06:00",
  emisor: { tipoIdentificacion: "02", numeroIdentificacion: "3101234567" },
  comprobanteXml: Buffer.from("<signed/>").toString("base64"),
};
async function isolated(run: (store: FileDocumentStore, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "hacienda-outbox-test-"));
  try {
    await run(new FileDocumentStore({ baseDir: directory }), directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
describe("durable delivery invariants", () => {
  it("binds immutable bytes and allows only one concurrent CAS transition", () =>
    isolated(async (store, directory) => {
      const doc = createStoredDocument({
        clave,
        xml: "<signed/>",
        situation: "normal",
        generatedAt: new Date(request.fecha),
      });
      await store.persist(doc);
      await expect(store.persist({ ...doc, xml: "<changed/>" })).rejects.toThrow(/immutable/);
      const results = await Promise.allSettled([
        store.transition(clave, "FIRMADO", "PENDIENTE"),
        store.transition(clave, "FIRMADO", "PENDIENTE"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(required(await store.get(clave)).transitions).toHaveLength(2);
      await expect(store.update(clave, { xml: "other" })).rejects.toThrow();
      await writeFile(join(directory, "broken.json"), "not JSON");
      await expect(store.listPending()).rejects.toThrow();
    }));
  it("polls through processing and handles actual XML without JSON parsing", () =>
    isolated(async (store) => {
      const states = ["procesando", "aceptado"];
      const post = vi.fn(async () => ({ status: 201, headers: new Headers(), data: {} }));
      const get = vi.fn(async () => ({
        status: 200,
        headers: new Headers(),
        data: {
          clave,
          "ind-estado": states.shift(),
          "respuesta-xml": Buffer.from("<MensajeHacienda/>").toString("base64"),
        },
      }));
      const result = await submitAndWait({ post, get } as unknown as HttpClient, request, {
        store,
        pollIntervalMs: 0,
        timeoutMs: 1000,
      });
      expect(result.accepted).toBe(true);
      expect(result.pollAttempts).toBe(2);
      expect(await store.getState(clave)).toBe("ACEPTADO");
      expect(post).toHaveBeenCalledTimes(1);
    }));
  it("persists intent before POST and resumes ambiguous outcomes without replay", () =>
    isolated(async (store) => {
      const post = vi.fn(async () => {
        expect(await store.getState(clave)).toBe("PENDIENTE");
        throw new Error("response lost");
      });
      const get = vi.fn(async () => ({
        status: 200,
        headers: new Headers(),
        data: { clave, "ind-estado": "aceptado" },
      }));
      const client = { post, get } as unknown as HttpClient;
      await expect(
        submitAndWait(client, request, { store, pollIntervalMs: 0, timeoutMs: 1000 }),
      ).rejects.toThrow("response lost");
      await expect(submitAndWait(client, request, { store })).rejects.toThrow(/resume/);
      expect(
        (
          await submitAndWait(client, request, {
            store,
            resumePending: true,
            pollIntervalMs: 0,
            timeoutMs: 1000,
          })
        ).accepted,
      ).toBe(true);
      expect(post).toHaveBeenCalledTimes(1);
    }));
  it("uses validated situation offsets and never infers fiscal rejection from HTTP", () => {
    expect(situationFromClave(clave.slice(0, 41) + "2" + clave.slice(42))).toBe("contingencia");
    expect(() => situationFromClave("bad")).toThrow();
    for (const status of ["recibido", "procesando"])
      expect(classifySendResult(null, 200, { estado: status }).type).toBe("ambiguous");
    for (const status of [401, 409, 429, 500])
      expect(classifySendResult(new Error("HTTP"), status).type).toBe("ambiguous");
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing required value");
  return value;
}

it("only one concurrent first sender can claim the persisted intent", () =>
  isolated(async (store) => {
    const doc = createStoredDocument({
      clave,
      xml: "<signed/>",
      situation: "normal",
      generatedAt: new Date(request.fecha),
    });
    await store.persist(doc);
    const post = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { status: 201, headers: new Headers(), data: {} };
    });
    const get = vi.fn(async () => ({
      status: 200,
      headers: new Headers(),
      data: { clave, "ind-estado": "aceptado" },
    }));
    const calls = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        submitAndWait({ post, get } as unknown as HttpClient, request, {
          store,
          pollIntervalMs: 0,
          timeoutMs: 2000,
        }),
      ),
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(calls.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  }));

it("explicit resume only queries even when the saved document has no send intent", () =>
  isolated(async (store) => {
    await store.persist(
      createStoredDocument({
        clave,
        xml: "<signed/>",
        situation: "normal",
        generatedAt: new Date(request.fecha),
      }),
    );
    const post = vi.fn(),
      get = vi.fn(async () => ({
        status: 200,
        headers: new Headers(),
        data: { clave, "ind-estado": "aceptado" },
      }));
    const result = await submitAndWait({ post, get } as unknown as HttpClient, request, {
      store,
      resumePending: true,
      pollIntervalMs: 0,
      timeoutMs: 1000,
    });
    expect(result.accepted).toBe(true);
    expect(post).not.toHaveBeenCalled();
  }));
