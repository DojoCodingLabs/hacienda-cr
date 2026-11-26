import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getComprobante, getStatus, lookupTaxpayer } from "@dojocoding/hacienda-sdk";
import { createAuthenticatedClient } from "../utils/api-client.js";
import { getCommand } from "./get.js";
import { CLAVE_FORMAT_ERROR, statusCommand } from "./status.js";
import { lookupCommand } from "./lookup.js";
import { runCommand } from "../__fixtures__/run-command.js";

vi.mock("@dojocoding/hacienda-sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof HaciendaSdk>()),
  getComprobante: vi.fn().mockResolvedValue({ clave: "test", estado: "aceptado" }),
  getStatus: vi.fn().mockResolvedValue({ clave: "test", indEstado: "aceptado" }),
  lookupTaxpayer: vi.fn().mockResolvedValue({ nombre: "Empresa", actividades: [] }),
}));
vi.mock("../utils/api-client.js", () => ({
  createAuthenticatedClient: vi.fn().mockResolvedValue({ httpClient: {} }),
}));
const clave = "50620102600310ABC123400100001010000000001112345678";

describe("2026 alphanumeric CLI queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.exitCode = undefined;
    vi.mocked(console.log).mockRestore();
    vi.mocked(console.error).mockRestore();
  });
  it("retrieves a document with a legal entity clave", async () => {
    expect(clave.length).toBe(50);
    await runCommand(getCommand, { clave, profile: "test", json: true });
    expect(getComprobante).toHaveBeenCalledWith({}, clave);
    expect(process.exitCode).toBeUndefined();
  });
  it("checks status with a legal entity clave", async () => {
    await runCommand(statusCommand, { clave, profile: "test", json: true });
    expect(getStatus).toHaveBeenCalledWith({}, clave);
    expect(process.exitCode).toBeUndefined();
  });
  it("rejects letters outside the taxpayer segment before authenticating", async () => {
    await runCommand(getCommand, { clave: "A" + clave.slice(1), profile: "test", json: true });
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
  it.each([
    ["a letter outside the taxpayer segment", "A" + clave.slice(1)],
    ["49 characters", clave.slice(1)],
  ])("status rejects %s with the current clave format message", async (_label, bad) => {
    await runCommand(statusCommand, { clave: bad, profile: "test", json: true });
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    const printed = vi
      .mocked(console.error)
      .mock.calls.map((call) => String(call[0]))
      .join("\n");
    expect(printed).toContain(CLAVE_FORMAT_ERROR);
    expect(CLAVE_FORMAT_ERROR).toMatch(/taxpayer ID segment \(characters 10-21\)/);
    expect(CLAVE_FORMAT_ERROR).not.toMatch(/letters only/);
  });
  it("looks up an alphanumeric legal entity ID", async () => {
    await runCommand(lookupCommand, { cedula: "310ABC1234", json: true });
    expect(lookupTaxpayer).toHaveBeenCalledWith("310ABC1234");
    expect(process.exitCode).toBeUndefined();
  });
});
