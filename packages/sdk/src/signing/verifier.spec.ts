import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { signXml } from "./signer.js";
import { verifyXmlSignature, verifySigningPolicy } from "./verifier.js";
import { XADES_POLICY_HASH } from "@dojocoding/hacienda-shared";

const XML = `<?xml version="1.0"?><FacturaElectronica><Clave>50601012300310123456700100001010000000001199999999</Clave></FacturaElectronica>`;
const PIN = "test1234";
let p12: Buffer;
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "verify-"));
  const k = join(dir, "k");
  const c = join(dir, "c");
  const p = join(dir, "p.p12");
  execSync(`openssl genrsa -out "${k}" 2048`, { stdio: "pipe" });
  execSync(
    `openssl req -new -x509 -key "${k}" -out "${c}" -days 365 -subj "/CN=Test/O=TestOrg/C=CR"`,
    { stdio: "pipe" },
  );
  try {
    execSync(
      `openssl pkcs12 -export -out "${p}" -inkey "${k}" -in "${c}" -passout pass:${PIN} -legacy`,
      { stdio: "pipe" },
    );
  } catch {
    execSync(`openssl pkcs12 -export -out "${p}" -inkey "${k}" -in "${c}" -passout pass:${PIN}`, {
      stdio: "pipe",
    });
  }
  p12 = readFileSync(p);
});

describe("verifyXmlSignature", () => {
  it("verifies a valid signature", async () => {
    if (!p12) return;
    const signed = await signXml(XML, p12, PIN);
    const res = await verifyXmlSignature(signed);
    expect(res.valid).toBe(true);
    expect(res.checks.signature).toBe(true);
    expect(res.checks.digest).toBe(true);
    expect(res.checks.policy).toBe(true);
  });

  it("rejects a tampered document", async () => {
    if (!p12) return;
    const signed = await signXml(XML, p12, PIN);
    const tampered = signed.replace("<Clave>", "<Clave>X");
    const res = await verifyXmlSignature(tampered);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /Digest/i.test(e))).toBe(true);
  });

  it("rejects a tampered policy", async () => {
    if (!p12) return;
    const signed = await signXml(XML, p12, PIN);
    const tampered = signed.replace(XADES_POLICY_HASH, "AAAA" + XADES_POLICY_HASH.slice(4));
    const res = await verifyXmlSignature(tampered);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /Policy/i.test(e))).toBe(true);
  });

  it("reports missing external tool gracefully", async () => {
    if (!p12) return;
    const signed = await signXml(XML, p12, PIN);
    const res = await verifyXmlSignature(signed, { externalVerifierBinary: "/nonexistent" });
    expect(res.external).not.toBe("passed");
  });

  it("verifySigningPolicy alias works", async () => {
    if (!p12) return;
    const signed = await signXml(XML, p12, PIN);
    const r = await verifySigningPolicy(signed);
    expect(r.valid).toBe(true);
  });
});
