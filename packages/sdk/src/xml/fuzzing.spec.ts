/** A6 — the hostile input corpus, exercised against every XML entry point. */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { FUZZ_CORPUS } from "./fuzzing.corpus.js";
import { validateDocumentXml } from "./schema-validator.js";
import { parseDocumentXml } from "../documents/parser.js";
import { signXml } from "../signing/signer.js";
import { checkXmlInput } from "./input-limits.js";

describe("A6 fuzzing corpus (static)", () => {
  for (const entry of FUZZ_CORPUS) {
    it(`validateDocumentXml rejects: ${entry.name}`, async () => {
      const result = await validateDocumentXml(entry.xml);
      expect(result.valid).toBe(false);
      expect(result.issues?.[0] ?? "").toContain(entry.expected);
    });

    it(`parseDocumentXml rejects: ${entry.name}`, () => {
      expect(() => parseDocumentXml(entry.xml)).toThrow();
    });

    it(`signXml rejects: ${entry.name}`, async () => {
      await expect(signXml(entry.xml, Buffer.alloc(0), "pin")).rejects.toThrow();
    });
  }

  it("the input limit runs before the expensive parse", async () => {
    for (const entry of FUZZ_CORPUS.filter((candidate) => candidate.bounded)) {
      const limit = checkXmlInput(entry.xml);
      expect(limit, entry.name).toBeTypeOf("string");
      // The validator reports the limit itself, so the cheap guard answered
      // before any schema work happened.
      const result = await validateDocumentXml(entry.xml);
      expect(result.issues?.[0] ?? "").toBe(limit);
    }
  });

  it("checkXmlInput rejects DOCTYPE/ENTITY", () => {
    expect(checkXmlInput('<!DOCTYPE a [<!ENTITY x "y">]><a/>')).toContain("DOCTYPE");
  });

  it("checkXmlInput does not throw on arbitrary input (dynamic fuzz)", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = checkXmlInput(input);
        return result === undefined || typeof result === "string";
      }),
      { numRuns: 1000 },
    );
  });
});
