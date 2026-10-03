/** Limits applied before parsing untrusted XML. XSD workers retain a 64 MiB cap. */
export const MAX_XML_BYTES = 8 * 1024 * 1024;
export const MAX_XML_DEPTH = 128;
export function checkXmlInput(xml: string): string | undefined {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) return "XML exceeds the 8 MiB input limit.";
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return "DOCTYPE and entity declarations are not supported.";
  // Ignore markup inside comments, CDATA, and quoted attributes while counting element nesting.
  const tags =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/[^>]*>|<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  let depth = 0;
  let elements = 0;
  for (const match of xml.matchAll(tags)) {
    const tag = match[0];
    if (tag.startsWith("<?") || tag.startsWith("<!")) continue;
    if (!tag.startsWith("</") && ++elements > 100000)
      return "XML exceeds the 100,000-element limit.";
    if (tag.startsWith("</")) depth--;
    else if (!tag.endsWith("/>")) depth++;
    if (depth > MAX_XML_DEPTH) return "XML exceeds the 128-level nesting limit.";
  }
  return undefined;
}
