import { it, expect } from "vitest";
import { recordedResponse, sanitizeResponseXml } from "./responses.js";
import { createMockServer } from "./server.js";
it("binds synthetic XML and envelope to the same clave", () => {
  const clave = "50621102600310123456700100001010000000001112345678";
  for (const status of ["aceptado", "rechazado", "error"] as const) {
    const result = recordedResponse(clave, status),
      xml = Buffer.from(result.respuestaXml, "base64").toString("utf8");
    expect(result.clave).toBe(clave);
    expect(xml).toContain(`<Clave>${clave}</Clave>`);
  }
});
it("does not retain secret CDATA, prefixed fields, attributes or original identifiers", () => {
  const xml =
    '<p:MensajeHacienda xmlns:p="urn:test" token="SECRET"><p:NombreEmisor><![CDATA[SECRET]]></p:NombreEmisor><p:Mensaje>1</p:Mensaje><p:Clave>SECRET</p:Clave></p:MensajeHacienda>';
  const projection = sanitizeResponseXml(xml);
  expect(projection).not.toContain("SECRET");
  expect(projection).toContain("SANITIZADO");
});
it("does not expose the synthetic service on public interfaces", async () => {
  await expect(createMockServer({ host: "0.0.0.0" })).rejects.toThrow(/loopback/);
});
