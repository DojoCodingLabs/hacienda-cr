/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { GOLDEN_CORPUS } from "./index.js";

describe("A4 golden corpus", () => {
  for (const entry of GOLDEN_CORPUS as any[]) {
    it(`${entry.slug}: bytes match gold`, () => {
      const path = resolve(import.meta.dirname, `${entry.slug}.xml`);
      const expected = readFileSync(path, "utf8");
      const actual = entry.build(entry.input);
      expect(actual).toBe(expected);
    });

    it(`${entry.slug}: golden validates against XSD`, async () => {
      const path = resolve(import.meta.dirname, `${entry.slug}.xml`);
      const xml = readFileSync(path, "utf8");
      const res = await validateDocumentXml(xml);
      expect(res.valid).toBe(true);
    });
  }
});
