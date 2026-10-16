import { afterEach, describe, expect, it, vi } from "vitest";
import { error, outputJson } from "./format.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("CLI diagnostic secret boundary", () => {
  it("redacts nested secrets and reflected configured credentials in JSON", () => {
    vi.stubEnv("HACIENDA_PASSWORD", "reflected-fixture-secret");
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    outputJson({
      error: {
        message: "remote echoed reflected-fixture-secret",
        nested: { access_token: "fixture-token" },
      },
      amount: 1130,
    });
    const printed = String(output.mock.calls[0]?.[0]);
    expect(printed).not.toContain("fixture-token");
    expect(printed).not.toContain("reflected-fixture-secret");
    expect(JSON.parse(printed)).toMatchObject({ amount: 1130 });
  });
  it("preserves successful fiscal artifacts when their digits match the PIN", () => {
    vi.stubEnv("HACIENDA_P12_PIN", "0000");
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const artifact = {
      success: true,
      clave: "5060000000000",
      signedXml: "<Clave>5060000000000</Clave>",
    };
    outputJson(artifact);
    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toEqual(artifact);
  });
  it("redacts human error bearer tokens", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    error("remote Authorization: Bearer fixture-token");
    expect(String(output.mock.calls[0]?.[0])).not.toContain("fixture-token");
  });
});
