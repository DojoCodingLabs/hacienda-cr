import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), get: vi.fn() }));
vi.mock("../utils/api-client.js", () => ({ createAuthenticatedClient: mocks.auth }));
vi.mock("@dojocoding/hacienda-sdk", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  listComprobantes: mocks.list,
  getComprobante: mocks.get,
}));
import { listCommand } from "./list.js";
import { getCommand } from "./get.js";
const clave = "50601012500310123456700100001010000000001100000001";
const metadata = {
  clave,
  fecha: "2025-01-12T10:00:00-06:00",
  emisor: { tipoIdentificacion: "02", numeroIdentificacion: "003101234567", nombre: "Synthetic" },
  receptor: { tipoIdentificacion: "01", numeroIdentificacion: "001230456", nombre: "Synthetic" },
  notasCredito: [{ clave: "0".repeat(50), fecha: "2025-01-13T10:00:00Z" }],
};
beforeEach(() => {
  vi.clearAllMocks();
  process.exitCode = 0;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.auth.mockResolvedValue({ httpClient: {} });
});
afterEach(() => {
  process.exitCode = 0;
  vi.restoreAllMocks();
});
async function list(args: Record<string, unknown> = {}) {
  if (!listCommand.run) throw new Error("missing list handler");
  await listCommand.run({
    args: { limit: "20", offset: "0", profile: "synthetic", json: true, ...args },
  } as never);
}
describe("history adapter", () => {
  it("rejects unsupported flags, IDs and bounds before authenticating", async () => {
    for (const args of [
      { fechaEmisionDesde: "2025-01-01" },
      { emisorIdentificacion: "3101234567" },
      { limit: "51" },
      { offset: "-1" },
      { emisor: "05foreign" },
      { limit: "1e1" },
    ])
      await list(args);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("forwards exact combined filters and outputs observed metadata/ranges, no status or total", async () => {
    mocks.list.mockResolvedValue({
      comprobantes: [metadata],
      offset: 0,
      limit: 20,
      pagination: { httpStatus: 206, acceptRange: "resource 50", contentRange: "0-20/100" },
    });
    await list({ emisor: "02003101234567", receptor: "01001230456" });
    expect(mocks.list).toHaveBeenCalledWith(
      {},
      { offset: 0, limit: 20, emisor: "02003101234567", receptor: "01001230456" },
    );
    const output = JSON.parse(vi.mocked(console.log).mock.calls.at(0)?.[0] as string);
    expect(output.pagination.contentRange).toBe("0-20/100");
    expect(output.comprobantes[0].emisor.numeroIdentificacion).toBe("003101234567");
    expect(output).not.toHaveProperty("totalRegistros");
    expect(output.comprobantes[0]).not.toHaveProperty("estado");
  });
  it("keeps raw range observations in JSON while removing terminal controls from human output", async () => {
    const range = "\u001b[31m0-20/100\u001b[0m";
    mocks.list.mockResolvedValue({
      comprobantes: [],
      offset: 0,
      limit: 20,
      pagination: { httpStatus: 206, acceptRange: "resource 50", contentRange: range },
    });
    await list({ json: true });
    expect(
      JSON.parse(vi.mocked(console.log).mock.calls.at(0)?.[0] as string).pagination.contentRange,
    ).toBe(range);
    vi.mocked(console.log).mockClear();
    await list({ json: false });
    const text = vi
      .mocked(console.log)
      .mock.calls.map((call) => String(call[0]))
      .join("\n");
    expect(text).toContain("Content-Range: 0-20/100");
    expect(text).not.toContain("\u001b");
  });
  it("get keeps metadata/references and exact sequence zeroes without original/status claims", async () => {
    mocks.get.mockResolvedValue(metadata);
    if (!getCommand.run) throw new Error("missing get handler");
    await getCommand.run({ args: { clave, profile: "synthetic", json: true } } as never);
    const output = JSON.parse(vi.mocked(console.log).mock.calls.at(0)?.[0] as string);
    expect(output.fecha).toBe(metadata.fecha);
    expect(output.notasCredito).toEqual(metadata.notasCredito);
    expect(output.parsed.sequence).toBe(clave.slice(31, 41));
    expect(output).not.toHaveProperty("estado");
    expect(output).not.toHaveProperty("comprobanteXml");
  });
});
