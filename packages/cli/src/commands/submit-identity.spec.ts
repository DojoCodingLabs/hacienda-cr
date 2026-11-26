/**
 * `hacienda submit` submission identity: one clave, one set of signed bytes.
 *
 * Signing, XSD validation, the SDK orchestrator, FileDocumentStore and
 * FileSubmissionIdentityStore all run for real. Only authentication is
 * replaced by a fake HttpClient, so no request ever leaves the process.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestP12 } from "../../../sdk/src/__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../../../sdk/src/__fixtures__/invoices.js";
import { createAuthenticatedClient } from "../utils/api-client.js";
import { openSubmissionStores } from "../utils/submission-state.js";
import { useTemporaryConfigHome } from "../__testing__/config-home.js";
import { submitCommand } from "./submit.js";

const http = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("../utils/api-client.js", () => ({
  createAuthenticatedClient: vi.fn(async () => ({
    httpClient: http,
    config: { profile: {}, p12Pin: "test-pin" },
  })),
}));

const CLAVE = SIMPLE_INVOICE.clave;

function accepted() {
  return {
    status: 200,
    headers: new Headers(),
    data: { clave: CLAVE, fecha: "2025-07-27T10:31:00-06:00", "ind-estado": "aceptado" },
  };
}

function postedBytes(call: number): string {
  const request = http.post.mock.calls[call]?.[1] as { comprobanteXml: string } | undefined;
  if (!request) throw new Error(`POST ${String(call)} was not made`);
  return request.comprobanteXml;
}

function lastJson(): Record<string, unknown> {
  return JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0])) as Record<
    string,
    unknown
  >;
}

describe("hacienda submit submission identity", () => {
  let dir: string;
  let file: string;
  let p12: string;
  let originalExitCode: typeof process.exitCode;

  async function submit(extra: Record<string, unknown> = {}): Promise<number | undefined> {
    process.exitCode = undefined;
    await submitCommand.run?.({
      args: { file, p12, json: true, profile: "default", "dry-run": false, ...extra },
      rawArgs: [],
      cmd: submitCommand,
    } as never);
    const code = process.exitCode;
    process.exitCode = undefined;
    return code;
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hacienda-cli-identity-"));
    await useTemporaryConfigHome(dir);
    file = join(dir, "invoice.json");
    p12 = join(dir, "cert.p12");
    await writeFile(file, JSON.stringify(SIMPLE_INVOICE));
    await writeFile(p12, createTestP12("test-pin"));
    originalExitCode = process.exitCode;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    http.post.mockReset();
    http.get.mockReset();
    vi.mocked(createAuthenticatedClient).mockClear();
  });
  afterEach(async () => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it("signs and submits a first clave as before, then refuses a resend of the final clave", async () => {
    http.post.mockResolvedValue({ status: 202, headers: new Headers(), data: {} });
    http.get.mockResolvedValue(accepted());

    expect(await submit()).toBeUndefined();
    expect(http.post).toHaveBeenCalledOnce();
    expect(http.post.mock.calls[0]?.[0]).toBe("/recepcion");
    expect(lastJson()).toMatchObject({ success: true, clave: CLAVE, status: "aceptado" });

    const stores = openSubmissionStores("sandbox", join(dir, ".hacienda-cr"));
    const stored = await stores.documents.get(CLAVE);
    expect(stored?.state).toBe("ACEPTADO");
    expect(Buffer.from(stored?.xml ?? "", "utf8").toString("base64")).toBe(postedBytes(0));
    expect((await stores.identities.get(CLAVE))?.attempts).toBe(1);

    vi.mocked(createAuthenticatedClient).mockClear();
    expect(await submit({ "retry-same-bytes": true })).toBe(1);
    expect(lastJson()).toMatchObject({ success: false, code: "SUBMISSION_FINAL", clave: CLAVE });
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
    expect(http.post).toHaveBeenCalledOnce();
  });

  it("after a lost POST, resends the identical stored bytes only with --retry-same-bytes", async () => {
    http.post.mockRejectedValueOnce(new TypeError("fetch failed: socket hang up"));
    expect(await submit()).toBe(1);
    expect(http.post).toHaveBeenCalledOnce();
    const firstBytes = postedBytes(0);

    // Without the flag: refused locally, before authentication or any request.
    vi.mocked(createAuthenticatedClient).mockClear();
    expect(await submit()).toBe(1);
    expect(lastJson()).toMatchObject({
      success: false,
      code: "SUBMISSION_ALREADY_ATTEMPTED",
      clave: CLAVE,
    });
    expect(String(lastJson()["error"])).toContain(`hacienda status ${CLAVE}`);
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
    expect(http.post).toHaveBeenCalledOnce();
    expect(http.get).not.toHaveBeenCalled();

    // With the flag: the stored bytes go out again. Removing the certificate
    // proves the CLI does not sign again (a new signature would also carry a
    // new signing time and therefore different bytes).
    await unlink(p12);
    http.post.mockResolvedValueOnce({ status: 202, headers: new Headers(), data: {} });
    http.get.mockResolvedValue(accepted());
    expect(await submit({ "retry-same-bytes": true })).toBeUndefined();
    expect(lastJson()).toMatchObject({ success: true, status: "aceptado" });
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(postedBytes(1)).toBe(firstBytes);
    expect(Buffer.from(postedBytes(1), "base64").equals(Buffer.from(firstBytes, "base64"))).toBe(
      true,
    );

    const stores = openSubmissionStores("sandbox", join(dir, ".hacienda-cr"));
    expect((await stores.identities.get(CLAVE))?.attempts).toBe(2);
    expect((await stores.documents.get(CLAVE))?.state).toBe("ACEPTADO");
  });

  it.each([false, true])(
    "refuses a changed draft for an attempted clave before any network call (retry flag %s)",
    async (retry) => {
      http.post.mockRejectedValueOnce(new TypeError("fetch failed"));
      expect(await submit()).toBe(1);

      await writeFile(
        file,
        JSON.stringify({
          ...SIMPLE_INVOICE,
          detalleServicio: [{ ...SIMPLE_INVOICE.detalleServicio[0], detalle: "Servicio distinto" }],
        }),
      );
      vi.mocked(createAuthenticatedClient).mockClear();
      expect(await submit(retry ? { "retry-same-bytes": true } : {})).toBe(1);
      expect(lastJson()).toMatchObject({
        success: false,
        code: "SUBMISSION_DRAFT_CHANGED",
        clave: CLAVE,
      });
      expect(String(lastJson()["error"])).toContain(`hacienda status ${CLAVE}`);
      expect(createAuthenticatedClient).not.toHaveBeenCalled();
      expect(http.post).toHaveBeenCalledOnce();
      expect(http.get).not.toHaveBeenCalled();
    },
  );

  it("keeps --dry-run free of submission state", async () => {
    process.exitCode = undefined;
    await submitCommand.run?.({
      args: { file, json: true, profile: "default", "dry-run": true },
      rawArgs: [],
      cmd: submitCommand,
    } as never);
    expect(process.exitCode).toBeUndefined();
    expect(lastJson()).toMatchObject({ success: true, dryRun: true });
    expect(await readdir(join(dir, ".hacienda-cr"))).toEqual(["config.toml"]);
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
  });

  it("keeps sandbox and production state apart", async () => {
    http.post.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await submit()).toBe(1);

    await useTemporaryConfigHome(dir, "production");
    http.post.mockResolvedValueOnce({ status: 202, headers: new Headers(), data: {} });
    http.get.mockResolvedValue(accepted());
    expect(await submit()).toBeUndefined();
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
