/**
 * Offline evidence-bundle helpers for `validate-sdk-sandbox.mjs`: run-input
 * loading, clave identity binding, `manifest.json` construction and the
 * `verify` checks. File-system only: no network, no SDK and no signing, so the
 * verifier can re-audit a run directory without credentials.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RESULT_CLASSES, classifySubmissionResult } from "./sandbox-outcome.mjs";

export const digest = (value) => createHash("sha256").update(value).digest("hex");

/** Writes JSON with owner-only permissions and exclusive creation. */
export const save = (directory, name, value) =>
  writeFile(join(directory, name), JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });

/**
 * Clave identity per family. `type` is the document-type segment of the
 * consecutive; `owner` is the taxpayer embedded in the clave. Every family is
 * owned by its issuer except FEC, which its buyer (the XML Receptor) generates
 * and signs. Accessors tolerate malformed input so `verify` can report instead
 * of throwing.
 */
const issuerId = (input) => input?.emisor?.identificacion?.numero;
const originalIssuerId = (input) => input?.original?.emisor?.identificacion?.numero;
export const FAMILY_IDENTITY = {
  FE: { type: "01", owner: issuerId },
  TE: { type: "04", owner: issuerId },
  NC: { type: "03", owner: originalIssuerId },
  NCP: { type: "03", owner: originalIssuerId },
  ND: { type: "02", owner: originalIssuerId },
  FEC: { type: "08", owner: (input) => input?.receptor?.identificacion?.numero },
};
export const familyIdentity = (family) =>
  Object.hasOwn(FAMILY_IDENTITY, family) ? FAMILY_IDENTITY[family] : undefined;

/** Source input files, in the order the runner reads them. */
export const INPUT_FILES = ["document.json", "invoice.json"];

/**
 * Reads the run input: `document.json` (multi-family) when present, otherwise
 * the legacy FE `invoice.json`. Throws `MISSING_FAMILY` for a document without
 * a family; propagates read/parse errors.
 */
