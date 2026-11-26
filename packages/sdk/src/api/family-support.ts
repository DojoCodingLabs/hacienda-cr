/**
 * Document-family support matrix and the submission gate.
 *
 * The matrix records, per family, what this SDK can build, validate, sign and
 * submit, and which real Hacienda evidence exists. It is the single source for
 * `docs/support-matrix.md`, the CLI `support` output and the MCP
 * `hacienda://reference/family-support` resource.
 *
 * {@link assertSubmittableDocument} refuses REP and MensajeReceptor documents
 * with an {@link UnsupportedDocumentFamilyError} before signing or POST. Their
 * XML builders stay available; only submission is refused.
 *
 * @module api/family-support
 */

import { UnsupportedDocumentFamilyError } from "../errors.js";

/** Short labels for the electronic document families. */
export type DocumentFamily = "FE" | "TE" | "NC" | "ND" | "FEC" | "FEE" | "REP" | "MR";

/**
 * Submission status of a family.
 *
 * - `allowed`: the SDK submits it and a real sandbox acceptance is recorded.
 * - `unverified`: the SDK submits it, but no real Hacienda acceptance is
 *   recorded (and, for FEC, the POST party mapping is an open question).
 * - `refused`: the SDK throws {@link UnsupportedDocumentFamilyError}.
 */
export type FamilySubmitStatus = "allowed" | "unverified" | "refused";

/** One row of the support matrix. */
export interface FamilySupport {
  readonly family: DocumentFamily;
  /** Spanish document name. */
  readonly name: string;
  /** Document type codes (clave/consecutive segment). */
  readonly documentTypes: readonly string[];
  /** XML root element. */
  readonly rootElement: string;
  readonly build: {
    /** Legacy Number-based builder (`build*Xml`). */
    readonly legacyNumber: boolean;
    /** Decimal-text builder (`buildDecimal*Xml`). */
    readonly decimalText: boolean;
    /** Exact named-case builders; empty when none exists. */
    readonly exact: readonly string[];
  };
  /** Builder output is checked against the vendored official XSD (native xmllint). */
  readonly xsdConformance: boolean;
  /** Family-specific synthetic signing tests exist (the signer itself is generic XAdES-EPES). */
  readonly signingTested: boolean;
  readonly submit: FamilySubmitStatus;
  /** Real sandbox evidence, or `null` when none is recorded. */
  readonly sandboxEvidence: string | null;
  /** Real production evidence, or `null` when none is recorded. */
  readonly productionEvidence: string | null;
  /** Why submission is refused or unverified. */
  readonly note?: string;
  /** Documentation for this row. */
  readonly docsUrl: string;
}

const DOCS_BASE = "https://github.com/DojoCodingLabs/hacienda-cr/blob/main/docs";
/** Support matrix document. */
export const SUPPORT_MATRIX_URL = `${DOCS_BASE}/support-matrix.md`;
const REP_DOCS = `${DOCS_BASE}/rep-monetary-oracle-research.md`;
const MR_DOCS = `${DOCS_BASE}/mr-transport-correlation-research.md`;

const REP_REASON =
  "the exact monetary projection of a real partial payment into the reduced REP line and summary is unresolved; no official worked REP 10 example or written clarification exists.";
const MR_REASON =
  "POST /recepcion requires consecutivoReceptor for a confirmation message, SubmissionRequest does not carry it, and there is no receiver-specific outcome oracle to correlate the result with this message.";
const FEC_NOTE =
  "Submittable but unverified: Hacienda's API documentation does not say whether the POST emisor must be the XML Emisor (supplier) or the buyer that issues and signs the FEC and owns the clave. See the open question in the support matrix.";

const SANDBOX_FE_TE =
  "Accepted (terminal aceptado) in the Hacienda sandbox with SDK 0.12.1; see docs/testing/sandbox-403-debug.md.";

