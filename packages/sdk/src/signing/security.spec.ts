import { describe, expect, it } from "vitest";
import * as xadesjs from "xadesjs";
import { signXml } from "./signer.js";
import { loadP12 } from "./p12-loader.js";
import { buildFacturaXml } from "../documents/factura-builder.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { createTestP12 } from "../__fixtures__/signing.js";

it("verifies a real signature and rejects document tampering using native WebCrypto", async () => {
  const signed = await signXml(buildFacturaXml(SIMPLE_INVOICE), createTestP12("test"), "test");
  async function verify(xml: string) {
    const doc = xadesjs.Parse(xml);
    const signature = doc.getElementsByTagNameNS(
      "http://www.w3.org/2000/09/xmldsig#",
      "Signature",
    )[0];
    if (!signature) throw new Error("No signature");
    const verifier = new xadesjs.SignedXml(doc);
    verifier.LoadXml(signature);
    return verifier.Verify();
  }
  expect(await verify(signed)).toBe(true);
  await expect(verify(signed.replace("Empresa Test S.A.", "Attacker Test S.A."))).rejects.toThrow();
});
describe("certificate hardening", () => {
  it("rejects weak RSA keys", async () => {
    await expect(loadP12(createTestP12("test", { bits: 1024 }), "test")).rejects.toThrow("2048");
  });
  it("rejects expired certificates", async () => {
    await expect(
      loadP12(createTestP12("test", { expiresAt: new Date(Date.now() - 60000) }), "test"),
    ).rejects.toThrow("currently valid");
  });
  it("rejects a certificate paired with a different private key", async () => {
    await expect(loadP12(createTestP12("test", { mismatchKey: true }), "test")).rejects.toThrow(
      "do not match",
    );
  });
});
