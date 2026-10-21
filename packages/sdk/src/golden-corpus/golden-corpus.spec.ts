/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateDocumentXml } from "../xml/schema-validator.js";
import { GOLDEN_CORPUS } from "./index.js";

/**
 * Golden corpus: each entry's built XML must equal the committed bytes, and
 * those bytes must validate against the official XSD.
 *
 * **Regeneración deliberada.** The goldens are not edited by hand. When a
 * builder's output changes on purpose, regenerate them with
 *
 * ```sh
 * GOLDEN_CORPUS_UPDATE=1 pnpm --filter @dojocoding/hacienda-sdk test src/golden-corpus
 * ```
 *
 * and commit the diff: the golden bytes are the review artifact of a change
 * in the XML output. A silent difference between the built XML and the golden
 * is a regression, not a formatting nuisance.
 */
const UPDATE = process.env.GOLDEN_CORPUS_UPDATE === "1";

describe("A4 golden corpus", () => {
  for (const entry of GOLDEN_CORPUS as any[]) {
    it(`${entry.slug}: bytes match gold`, () => {
      const path = resolve(import.meta.dirname, `${entry.slug}.xml`);
      const actual = entry.build(entry.input);
      if (UPDATE) {
        writeFileSync(path, actual, "utf8");
        return;
      }
      const expected = readFileSync(path, "utf8");
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
