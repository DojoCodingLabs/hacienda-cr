import { describe, it, expect } from "vitest";
import { validateDocumentXml } from "./schema-validator.js";
import { signXml } from "../signing/signer.js";
import { checkXmlInput } from "./input-limits.js";

describe("A6 secret redaction in error paths", () => {
  it("does not leak a secret in validateDocumentXml errors", async () => {
    const secret = "super-secret-token-123";
    const xml = `<root secret="${secret}"><!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]></root>`;
    const res = await validateDocumentXml(xml);
    expect(res.valid).toBe(false);
    expect(JSON.stringify(res)).not.toContain(secret);
  });

  it("does not leak a secret in checkXmlInput", () => {
    const secret = "another-secret-456";
    const xml = "<a>" + secret + "</a>";
    const r = checkXmlInput(xml);
    // no crash; if defined, no secret
    if (r) expect(r).not.toContain(secret);
  });

  it("signXml rejects without leaking the pin", async () => {
    const pin = "pin-secret-789";
    await expect(signXml("<root/>", Buffer.from("bad"), pin)).rejects.toThrow();
    try {
      await signXml("<root/>", Buffer.from("bad"), pin);
    } catch (e) {
      expect(String(e)).not.toContain(pin);
    }
  });
});
