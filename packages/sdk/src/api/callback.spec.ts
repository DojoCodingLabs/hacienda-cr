import { describe, expect, it } from "vitest";
import { parseCallbackPayload, validateCallbackPayload } from "./callback.js";

describe("callback payload parsing", () => {
  it("rejects a missing respuestaXml envelope field? no, optional", () => {
    const envelope = validateCallbackPayload({
      clave: "5".repeat(50),
      fecha: "2026-01-01T00:00:00-06:00",
      indEstado: "RECIBIDO",
    });
    expect(envelope.clave).toHaveLength(50);
  });

  it("rejects malformed JSON", () => {
    expect(() => validateCallbackPayload("{bad")).toThrow();
  });

  it("rejects missing clave", () => {
    expect(() =>
      validateCallbackPayload({ fecha: "2026-01-01T00:00:00-06:00", indEstado: "RECIBIDO" }),
    ).toThrow();
  });

  it("parses a valid envelope without XML", async () => {
    const result = await parseCallbackPayload({
      clave: "5".repeat(50),
      fecha: "2026-01-01T00:00:00-06:00",
      indEstado: "RECIBIDO",
    });
    expect(result.responseXml).toBeUndefined();
  });
});
