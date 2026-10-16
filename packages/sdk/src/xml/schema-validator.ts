/** Offline validation against the official Hacienda v4.4 XML schemas. */
import { checkXmlInput } from "./input-limits.js";
import { DOMParser } from "@xmldom/xmldom";
import { XMLValidator } from "fast-xml-parser";
import { validateXML } from "xmllint-wasm";
import { DOCUMENT_SCHEMAS, xmldsig } from "./schemas/index.js";
import { validateDocumentIdentity, STANDARD_DOCUMENT_CODES } from "./document-identity.js";

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
    const identityIssues: string[] = [];
    const expectedType = STANDARD_DOCUMENT_CODES[rootElement];
    if (result.valid && expectedType) {
      const text = (name: string) =>
        root.getElementsByTagNameNS(root.namespaceURI, name).item(0)?.textContent ?? "";
      const partyId = (party: string) =>
        root
          .getElementsByTagNameNS(root.namespaceURI, party)
          .item(0)
          ?.getElementsByTagNameNS(root.namespaceURI, "Numero")
          .item(0)?.textContent ?? "";
      identityIssues.push(
        ...validateDocumentIdentity(
          {
            clave: text("Clave"),
            numeroConsecutivo: text("NumeroConsecutivo"),
            fechaEmision: text("FechaEmision"),
            emisor: { identificacion: { numero: partyId("Emisor") } },
            receptor: { identificacion: { numero: partyId("Receptor") } },
          },
          expectedType,
        ).map((issue) => `${issue.path}: ${issue.message}`),
      );
    }
    return {
      valid: result.valid && identityIssues.length === 0,
      rootElement,
      hasSignature,
      issues: [...result.errors.map((issue) => issue.message), ...identityIssues],
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error));
  } finally {
    activeValidations--;
  }
}
