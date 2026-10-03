import { describe, it, expect } from "vitest";
import { validateDocumentXml } from "./schema-validator.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { signXml } from "../signing/signer.js";
import { loadP12 } from "../signing/p12-loader.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { checkXmlInput } from "./input-limits.js";

describe("untrusted XML and certificate inputs", () => {
  it("bounds concurrent XSD workers and recovers capacity afterwards", async () => {
    const xml = buildFacturaXml(SIMPLE_INVOICE);
    const results = await Promise.all(Array.from({ length: 5 }, () => validateDocumentXml(xml)));
    expect(results.filter((result) => result.valid)).toHaveLength(4);
    expect(results.filter((result) => result.issues[0]?.includes("busy"))).toHaveLength(1);
    expect((await validateDocumentXml(xml)).valid).toBe(true);
  });
  it("bounds element count independently of document depth", async () => {
    const result = await validateDocumentXml("<a>" + "<b/>".repeat(100000) + "</a>");
    expect(result.issues[0]).toContain("element limit");
  });
  it.each([
    '<!DOCTYPE a SYSTEM "file:///etc/passwd"><a/>',
    '<!DOCTYPE a [<!ENTITY a SYSTEM "http://127.0.0.1:1/secret">]><a>&a;</a>',
    '<!DOCTYPE a [<!ENTITY a "boom"><!ENTITY b "&a;&a;">]><a>&b;</a>',
  ])("rejects DTDs and entities before parsing %s", async (xml) => {
    const result = await validateDocumentXml(xml);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("DOCTYPE");
    await expect(signXml(xml, Buffer.alloc(0), "pin")).rejects.toThrow("DOCTYPE");
  });
  it("limits UTF-8 bytes rather than string length", async () => {
    const xml = "<a>" + "é".repeat(4 * 1024 * 1024) + "</a>";
    expect((await validateDocumentXml(xml)).issues[0]).toContain("8 MiB");
    await expect(signXml(xml, Buffer.alloc(0), "pin")).rejects.toThrow("8 MiB");
  });
  it("rejects deeply nested XML before recursive DOM processing", async () => {
    const xml = "<a>".repeat(129) + "</a>".repeat(129);
    expect((await validateDocumentXml(xml)).issues[0]).toContain("nesting");
    expect(checkXmlInput("<a>".repeat(128) + "</a>".repeat(128))).toBeUndefined();
  });
  it("ignores fake markup inside quoted attributes and CDATA when counting depth", () => {
    expect(
      checkXmlInput('<a x="' + "<".repeat(200) + '"><![CDATA[' + "<a>".repeat(200) + "]]></a>"),
    ).toBeUndefined();
  });
  it.each(["constructor", "__proto__", "toString"])(
    "rejects inherited schema names %s",
    async (name) => {
      const result = await validateDocumentXml(`<${name}/>`);
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain("Unknown");
    },
  );
  it("uses bundled schemas instead of user schemaLocation", async () => {
    const xml = buildFacturaXml(SIMPLE_INVOICE).replace(
      /xsi:schemaLocation="[^"]*"/,
      'xsi:schemaLocation="https://evil.invalid file:///etc/passwd"',
    );
    expect((await validateDocumentXml(xml)).valid).toBe(true);
  });
  it("rejects XInclude nodes rather than reading their targets", async () => {
    const xml = buildFacturaXml(SIMPLE_INVOICE).replace(
      "</FacturaElectronica>",
      '<xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="file:///etc/passwd"/></FacturaElectronica>',
    );
    expect((await validateDocumentXml(xml)).valid).toBe(false);
  });
  it("rejects malformed XML before signing", async () => {
    await expect(signXml("<root>", Buffer.alloc(0), "pin")).rejects.toThrow("Malformed");
  });
  it("bounds certificate input before ASN.1 parsing", async () => {
    await expect(loadP12(Buffer.alloc(1024 * 1024 + 1), "pin")).rejects.toThrow("1 MiB");
  });
});
