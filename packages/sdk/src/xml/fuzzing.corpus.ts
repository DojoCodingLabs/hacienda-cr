/**
 * Corpus de fuzzing estático para entradas XML hostiles (A6).
 *
 * Cada caso debe provocar un fallo tipado (`ValidationError` o `SigningError`)
 * en `validateDocumentXml`, `parseDocumentXml` y `signXml`, sin crashes ni
 * fugas de memoria. Se ejecuta en `pnpm verify` (vitest) y es reproducible.
 */
export interface FuzzCase {
  name: string;
  xml: string;
  /** Mensaje esperado (substring) en el primer issue o error. */
  expected: string;
}

export const FUZZ_CORPUS: FuzzCase[] = [
  {
    name: "XXE external entity",
    xml: '<!DOCTYPE root [<!ENTITY x SYSTEM "file:///etc/passwd">]><root>&x;</root>',
    expected: "DOCTYPE",
  },
  {
    name: "XXE network entity",
    xml: '<!DOCTYPE root [<!ENTITY x SYSTEM "http://127.0.0.1:1/secret">]><root>&x;</root>',
    expected: "DOCTYPE",
  },
  {
    name: "billion laughs",
    xml: '<!DOCTYPE root [<!ENTITY a "boom"><!ENTITY b "&a;&a;">]><root>&b;</root>',
    expected: "DOCTYPE",
  },
  {
    name: "deep nesting (129)",
    xml: "<a>".repeat(129) + "</a>".repeat(129),
    expected: "nesting",
  },
  {
    name: "element count over limit",
    xml: "<a>" + "<b/>".repeat(100000) + "</a>",
    expected: "element limit",
  },
  {
    name: "truncated XML",
    xml: "<root><child></root>",
    expected: "Malformed",
  },
  {
    name: "XInclude node",
    xml: '<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"><xi:include xmlns:xi="http://www.w3.org/2001/XInclude" href="file:///etc/passwd"/></FacturaElectronica>',
    expected: "Unknown",
  },
  {
    name: "CDATA with markup",
    xml: "<root><![CDATA[<script>alert(1)</script>]]></root>",
    expected: "Unknown",
  },
  {
    name: "quoted attribute with fake markup",
    xml: '<root x="' + "<".repeat(200) + '"><![CDATA[' + "<a>".repeat(200) + "]]></root>",
    expected: "nesting",
  },
  {
    name: "bad utf-8 (invalid sequence)",
    xml: "<root>\xff\xfe</root>",
    expected: "Malformed",
  },
  {
    name: "empty document",
    xml: "",
    expected: "input limit",
  },
  {
    name: "entity declaration only",
    xml: '<!ENTITY foo "bar"><root/>',
    expected: "DOCTYPE",
  },
];