const FAMILY_SUPPORT: readonly FamilySupport[] = Object.freeze(
  (
    [
      {
        family: "FE",
        name: "Factura Electrónica",
        documentTypes: ["01"],
        rootElement: "FacturaElectronica",
        build: {
          legacyNumber: true,
          decimalText: true,
          exact: ["buildExactFacturaXml", "buildExactFacturaReplacementXml"],
        },
        xsdConformance: true,
        signingTested: true,
        submit: "allowed",
        sandboxEvidence: SANDBOX_FE_TE,
        productionEvidence: null,
        docsUrl: SUPPORT_MATRIX_URL,
      },
      {
        family: "TE",
        name: "Tiquete Electrónico",
        documentTypes: ["04"],
        rootElement: "TiqueteElectronico",
        build: { legacyNumber: true, decimalText: true, exact: ["buildExactTiqueteXml"] },
        xsdConformance: true,
        signingTested: true,
        submit: "allowed",
        sandboxEvidence: SANDBOX_FE_TE,
        productionEvidence: null,
        docsUrl: SUPPORT_MATRIX_URL,
      },
      {
        family: "NC",
        name: "Nota de Crédito Electrónica",
        documentTypes: ["03"],
        rootElement: "NotaCreditoElectronica",
        build: {
          legacyNumber: true,
          decimalText: true,
          exact: ["buildExactNotaCreditoTotalXml", "buildExactNotaCreditoPartialXml"],
        },
        xsdConformance: true,
        signingTested: true,
        submit: "unverified",
        sandboxEvidence: null,
        productionEvidence: null,
        note: "No real Hacienda acceptance is recorded yet (roadmap P0-6).",
        docsUrl: SUPPORT_MATRIX_URL,
      },
      {
        family: "ND",
        name: "Nota de Débito Electrónica",
        documentTypes: ["02"],
        rootElement: "NotaDebitoElectronica",
        build: { legacyNumber: true, decimalText: true, exact: ["buildExactNotaDebitoXml"] },
        xsdConformance: true,
        signingTested: true,
        submit: "unverified",
        sandboxEvidence: null,
        productionEvidence: null,
        note: "No real Hacienda acceptance is recorded yet (roadmap P0-6).",
        docsUrl: SUPPORT_MATRIX_URL,
      },
      {
        family: "FEC",
        name: "Factura Electrónica de Compra",
        documentTypes: ["08"],
        rootElement: "FacturaElectronicaCompra",
        build: {
          legacyNumber: true,
          decimalText: true,
          exact: [
            "buildExactFacturaCompraXml",
            "buildExactFacturaCompraForeignServiceIva13Xml",
            "buildExactFacturaCompraUsedPersonalGoodsNonSubjectXml",
          ],
        },
        xsdConformance: true,
        signingTested: true,
        submit: "unverified",
        sandboxEvidence: null,
        productionEvidence: null,
        note: FEC_NOTE,
        docsUrl: `${SUPPORT_MATRIX_URL}#fec-post-party-mapping-open-question`,
      },
      {
        family: "FEE",
        name: "Factura Electrónica de Exportación",
        documentTypes: ["09"],
        rootElement: "FacturaElectronicaExportacion",
        build: { legacyNumber: true, decimalText: true, exact: [] },
        xsdConformance: true,
        signingTested: false,
        submit: "unverified",
        sandboxEvidence: null,
        productionEvidence: null,
        note: "No exact builder and no real Hacienda acceptance is recorded.",
        docsUrl: SUPPORT_MATRIX_URL,
      },
      {
        family: "REP",
        name: "Recibo Electrónico de Pago",
        documentTypes: ["10"],
        rootElement: "ReciboElectronicoPago",
        build: { legacyNumber: true, decimalText: true, exact: [] },
        xsdConformance: true,
        signingTested: false,
        submit: "refused",
        sandboxEvidence: null,
        productionEvidence: null,
        note: `Builders are non-submittable: ${REP_REASON}`,
        docsUrl: REP_DOCS,
      },
      {
        family: "MR",
        name: "Mensaje Receptor",
        documentTypes: ["05", "06", "07"],
        rootElement: "MensajeReceptor",
        build: { legacyNumber: true, decimalText: true, exact: ["buildExactMensajeReceptorXml"] },
        xsdConformance: true,
        signingTested: true,
        submit: "refused",
        sandboxEvidence: null,
        productionEvidence: null,
        note: `Builders are non-submittable: ${MR_REASON}`,
        docsUrl: MR_DOCS,
      },
    ] satisfies FamilySupport[]
  ).map((row) =>
    Object.freeze({
      ...row,
      documentTypes: Object.freeze([...row.documentTypes]),
      build: Object.freeze({ ...row.build, exact: Object.freeze([...row.build.exact]) }),
    }),
  ),
);

