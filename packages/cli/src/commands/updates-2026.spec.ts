import type * as HaciendaSdk from "@dojocoding/hacienda-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getComprobante, getStatus, lookupTaxpayer } from "@dojocoding/hacienda-sdk";
import { createAuthenticatedClient } from "../utils/api-client.js";
import { getCommand } from "./get.js";
import { statusCommand } from "./status.js";
import { lookupCommand } from "./lookup.js";

vi.mock("@dojocoding/hacienda-sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof HaciendaSdk>()),
  getComprobante: vi.fn().mockResolvedValue({ clave: "test", estado: "aceptado" }),
  getStatus: vi.fn().mockResolvedValue({ clave: "test", indEstado: "aceptado" }),
  lookupTaxpayer: vi.fn().mockResolvedValue({ nombre: "Empresa", actividades: [] }),
}));
vi.mock("../utils/api-client.js", () => ({
  createAuthenticatedClient: vi.fn().mockResolvedValue({ httpClient: {} }),
}));
const clave = "50620102600310123456700100001010000000001112345678";

describe("CLI queries with the authoritative 2024 clave", () => {
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
    await getCommand.run?.({
      args: { clave, profile: "test", json: true },
      rawArgs: [],
      cmd: getCommand,
    });
    expect(getComprobante).toHaveBeenCalledWith({}, clave);
    expect(process.exitCode).toBeUndefined();
  });
  it("checks status with a legal entity clave", async () => {
    await statusCommand.run?.({
      args: { clave, profile: "test", json: true },
      rawArgs: [],
      cmd: statusCommand,
    });
    expect(getStatus).toHaveBeenCalledWith({}, clave);
    expect(process.exitCode).toBeUndefined();
  });
  it("rejects letters in the taxpayer segment before authenticating", async () => {
    const alnum = clave.slice(0, 9) + "00310ABC1234" + clave.slice(21);
    await getCommand.run?.({
      args: { clave: alnum, profile: "test", json: true },
      rawArgs: [],
      cmd: getCommand,
    });
    expect(createAuthenticatedClient).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
  it("looks up an alphanumeric legal entity ID", async () => {
    await lookupCommand.run?.({
      args: { cedula: "310ABC1234", json: true },
      rawArgs: [],
      cmd: lookupCommand,
    });
    expect(lookupTaxpayer).toHaveBeenCalledWith("310ABC1234");
    expect(process.exitCode).toBeUndefined();
  });
});
