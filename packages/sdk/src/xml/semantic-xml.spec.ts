import { describe, expect, it } from "vitest";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { validateDocumentXml } from "./schema-validator.js";
import { validateFacturaInput } from "./validator.js";

describe("runtime XSD and semantic validation boundary", () => {
  it("retains an issued CIIU4 activity code without transforming punctuation", async () => {
    const input = structuredClone(SIMPLE_INVOICE);
    input.codigoActividadEmisor = "6209.0";
    expect(validateFacturaInput(input).valid).toBe(true);
    const xml = buildFacturaXml(input);
    expect(xml).toContain("<CodigoActividadEmisor>6209.0</CodigoActividadEmisor>");
    expect((await validateDocumentXml(xml)).valid).toBe(true);
  });

  it("rejects raw XML with an XSD-valid but inconsistent taxpayer identity", async () => {
    const xml = buildFacturaXml(SIMPLE_INVOICE).replace(
      `<Numero>${SIMPLE_INVOICE.emisor.identificacion.numero}</Numero>`,
      "<Numero>3101111111</Numero>",
    );
    const result = await validateDocumentXml(xml);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes("clave taxpayer"))).toBe(true);
  });
});