export async function readRunInput(directory) {
  try {
    const serialized = await readFile(join(directory, "document.json"), "utf8");
    const doc = JSON.parse(serialized);
    const family = String(doc.family || doc.documentFamily || doc.type || "").toUpperCase();
    if (!family) throw new Error("MISSING_FAMILY");
    return {
      file: "document.json",
      serialized,
      family,
      input: doc.input !== undefined ? doc.input : doc,
      legacy: false,
    };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const serialized = await readFile(join(directory, "invoice.json"), "utf8");
  return {
    file: "invoice.json",
    serialized,
    family: "FE",
    input: JSON.parse(serialized),
    legacy: true,
  };
}

/** Identity facts for a run input; `type` is unset for the legacy FE path. */
export function identityFacts({ family, input, legacy }) {
  if (legacy) {
    return {
      clave: input?.clave,
      numeroConsecutivo: input?.numeroConsecutivo,
      owner: issuerId(input),
    };
  }
  const identity = familyIdentity(family);
  return {
    clave: input?.clave,
    numeroConsecutivo: input?.numeroConsecutivo,
    owner: identity?.owner(input),
    type: identity?.type,
    unknownFamily: !identity,
  };
}

/** True when the clave carries the owner, the consecutive and the document type. */
export function identityMatches({ clave, numeroConsecutivo, owner, type, unknownFamily }) {
  return (
    !unknownFamily &&
    typeof clave === "string" &&
    typeof numeroConsecutivo === "string" &&
    typeof owner === "string" &&
    clave.slice(9, 21) === owner.padStart(12, "0") &&
    clave.slice(21, 41) === numeroConsecutivo &&
    (type === undefined || numeroConsecutivo.slice(8, 10) === type)
  );
}

/** Binds the clave to its taxpayer, consecutive and document type (fail closed). */
export function assertIdentity(facts) {
  if (!identityMatches(facts)) throw new Error("IDENTITY_MISMATCH");
}

/** Manifest link → candidate files, first existing wins. */
export const MANIFEST_LINKS = [
  ["invoiceHash", INPUT_FILES],
  ["unsignedXmlHash", ["unsigned.xml"]],
  ["signedXmlHash", ["signed.xml", "validation-signed.xml"]],
  ["requestBodyHash", ["request.body.json"]],
  ["signatureHash", ["validation-signature.json"]],
];
const RESPONSE_LINK = ["responseBodyHash", ["response.raw.json"]];

/** Hashes the first existing candidate file for a manifest link. */
export async function hashFileIfPresent(directory, candidates) {
  for (const name of candidates) {
    try {
      return { hash: digest(await readFile(join(directory, name))), file: name };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

/** SHA-256 of base64decode(comprobanteXml) from the persisted request body. */
export async function recomputeComprobanteHash(directory) {
  try {
    const body = JSON.parse(await readFile(join(directory, "request.body.json"), "utf8"));
    if (typeof body?.comprobanteXml !== "string") return { error: "COMPROBANTE_MISSING" };
    return { hash: digest(Buffer.from(body.comprobanteXml, "base64")) };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    return { error: "REQUEST_BODY_UNREADABLE" };
  }
}

/**
 * Builds and persists `manifest.json`. The outcome class is derived by the
 * caller from observed artifacts, never declared by the operator. Hashes that
 * cannot be computed stay `null` with a reason in `missing`.
 */
export async function writeRunManifest({
  directory,
  clave,
  identityHash,
  family,
  outcomeClass,
  observation = {},
  missingReason,
}) {
  const links = {};
  const missing = [];
  for (const [field, candidates] of MANIFEST_LINKS) {
    const found = await hashFileIfPresent(directory, candidates);
    links[field] = found ? found.hash : null;
    if (!found) missing.push({ field, reason: missingReason });
  }
  const comprobante = await recomputeComprobanteHash(directory);
  links.comprobanteXmlHash = comprobante?.hash ?? null;
  if (!comprobante?.hash)
    missing.push({ field: "comprobanteXmlHash", reason: comprobante?.error ?? missingReason });
  const response = await hashFileIfPresent(directory, RESPONSE_LINK[1]);
  links.responseBodyHash = response ? response.hash : null;
  if (!response) missing.push({ field: "responseBodyHash", reason: "no receipt response body" });
  const manifest = {
    formatVersion: 1,
    environment: "sandbox",
    family,
    clave,
    identityHash,
    documentType: clave.slice(29, 31),
    links,
    missing,
    outcome: { class: outcomeClass, ...observation },
  };
  await save(directory, "manifest.json", manifest);
  return manifest;
}

/**
 * Re-audits a run directory offline. Returns one entry per check plus the
 * summary; exit code 0 VALID, 1 CORRUPT/MANIFEST_REQUIRED, 2 INCOMPLETE
 * (honest partial: every null hash is justified in `missing`).
 */
export async function verifyBundle(directory) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { manifestRequired: true, checks: [], exitCode: 1 };
  }
  const checks = [];
  const record = (check, ok, detail) => checks.push({ check, ok, ...(ok ? {} : { detail }) });
  if (manifest.formatVersion !== 1)
    record("formatVersion", false, `unsupported formatVersion ${String(manifest.formatVersion)}`);
  const missing = Array.isArray(manifest.missing) ? manifest.missing : null;
  if (missing === null) record("missing", false, "manifest.missing is not an array");
  const links =
    typeof manifest.links === "object" && manifest.links !== null ? manifest.links : null;
  if (links === null) record("links", false, "manifest.links is not an object");
  const outcome =
    typeof manifest.outcome === "object" && manifest.outcome !== null ? manifest.outcome : null;
  const knownOutcome = outcome !== null && RESULT_CLASSES.includes(outcome.class);
  if (!knownOutcome) record("outcome", false, "manifest.outcome.class is not a known result class");

  if (links !== null && missing !== null) {
    const nullLink = (field) => {
      const entry = missing.find((item) => item && item.field === field);
      record(
        field,
        !!entry,
        entry ? `missing: ${entry.reason}` : "null hash declared without a missing entry",
      );
    };
    for (const [field, candidates] of [...MANIFEST_LINKS, RESPONSE_LINK]) {
      const expected = links[field];
      if (expected === undefined) record(field, false, "hash not recorded in manifest");
      else if (expected === null) nullLink(field);
      else {
        const found = await hashFileIfPresent(directory, candidates);
        record(
          field,
          !!found && found.hash === expected,
          found ? "hash mismatch" : `no candidate file: ${candidates.join(" | ")}`,
        );
      }
    }
    // Chain: the decoded comprobanteXml must be the signed XML.
    const expectedComprobante = links.comprobanteXmlHash;
    if (expectedComprobante === undefined)
      record("comprobanteXmlHash", false, "hash not recorded in manifest");
    else if (expectedComprobante === null) nullLink("comprobanteXmlHash");
    else {
      const comprobante = await recomputeComprobanteHash(directory);
      const matches =
        comprobante?.hash === expectedComprobante && links.signedXmlHash === expectedComprobante;
      record(
        "comprobanteXmlHash",
        matches,
        comprobante === null
          ? "request.body.json absent"
          : (comprobante.error ?? "hash mismatch against request body or signed XML"),
      );
    }
    const missingProblems = missing
      .filter(
        (item) =>
          !item?.field ||
          links[item.field] !== null ||
          typeof item.reason !== "string" ||
          item.reason === "",
      )
      .map((item) => item?.field ?? "<no field>");
    record(
      "missing",
      missingProblems.length === 0,
      `entries not backed by a null link or without reason: ${missingProblems.join(", ")}`,
    );

    // Identity: clave segments against the run input, plus manifest identity fields.
    let run = null;
    try {
      run = await readRunInput(directory);
    } catch {
      record("identity", false, "document.json/invoice.json unreadable");
    }
    if (run) {
      const facts = identityFacts(run);
      const ok =
        typeof facts.clave === "string" &&
        manifest.clave === facts.clave &&
        facts.clave.slice(0, 3) === "506" &&
        identityMatches(facts) &&
        manifest.identityHash === digest(facts.clave) &&
        manifest.documentType === facts.clave.slice(29, 31) &&
        (manifest.family === undefined || manifest.family === run.family);
      record("identity", ok, "clave segments, family or identityHash mismatch");
    }

    // Outcome coherence: the derived class must match persisted evidence.
    let statusResult = null;
    try {
      statusResult = JSON.parse(await readFile(join(directory, "validation-result.json"), "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const persistedStatus = (statusResult?.result ?? statusResult)?.status ?? null;
    const observedClass = persistedStatus
      ? classifySubmissionResult({ status: persistedStatus })
      : null;
    const nonEmpty = (value) => typeof value === "string" && value !== "";
    let coherent;
    if (!knownOutcome) coherent = false;
    else if (outcome.class === "ACCEPTED") coherent = observedClass === "ACCEPTED";
    else if (outcome.class === "REJECTED")
      coherent = observedClass === "REJECTED" || nonEmpty(outcome.errorCause);
    else if (outcome.class === "PENDING")
      coherent =
        observedClass === "PENDING" || (observedClass === null && nonEmpty(outcome.requestId));
    else if (outcome.class === "TRANSPORT_BLOCKED")
      coherent = observedClass === null || observedClass === "TRANSPORT_BLOCKED";
    else coherent = observedClass === null; // INVALID_LOCAL
    record("outcomeCoherence", coherent, "outcome.class contradicts persisted artifacts");
  }
  const failing = checks.filter((item) => !item.ok).map((item) => item.check);
  const ok = failing.length === 0;
  const incomplete = ok && missing.length > 0;
  return {
    checks,
    summary: {
      ok,
      result: ok ? (incomplete ? "INCOMPLETE" : "VALID") : "CORRUPT",
      causedBy: failing[0] ?? null,
    },
    exitCode: ok ? (incomplete ? 2 : 0) : 1,
  };
}
