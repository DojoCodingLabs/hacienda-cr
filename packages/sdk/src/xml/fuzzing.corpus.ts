/**
 * Static fuzzing corpus for hostile XML inputs (A6).
 *
 * Each case must fail with a **typed** error — never a crash, never a
 * hang, never a secret in the message — in the document validator, the
 * document parser and the signer. The expectations are the ones of the tree
 * this corpus guards: the wording of the input limits and of the XML
 * validation is asserted, so a change in those messages is a deliberate
 * change and not a silent drift.
 */
export interface FuzzCase {
  /** What the case attacks. */
  name: string;
  /** The hostile input. */
  xml: string;
  /** Substring expected in the first issue or error. */
  expected: string;
  /**
   * Whether the input limit must reject it *before* any parsing. Those cases
   * prove the cheap guard runs first; the rest are rejected further down.
   */
  bounded: boolean;
}

export const FUZZ_CORPUS: FuzzCase[] = [
  {
    name: "XXE external entity",
    xml: '<!DOCTYPE root [<!ENTITY x SYSTEM "file:///etc/passwd">]><root>&x;</root>',
    expected: "DOCTYPE and entity declarations are not supported.",
    bounded: true,
  },
  {
    name: "XXE network entity",
    xml: '<!DOCTYPE root [<!ENTITY x SYSTEM "http://127.0.0.1:1/secret">]><root>&x;</root>',
    expected: "DOCTYPE and entity declarations are not supported.",
    bounded: true,
  },
  {
    name: "billion laughs",
    xml: '<!DOCTYPE root [<!ENTITY a "boom"><!ENTITY b "&a;&a;">]><root>&b;</root>',
    expected: "DOCTYPE and entity declarations are not supported.",
    bounded: true,
  },
  {
    name: "entity declaration only",
    xml: '<!ENTITY foo "bar"><root/>',
    expected: "DOCTYPE and entity declarations are not supported.",
    bounded: true,
  },
  {
    name: "deep nesting (129)",
    xml: "<a>".repeat(129) + "</a>".repeat(129),
    expected: "XML exceeds the 128-level nesting limit.",
    bounded: true,
  },
  {
    name: "element count over limit",
    xml: "<a>" + "<b/>".repeat(100000) + "</a>",
    expected: "XML exceeds the 100,000-element limit.",
    bounded: true,
  },
  {
    name: "truncated XML",
    xml: "<root><child></root>",
    expected: "Expected closing tag",
    bounded: false,
  },
  {
    name: "empty document",
    xml: "",
    expected: "Start tag expected.",
    bounded: false,
  },
  {
    name: "bad utf-8 (invalid sequence)",
    xml: "<root>\xff\xfe</root>",
    expected: "Unknown document root element",
    bounded: false,
  },
  {
    name: "XInclude node",
    xml: '<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"><xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="file:///etc/passwd"/></FacturaElectronica>',
    expected: "This element is not expected",
    bounded: false,
  },
  {
    name: "strange namespace",
    xml: '<FacturaElectronica xmlns="https://example.invalid/not-hacienda"><Clave>1</Clave></FacturaElectronica>',
    expected: "Schemas validity error",
    bounded: false,
  },
  {
    name: "CDATA with markup",
    xml: "<root><![CDATA[<script>alert(1)</script>]]></root>",
    expected: "Unknown document root element",
    bounded: false,
  },
  {
    name: "quoted attribute with fake markup",
    xml: '<root x="' + "<".repeat(200) + '"><![CDATA[' + "<a>".repeat(200) + "]]></root>",
    expected: "Unescaped '<' not allowed in attributes values",
    bounded: false,
  },
];
