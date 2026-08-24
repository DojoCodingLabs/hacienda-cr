/**
 * XSD conformance test helper.
 *
 * Validates generated XML against the vendored official Hacienda v4.4 XSD
 * schemas (see packages/sdk/schemas/README.md) using the system `xmllint`
 * binary (libxml2). xmllint ships with macOS and is available on the CI
 * image via libxml2-utils; tests should call {@link xmllintAvailable} and
 * skip when the binary is missing so local runs never hard-fail on tooling.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMAS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../schemas/2024/v4.4",
);

/** Result of validating an XML document against an XSD. */
export interface XsdValidationResult {
  valid: boolean;
  /** xmllint stderr output when invalid (empty string when valid). */
  errors: string;
}

let xmllintChecked: boolean | undefined;

/** Whether the `xmllint` binary is available on this machine. */
export function xmllintAvailable(): boolean {
  if (xmllintChecked === undefined) {
    try {
      execFileSync("xmllint", ["--version"], { stdio: "ignore" });
      xmllintChecked = true;
    } catch {
      xmllintChecked = false;
    }
  }
  return xmllintChecked;
}

/** Options for {@link validateAgainstXsd}. */
export interface XsdValidationOptions {
  /**
   * The v4.4 XSDs require 1-5 ds:Signature elements, but builders emit
   * unsigned XML (signing happens in a separate step). When true, a
   * schema-valid placeholder signature is appended before validating so
   * everything else is checked strictly.
   */
  allowMissingSignature?: boolean;
}

/** Minimal ds:Signature accepted by the W3C xmldsig core schema. */
const PLACEHOLDER_SIGNATURE = [
  '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">',
  "<ds:SignedInfo>",
  '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
  '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>',
  '<ds:Reference URI="">',
  '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>',
  "<ds:DigestValue>AAAA</ds:DigestValue>",
  "</ds:Reference>",
  "</ds:SignedInfo>",
  "<ds:SignatureValue>AAAA</ds:SignatureValue>",
  "</ds:Signature>",
].join("");

/**
 * Validate an XML string against one of the vendored v4.4 XSD files.
 *
 * @param xml - The XML document to validate.
 * @param xsdFileName - Schema file name inside `schemas/2024/v4.4`,
 *   e.g. `"FacturaElectronica_V4.4.xsd"`.
 */
export function validateAgainstXsd(
  xml: string,
  xsdFileName: string,
  options: XsdValidationOptions = {},
): XsdValidationResult {
  const xsdPath = path.join(SCHEMAS_DIR, xsdFileName);
  const dir = mkdtempSync(path.join(tmpdir(), "hacienda-xsd-"));
  const xmlPath = path.join(dir, "doc.xml");

  let doc = xml;
  if (options.allowMissingSignature && !doc.includes("Signature")) {
    // Append the placeholder signature as the last child of the root element.
    doc = doc.replace(/<\/([A-Za-z]+)>\s*$/, `${PLACEHOLDER_SIGNATURE}</$1>`);
  }

  try {
    writeFileSync(xmlPath, doc, "utf8");
    execFileSync("xmllint", ["--noout", "--nonet", "--schema", xsdPath, xmlPath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    return { valid: true, errors: "" };
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr;
    return { valid: false, errors: stderr ? stderr.toString("utf8") : String(error) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
