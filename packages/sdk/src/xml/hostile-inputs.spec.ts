/** A6 — a secret embedded in a hostile payload must not reach an error, a log or stderr. */
import { describe, expect, it } from "vitest";
import { validateDocumentXml } from "./schema-validator.js";
import { parseDocumentXml } from "../documents/parser.js";
import { signXml } from "../signing/signer.js";
import { checkXmlInput } from "./input-limits.js";

/**
 * Run `body` capturing everything that reaches the standard error: the
 * `console.error` calls and the writes to `process.stderr`.
 */
async function captureStderr(body: () => Promise<void> | void): Promise<string> {
  const chunks: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);
  const originalError = console.error;
  console.error = (...args: unknown[]): void => {
    chunks.push(args.map((value) => String(value)).join(" "));
  };
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stderr.write;
  try {
    await body();
  } finally {
    console.error = originalError;
    process.stderr.write = originalWrite;
  }
  return chunks.join("\n");
}

describe("A6 secret redaction in error paths", () => {
  it("does not leak a secret in the document validator", async () => {
    const secret = "super-secret-token-123";
    const xml = `<root secret="${secret}"><!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]></root>`;
    const stderr = await captureStderr(async () => {
      const result = await validateDocumentXml(xml);
      expect(result.valid).toBe(false);
      expect(JSON.stringify(result)).not.toContain(secret);
    });
    expect(stderr).not.toContain(secret);
  });

  it("does not leak a secret in the document parser", async () => {
    const secret = "parser-secret-321";
    const xml = `<root secret="${secret}"><child></root>`;
    const stderr = await captureStderr(() => {
      expect(() => parseDocumentXml(xml)).toThrow();
    });
    expect(stderr).not.toContain(secret);
  });

  it("does not leak a secret in checkXmlInput", () => {
    const secret = "another-secret-456";
    const xml = "<a>" + secret + "</a>";
    const stderr = captureStderr(() => {
      const result = checkXmlInput(xml);
      if (result) expect(result).not.toContain(secret);
    });
    return expect(stderr).not.toContain(secret);
  });

  it("does not leak the pin in the signer", async () => {
    const pin = "pin-secret-789";
    const stderr = await captureStderr(async () => {
      await expect(signXml("<root/>", Buffer.from("bad"), pin)).rejects.toThrow();
      try {
        await signXml("<root/>", Buffer.from("bad"), pin);
      } catch (error) {
        expect(String(error)).not.toContain(pin);
      }
    });
    expect(stderr).not.toContain(pin);
  });
});
