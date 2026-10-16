import { describe, it, expect } from "vitest";
import { FUZZ_CORPUS } from "./fuzzing.corpus.js";
import { validateDocumentXml } from "./schema-validator.js";
import { signXml } from "../signing/signer.js";
import { checkXmlInput } from "./input-limits.js";
import fc from "fast-check";

describe("A6 fuzzing corpus (static)", () => {
  for (const c of FUZZ_CORPUS) {
    it(`validateDocumentXml rejects: ${c.name}`, async () => {
      const res = await validateDocumentXml(c.xml);
      expect(res.valid).toBe(false);
    });

    it(`signXml rejects: ${c.name}`, async () => {
      await expect(signXml(c.xml, Buffer.alloc(0), "pin")).rejects.toThrow();
    });
  }

  it("checkXmlInput rejects DOCTYPE/ENTITY", () => {
    expect(checkXmlInput('<!DOCTYPE a [<!ENTITY x "y">]><a/>')).toContain("DOCTYPE");
  });
  it("checkXmlInput no lanza con entrada arbitraria (fuzz dinámico)", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const r = checkXmlInput(input);
        return r === undefined || typeof r === "string";
      }),
      { numRuns: 1000 },
    );
  });
});