/** Returns the read-only document-family support matrix. */
export function getFamilySupport(): readonly FamilySupport[] {
  return FAMILY_SUPPORT;
}

const BY_ROOT = new Map(FAMILY_SUPPORT.map((row) => [row.rootElement, row.family]));
const BY_TYPE = new Map(
  FAMILY_SUPPORT.flatMap((row) => row.documentTypes.map((code) => [code, row.family] as const)),
);

/** Maps a two-digit document type code to its family. */
export function familyFromDocumentType(code: string): DocumentFamily | undefined {
  return BY_TYPE.get(code);
}

/**
 * Returns the family of an XML document from its root element, skipping the
 * BOM, XML declaration, processing instructions, comments and DOCTYPE.
 * Returns `undefined` when the root is not a known Hacienda document.
 */
export function detectDocumentFamily(xml: string): DocumentFamily | undefined {
  let i = xml.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (;;) {
    while (i < xml.length && /\s/.test(xml[i] ?? "")) i++;
    let end = -1;
    if (xml.startsWith("<?", i)) end = xml.indexOf("?>", i + 2) + 2;
    else if (xml.startsWith("<!--", i)) end = xml.indexOf("-->", i + 4) + 3;
    else if (xml.startsWith("<!", i)) end = xml.indexOf(">", i + 2) + 1;
    else break;
    if (end <= 0) return undefined;
    i = end;
  }
  const match = /^<(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)/.exec(xml.slice(i, i + 256));
  return match?.[1] ? BY_ROOT.get(match[1]) : undefined;
}

/** Facts used to classify a document before signing or submission. */
export interface SubmittableDocumentFacts {
  /** 50-character clave; its document type segment is checked. */
  readonly clave?: string;
  /** Unsigned or signed XML text; its root element is checked. */
  readonly xml?: string;
  /** Present only for confirmation messages (MensajeReceptor). */
  readonly consecutivoReceptor?: unknown;
}

function refuse(family: "REP" | "MR"): never {
  if (family === "REP") throw new UnsupportedDocumentFamilyError("REP", REP_REASON, REP_DOCS);
  throw new UnsupportedDocumentFamilyError("MR", MR_REASON, MR_DOCS);
}

/**
 * Throws {@link UnsupportedDocumentFamilyError} when the document is a REP or
 * a MensajeReceptor: a `ReciboElectronicoPago` or `MensajeReceptor` XML root,
 * a `consecutivoReceptor`, or (only when the root is not a known Hacienda
 * document) a clave document type of 10 or 05–07. Call it before signing; the
 * SDK submit path calls it again before persistence or any network access.
 *
 * Documents whose family cannot be identified are not refused here; XSD and
 * identity validation remain the caller's responsibility.
 */
export function assertSubmittableDocument(facts: SubmittableDocumentFacts): void {
  if (facts.consecutivoReceptor !== undefined) refuse("MR");
  const family = submissionFamily(facts);
  if (family === "MR" || family === "REP") refuse(family);
}

/**
 * The XML root element decides the family when it is a known Hacienda document
 * (an MR carries the original document's clave, so its clave says nothing about
 * the message). Without a recognisable root, the clave document type decides.
 */
function submissionFamily(facts: SubmittableDocumentFacts): DocumentFamily | undefined {
  const fromRoot = typeof facts.xml === "string" ? detectDocumentFamily(facts.xml) : undefined;
  if (fromRoot) return fromRoot;
  return typeof facts.clave === "string" && facts.clave.length === 50
    ? familyFromDocumentType(facts.clave.slice(29, 31))
    : undefined;
}

/**
 * Gate for a POST /recepcion payload: decodes `comprobanteXml` (Base64) and
 * applies {@link assertSubmittableDocument}.
 */
export function assertSubmittableRequest(request: {
  readonly clave?: unknown;
  readonly comprobanteXml?: unknown;
  readonly consecutivoReceptor?: unknown;
}): void {
  const xml =
    typeof request.comprobanteXml === "string"
      ? Buffer.from(request.comprobanteXml, "base64").toString("utf8")
      : undefined;
  assertSubmittableDocument({
    clave: typeof request.clave === "string" ? request.clave : undefined,
    xml,
    consecutivoReceptor: request.consecutivoReceptor,
  });
}
