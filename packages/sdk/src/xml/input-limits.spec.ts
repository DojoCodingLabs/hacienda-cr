import { describe, expect, it } from "vitest";
import { MAX_XML_BYTES, MAX_XML_DEPTH, checkXmlInput } from "./input-limits.js";

// Exact-boundary and tokenizer regressions for the pre-parse XML input limits.
// Each case pins one observable behaviour so that a mutated limit or regex
// alternative changes the result instead of only slowing the run down (the
// nightly mutation job previously relied on timeouts to "kill" these).

const nested = (depth: number, open = "<a>", close = "</a>") =>
  open.repeat(depth) + close.repeat(depth);

describe("checkXmlInput byte limit", () => {
  it("accepts a document of exactly MAX_XML_BYTES bytes", () => {
    const xml = "<a>" + "x".repeat(MAX_XML_BYTES - 7) + "</a>";
    expect(Buffer.byteLength(xml, "utf8")).toBe(MAX_XML_BYTES);
    expect(checkXmlInput(xml)).toBeUndefined();
  });

  it("rejects a document one byte over MAX_XML_BYTES", () => {
    const xml = "<a>" + "x".repeat(MAX_XML_BYTES - 6) + "</a>";
    expect(checkXmlInput(xml)).toBe("XML exceeds the 8 MiB input limit.");
  });
});

describe("checkXmlInput element limit", () => {
  it("accepts exactly 100,000 elements and does not count closing tags", () => {
    const xml = "<r>" + "<e></e>".repeat(99_999) + "</r>";
    expect(checkXmlInput(xml)).toBeUndefined();
  });

  it("rejects the 100,001st element", () => {
    const xml = "<r>" + "<e/>".repeat(100_000) + "</r>";
    expect(checkXmlInput(xml)).toBe("XML exceeds the 100,000-element limit.");
  });
});

describe("checkXmlInput nesting tokenizer", () => {
  const tooDeep = "XML exceeds the 128-level nesting limit.";

  it("accepts MAX_XML_DEPTH levels after a declaration, a comment and a PI", () => {
    const prolog = '<?xml version="1.0" encoding="utf-8"?><!-- prolog --><?pi data?>';
    expect(checkXmlInput(prolog + nested(MAX_XML_DEPTH))).toBeUndefined();
    expect(checkXmlInput(prolog + nested(MAX_XML_DEPTH + 1))).toBe(tooDeep);
  });

  it("treats multi-character closing tags as closing tags", () => {
    const xml = "<root>" + "<item></item>".repeat(MAX_XML_DEPTH * 2) + "</root>";
    expect(checkXmlInput(xml)).toBeUndefined();
  });

  it("closes a level on an end tag with a stray quote instead of leaking depth", () => {
    // The dedicated end-tag alternative runs to the first '>' whatever it
    // contains; the generic start-tag alternative cannot match an unbalanced
    // quote, so without it the level would never be released.
    for (const close of ["</a'>", '</a">']) {
      expect(checkXmlInput("<a>" + close + nested(MAX_XML_DEPTH))).toBeUndefined();
    }
  });

  const hidden = " <x>".repeat(MAX_XML_DEPTH * 2) + " ";
  it.each([
    ["comment", `<!--${hidden}-->`],
    ["CDATA section", `<![CDATA[${hidden}]]>`],
    ["processing instruction", `<?pi${hidden}?>`],
  ])("ignores markup inside a %s with whitespace and text", (_kind, block) => {
    expect(checkXmlInput(`<r>${block}</r>`)).toBeUndefined();
  });

  it.each([
    ["double", '<a b="x > y">'],
    ["single", "<a b='x > y'>"],
  ])("counts start tags whose %s-quoted attribute contains '>'", (_kind, open) => {
    expect(checkXmlInput(nested(MAX_XML_DEPTH, open))).toBeUndefined();
    expect(checkXmlInput(nested(MAX_XML_DEPTH + 1, open))).toBe(tooDeep);
  });
});
