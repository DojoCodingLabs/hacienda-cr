/** Offline validation against the official Hacienda v4.4 XML schemas. */
import { checkXmlInput } from "./input-limits.js";
import { DOMParser } from "@xmldom/xmldom";
import { XMLValidator } from "fast-xml-parser";
import { validateXML } from "xmllint-wasm";
import { DOCUMENT_SCHEMAS, xmldsig } from "./schemas/index.js";

let activeValidations = 0;
const MAX_CONCURRENT_VALIDATIONS = 4;

export interface DocumentXmlValidationResult {
  valid: boolean;
  rootElement?: string;
  hasSignature: boolean;
  issues: string[];
}

/** Drafts may omit the signature; present signatures always undergo XSD validation.
 * This validates signature structure, not its cryptographic authenticity.
 */
export async function validateDocumentXml(
  xml: string,
  options: { requireSignature?: boolean } = {},
): Promise<DocumentXmlValidationResult> {
  const failure = (message: string): DocumentXmlValidationResult => ({
    valid: false,
    hasSignature: false,
    issues: [message],
  });
  const inputIssue = checkXmlInput(xml);
  if (inputIssue) return failure(inputIssue);
  const syntax = XMLValidator.validate(xml);
  if (syntax !== true) return failure(syntax.err.msg);
  if (activeValidations >= MAX_CONCURRENT_VALIDATIONS)
    return failure("XML validation is busy; retry after an active validation finishes.");
  activeValidations++;
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const root = doc.documentElement;
    if (!root) return failure("Missing document root element.");
    const rootElement = root.localName ?? root.nodeName;
    const source = Object.hasOwn(DOCUMENT_SCHEMAS, rootElement)
      ? DOCUMENT_SCHEMAS[rootElement]
      : undefined;
    if (!source) return failure(`Unknown document root element: ${rootElement}`);
    const hasSignature =
      doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature").length > 0;
    // Only relax the signature occurrence for unsigned drafts. All other XSD
    // constraints remain unchanged, and user schemaLocation is never fetched.
    const schema = source
      .replaceAll("../../xmldsig-core-schema.xsd", "xmldsig-core-schema.xsd")
      .replace(
        /<xs:element ref="ds:Signature"([^>]*)\/>/g,
        options.requireSignature || hasSignature
          ? "$&"
          : '<xs:element ref="ds:Signature" minOccurs="0"/>',
      );
    const result = await validateXML({
      xml: { fileName: "document.xml", contents: xml },
      schema: { fileName: "document.xsd", contents: schema },
      preload: [
        {
          fileName: "xmldsig-core-schema.xsd",
          contents: xmldsig.replace(/<!DOCTYPE[\s\S]*?\]>/, ""),
        },
      ],
      maxMemoryPages: 1024,
      modifyArguments: (args) => [...args, "--nonet"],
    });
    return {
      valid: result.valid,
      rootElement,
      hasSignature,
      issues: result.errors.map((issue) => issue.message),
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error));
  } finally {
    activeValidations--;
  }
}
