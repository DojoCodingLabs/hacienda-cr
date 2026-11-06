/** Explicit manual runner: never selected by pnpm test; sandbox endpoints only. */
import { readFile, writeFile, access, realpath } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  Environment,
  getEnvironmentConfig,
  TokenManager,
  HttpClient,
  loadCredentials,
  validateFacturaInput,
  buildFacturaXml,
  validateDocumentXml,
  signXml,
  submitAndWait,
  getStatus,
} from "../packages/sdk/dist/index.js";
import {
  RESULT_CLASSES,
  classifySubmissionResult,
  classifyDeliveryError,
  containsFiscalMarkers,
  isDeliveryError,
} from "./sandbox-outcome.mjs";

const [command, runPath, ...extra] = process.argv.slice(2);
const environment = getEnvironmentConfig(Environment.Sandbox);
const repository = resolve(fileURLToPath(new URL("..", import.meta.url)));
let activeDirectory;
let traceSequence = 0;
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
};
const digest = (value) => createHash("sha256").update(value).digest("hex");
const save = (directory, name, value) =>
  writeFile(join(directory, name), JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
const report = (value) => console.log(JSON.stringify(value));

/** Run-directory state: set per invocation once `invoice.json` parses; used by
 * the failure path to persist a partial evidence manifest (design 3.1b). */
let runState;
/** Set once a manifest is persisted, so the failure path never overwrites it. */
let manifestWritten = false;
/** Evidence captured by `sdkFetch` for the delivery path of the current run. */
const captured = {
  requestBodyHash: null,
  comprobanteXmlHash: null,
  lastReceiptBody: null,
  lastErrorCause: null,
  lastErrorType: null,
  lastRequestId: null,
  lastCfRay: null,
  lastHttpStatus: null,
  deliveryConfirmed: false,
};

function requireSandbox() {
  if (process.env.HACIENDA_SANDBOX_TEST !== "1") throw new Error("OPT_IN_REQUIRED");
  if (!required("HACIENDA_USERNAME").endsWith("@stag.comprobanteselectronicos.go.cr")) {
    throw new Error("SANDBOX_USERNAME_REQUIRED");
  }
  required("HACIENDA_PASSWORD");
  if (
    environment.apiBaseUrl !== "https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1" ||
    environment.idpTokenUrl !==
      "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token" ||
    environment.clientId !== "api-stag"
  )
    throw new Error("SANDBOX_ENDPOINT_MISMATCH");
}

const sdkFetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const token = url.href === environment.idpTokenUrl;
  const receipt =
    url.origin === "https://api-sandbox.comprobanteselectronicos.go.cr" &&
    /^\/recepcion\/v1\/recepcion(?:\/\d{50})?$/.test(url.pathname) &&
    !url.search &&
    !url.hash;
  if ((!token && !receipt) || url.username || url.password) throw new Error("BLOCKED_ENDPOINT");
  const method = init?.method ?? "GET";
  if ((token && method !== "POST") || (receipt && !["GET", "POST"].includes(method))) {
    throw new Error("BLOCKED_METHOD");
  }
  // Persist the EXACT bytes the SDK will transmit (JSON.stringify output from
  // http-client.ts) before the POST travels. Receipt POSTs only; the token
  // endpoint and status GETs have no submission body to bind.
  if (receipt && method === "POST" && typeof init?.body === "string" && activeDirectory) {
    let parsed;
    try {
      parsed = JSON.parse(init.body);
    } catch {
      throw new Error("POST_BODY_NOT_JSON");
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.comprobanteXml !== "string"
    ) {
      throw new Error("POST_BODY_NOT_SUBMISSION");
    }
    captured.requestBodyHash = digest(init.body);
    captured.comprobanteXmlHash = digest(Buffer.from(parsed.comprobanteXml, "base64"));
    await writeFile(join(activeDirectory, "request.body.json"), init.body, {
      mode: 0o600,
      flag: "wx",
    });
    await writeFile(
      join(activeDirectory, "request.pretty.json"),
      JSON.stringify(parsed, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
  }
  // Credentials must never be forwarded through an HTTP redirect.
  const response = await fetch(input, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (activeDirectory) {
    const headers = Object.fromEntries(
      [
        "content-type",
        "server",
        "location",
        "x-error-cause",
        "date",
        "x-amzn-errortype",
        "x-amzn-requestid",
        "x-amz-apigw-id",
        "cf-ray",
        "via",
      ].map((k) => [k, response.headers.get(k)]),
    );
    if (receipt) {
      captured.lastHttpStatus = response.status;
      captured.lastErrorCause = headers["x-error-cause"];
      captured.lastErrorType = headers["x-amzn-errortype"];
      captured.lastRequestId = headers["x-amzn-requestid"];
      captured.lastCfRay = headers["cf-ray"];
      // Delivery is confirmed only by an accepted receipt POST; a 4xx from the
      // gateway (e.g. 403 IncompleteSignatureException) never reached Hacienda.
      if (method === "POST" && response.status >= 200 && response.status < 400) {
        captured.deliveryConfirmed = true;
      }
      // Never persist OAuth responses, access tokens or request authorization.
      captured.lastReceiptBody = await response.clone().text();
    }
    await save(activeDirectory, `validation-http-${Date.now()}-${++traceSequence}.json`, {
      phase: token ? "authentication" : "receipt",
      method,
      status: response.status,
      headers,
      ...(receipt ? { body: captured.lastReceiptBody } : {}),
    });
  }
  return response;
};

async function authenticatedClient() {
  requireSandbox();
  const tokenManager = new TokenManager({ envConfig: environment, fetchFn: sdkFetch });
  await tokenManager.authenticate(
    loadCredentials({
      username: required("HACIENDA_USERNAME"),
      password: required("HACIENDA_PASSWORD"),
    }),
  );
  return new HttpClient({
    envConfig: environment,
    tokenManager,
    fetchFn: sdkFetch,
    retryOptions: { maxRetries: 0 },
  });
}

async function invoiceRun() {
  if (!runPath) throw new Error("RUN_DIRECTORY_REQUIRED");
  const directory = await realpath(resolve(runPath));
  const local = relative(repository, directory);
  if (!local.startsWith("..") && local !== "..")
    throw new Error("ARTIFACTS_MUST_BE_OUTSIDE_REPOSITORY");
  activeDirectory = directory;
  const serialized = await readFile(join(directory, "invoice.json"), "utf8");
  const invoice = JSON.parse(serialized);
  const result = validateFacturaInput(invoice);
  if (!result.valid) throw new Error("INVALID_INVOICE_INPUT");
  if (
    invoice.clave.slice(9, 21) !== invoice.emisor.identificacion.numero.padStart(12, "0") ||
    invoice.clave.slice(21, 41) !== invoice.numeroConsecutivo
  )
    throw new Error("IDENTITY_MISMATCH");
  const xml = buildFacturaXml(invoice);
  if (!(await validateDocumentXml(xml)).valid) throw new Error("INVALID_UNSIGNED_XSD");
  return { directory, invoice, xml, invoiceHash: digest(serialized) };
}

/** Hashes the first existing candidate file for a manifest link. */
async function hashFileIfPresent(directory, candidates) {
  for (const name of candidates) {
    try {
      const content = await readFile(join(directory, name));
      return { hash: digest(content), file: name };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

/** Shadow of buildManifest: recomputes SHA-256(base64decode(comprobanteXml))
 * from the persisted request body on disk. */
async function recomputeComprobanteHash(directory) {
  try {
    const body = JSON.parse(await readFile(join(directory, "request.body.json"), "utf8"));
    if (typeof body?.comprobanteXml !== "string") return { error: "COMPROBANTE_MISSING" };
    return { hash: digest(Buffer.from(body.comprobanteXml, "base64")) };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    return { error: "REQUEST_BODY_UNREADABLE" };
  }
}

/** Persist `response.raw.json` (raw receipt body) when it exists in memory. */
async function persistRawResponse(directory) {
  if (!captured.lastReceiptBody) return false;
  try {
    await writeFile(join(directory, "response.raw.json"), captured.lastReceiptBody, {
      mode: 0o600,
      flag: "wx",
    });
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return false;
  }
}

const outcomeObservation = () => ({
  ...(Number.isInteger(captured.lastHttpStatus) ? { httpStatus: captured.lastHttpStatus } : {}),
  ...(captured.lastErrorType ? { gatewayErrorType: captured.lastErrorType } : {}),
  ...(captured.lastRequestId ? { requestId: captured.lastRequestId } : {}),
  ...(captured.lastCfRay ? { cfRay: captured.lastCfRay } : {}),
  ...(captured.lastErrorCause ? { errorCause: captured.lastErrorCause } : {}),
  observedAt: new Date().toISOString(),
});

/** Builds and persists `manifest.json` for the current run directory. `class`
 * is derived by the caller (design D3) never declared by the operator. */
async function writeRunManifest(outcomeClass, missingReason) {
  const { directory, invoice, identityHash } = runState;
  const links = {};
  const missing = [];
  const fields = {
    invoiceHash: ["invoice.json"],
    unsignedXmlHash: ["unsigned.xml"],
    signedXmlHash: ["signed.xml", "validation-signed.xml"],
    requestBodyHash: ["request.body.json"],
    signatureHash: ["validation-signature.json"],
  };
  for (const [field, candidates] of Object.entries(fields)) {
    const found = await hashFileIfPresent(directory, candidates);
    if (found) links[field] = found.hash;
    else {
      links[field] = null;
      missing.push({ field, reason: missingReason });
    }
  }
  const comprobante = await recomputeComprobanteHash(directory);
  if (comprobante?.hash) links.comprobanteXmlHash = comprobante.hash;
  else {
    links.comprobanteXmlHash = null;
    missing.push({ field: "comprobanteXmlHash", reason: comprobante?.error ?? missingReason });
  }
  const rawResponsePersisted = await persistRawResponse(directory);
  if (rawResponsePersisted) links.responseBodyHash = digest(captured.lastReceiptBody);
  else {
    links.responseBodyHash = null;
    missing.push({ field: "responseBodyHash", reason: "sin respuesta del receipt" });
  }
  const manifest = {
    formatVersion: 1,
    environment: "sandbox",
    clave: invoice.clave,
    identityHash,
    documentType: invoice.clave.slice(0, 3),
    links,
    missing,
    outcome: { class: outcomeClass, ...outcomeObservation() },
  };
  await save(directory, "manifest.json", manifest);
  return manifest;
}

function classifyFailure(error) {
  if (!isDeliveryError(error)) return "INVALID_LOCAL";
  return classifyDeliveryError({
    responseFiscal:
      containsFiscalMarkers(error?.responseBody) || containsFiscalMarkers(captured.lastReceiptBody),
    errorCauseHeader: captured.lastErrorCause,
    deliveryConfirmed: captured.deliveryConfirmed,
  });
}

async function main() {
  if (!["preflight", "auth", "sign", "submit", "status", "verify"].includes(command)) {
    throw new Error("USAGE_preflight_auth_sign_submit_status_verify");
  }
  if (command === "verify") {
    await verifyCommand();
    return;
  }
  if (["preflight", "auth"].includes(command)) {
    if (runPath) throw new Error("UNEXPECTED_DIRECTORY");
    requireSandbox();
    if (command === "preflight") {
      required("HACIENDA_P12_PIN");
      await access(required("HACIENDA_P12_PATH"));
      report({ environment: "sandbox", configurationPresent: true, networkRequests: 0 });
    } else {
      await authenticatedClient();
      report({ environment: "sandbox", authenticated: true, tokensPrinted: false });
    }
    return;
  }
  const { directory, invoice, xml, invoiceHash } = await invoiceRun();
  const identityHash = digest(invoice.clave);
  runState = { directory, invoice, identityHash };
  if (command === "sign") {
    await writeFile(join(directory, "unsigned.xml"), xml, { mode: 0o600, flag: "wx" });
    const signed = await signXml(
      xml,
      await readFile(required("HACIENDA_P12_PATH")),
      required("HACIENDA_P12_PIN"),
    );
    if (!(await validateDocumentXml(signed, { requireSignature: true })).valid)
      throw new Error("INVALID_SIGNED_XSD");
    await writeFile(join(directory, "signed.xml"), signed, { mode: 0o600, flag: "wx" });
    await writeFile(join(directory, "validation-signed.xml"), signed, { mode: 0o600, flag: "wx" });
    await save(directory, "validation-signature.json", {
      invoiceHash,
      xmlHash: digest(signed),
      identityHash,
    });
    report({ signed: true, xsdValid: true, networkRequests: 0, identityHash });
    return;
  }
  if (command === "status") {
    const client = await authenticatedClient();
    const result = await getStatus(client, invoice.clave);
    if (result.clave !== invoice.clave) throw new Error("RESPONSE_IDENTITY_MISMATCH");
    await save(directory, `validation-status-${Date.now()}.json`, result);
    report({ environment: "sandbox", status: result.status, identityHash, submitted: false });
    return;
  }
  if (process.env.HACIENDA_SANDBOX_SUBMIT !== "1") throw new Error("SUBMIT_OPT_IN_REQUIRED");
  requireSandbox();
  for (const name of [
    "attempt.json",
    "request.json",
    "result.json",
    "validation-attempt.json",
    "validation-request.json",
    "validation-result.json",
    "request.body.json",
    "request.pretty.json",
    "manifest.json",
  ]) {
    try {
      await access(join(directory, name));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error("PREVIOUS_SUBMISSION_REQUIRES_STATUS");
  }
  const signed = await readFile(join(directory, "validation-signed.xml"), "utf8");
  const signature = JSON.parse(
    await readFile(join(directory, "validation-signature.json"), "utf8"),
  );
  if (signature.invoiceHash !== invoiceHash || signature.xmlHash !== digest(signed))
    throw new Error("RUN_MODIFIED_AFTER_SIGNING");
  if (!(await validateDocumentXml(signed, { requireSignature: true })).valid)
    throw new Error("INVALID_SIGNED_XSD");
  const client = await authenticatedClient();
  const request = {
    clave: invoice.clave,
    fecha: invoice.fechaEmision,
    emisor: {
      tipoIdentificacion: invoice.emisor.identificacion.tipo,
      numeroIdentificacion: invoice.emisor.identificacion.numero,
    },
    ...(invoice.receptor?.identificacion
      ? {
          receptor: {
            tipoIdentificacion: invoice.receptor.identificacion.tipo,
            numeroIdentificacion: invoice.receptor.identificacion.numero,
          },
        }
      : {}),
    comprobanteXml: Buffer.from(signed).toString("base64"),
  };
  // Exclusive request/attempt files intentionally block every second POST, even after a crash.
  await save(directory, "validation-attempt.json", {
    environment: "sandbox",
    identityHash,
    invoiceHash,
    startedAt: new Date().toISOString(),
  });
  const result = await submitAndWait(client, request, { timeoutMs: 90_000 });
  const outcomeClass = classifySubmissionResult(result);
  if (outcomeClass === null) throw new Error("UNKNOWN_FISCAL_STATE");
  await persistRawResponse(directory);
  await save(directory, "validation-result.json", {
    environment: "sandbox",
    class: outcomeClass,
    result: { ...result },
  });
  const manifest = await writeRunManifest(outcomeClass, "unresolved at manifest build");
  manifestWritten = true;
  report({
    environment: "sandbox",
    status: result.status,
    accepted: result.accepted,
    identityHash,
    ...(manifest.missing.length ? { missing: manifest.missing } : {}),
  });
  if (result.clave !== invoice.clave) throw new Error("RESPONSE_IDENTITY_MISMATCH");
  if (!result.accepted) process.exitCode = 1;
}

async function verifyCommand() {
  if (!runPath) throw new Error("RUN_DIRECTORY_REQUIRED");
  const directory = await realpath(resolve(runPath));
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    report({
      ok: false,
      code: "MANIFEST_REQUIRED",
      recovery:
        "Directory has no manifest: re-run sign/submit in it, or keep it as legacy evidence.",
    });
    process.exitCode = 1;
    return;
  }
  const failing = [];
  const record = (check, ok, detail) => {
    report({ check, ok, ...(ok ? {} : { detail }) });
    if (!ok) failing.push(check);
  };
  if (manifest.formatVersion !== 1)
    record("formatVersion", false, `unsupported formatVersion ${String(manifest.formatVersion)}`);
  const missing = Array.isArray(manifest.missing) ? manifest.missing : null;
  if (missing === null) record("missing", false, "manifest.missing is not an array");
  const links =
    typeof manifest.links === "object" && manifest.links !== null ? manifest.links : null;
  if (links === null) record("links", false, "manifest.links is not an object");
  const outcome =
    typeof manifest.outcome === "object" && manifest.outcome !== null ? manifest.outcome : null;
  if (outcome === null || !RESULT_CLASSES.includes(outcome.class)) {
    record("outcome", false, "manifest.outcome.class is not a known result class");
  }
  if (links !== null && missing !== null) {
    for (const [field, candidates] of [
      ["invoiceHash", ["invoice.json"]],
      ["unsignedXmlHash", ["unsigned.xml"]],
      ["signedXmlHash", ["signed.xml", "validation-signed.xml"]],
      ["requestBodyHash", ["request.body.json"]],
      ["signatureHash", ["validation-signature.json"]],
      ["responseBodyHash", ["response.raw.json"]],
    ]) {
      const expected = links[field];
      if (expected === undefined) {
        record(field, false, "hash not recorded in manifest");
        continue;
      }
      if (expected === null) {
        const entry = missing.find((item) => item && item.field === field);
        record(
          field,
          !!entry,
          entry ? `missing: ${entry.reason}` : "null hash declared without a missing entry",
        );
        continue;
      }
      const found = await hashFileIfPresent(directory, candidates);
      record(
        field,
        !!found && found.hash === expected,
        found
          ? found.hash === expected
            ? `ok (${found.file})`
            : "hash mismatch"
          : `no candidate file: ${candidates.join(" | ")}`,
      );
    }
    const comprobante = await recomputeComprobanteHash(directory);
    const expectedComprobante = links.comprobanteXmlHash;
    if (expectedComprobante === undefined) {
      record("comprobanteXmlHash", false, "hash not recorded in manifest");
    } else if (expectedComprobante === null) {
      const entry = missing.find((item) => item && item.field === "comprobanteXmlHash");
      record(
        "comprobanteXmlHash",
        !!entry,
        entry ? `missing: ${entry.reason}` : "null hash declared without a missing entry",
      );
    } else {
      const matches =
        comprobante?.hash === expectedComprobante &&
        (links.signedXmlHash === undefined || links.signedXmlHash === expectedComprobante);
      record(
        "comprobanteXmlHash",
        !!matches,
        comprobante === null
          ? "request.body.json absent"
          : comprobante.hash === undefined
            ? comprobante.error
            : matches
              ? "ok"
              : "hash mismatch against request body or signed.xml",
      );
    }
    // missing entries: every one must reference a null link with a reason.
    const missingProblems = [];
    for (const item of missing) {
      const name = item?.field;
      if (!name || links[name] !== null || typeof item.reason !== "string" || item.reason === "") {
        missingProblems.push(name ?? "<no field>");
      }
    }
    record(
      "missing",
      missingProblems.length === 0,
      missingProblems.length
        ? `entries not backed by a null link or without reason: ${missingProblems.join(", ")}`
        : "ok",
    );
    // Identity: clave segments against invoice.json (+ manifest identityHash).
    let invoice = null;
    try {
      invoice = JSON.parse(await readFile(join(directory, "invoice.json"), "utf8"));
    } catch {
      record("identity", false, "invoice.json unreadable");
    }
    if (invoice) {
      const segments =
        typeof invoice.clave === "string" &&
        manifest.clave === invoice.clave &&
        invoice.clave.slice(0, 3) === "506" &&
        invoice.clave.slice(29, 31) === invoice.numeroConsecutivo?.slice(8, 10) &&
        invoice.clave.slice(9, 21) === invoice.emisor?.identificacion?.numero?.padStart(12, "0") &&
        invoice.clave.slice(21, 41) === invoice.numeroConsecutivo &&
        manifest.identityHash === digest(invoice.clave) &&
        manifest.documentType === invoice.clave.slice(29, 31);
      record("identity", !!segments, segments ? "ok" : "clave segments or identityHash mismatch");
    }
    // Outcome coherence (check 8): derived class must match persisted evidence.
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
    let coherent;
    if (outcome === null || !RESULT_CLASSES.includes(outcome.class)) coherent = false;
    else if (outcome.class === "ACCEPTED") coherent = observedClass === "ACCEPTED";
    else if (outcome.class === "REJECTED")
      coherent =
        observedClass === "REJECTED" ||
        (typeof outcome.errorCause === "string" && outcome.errorCause !== "");
    else if (outcome.class === "PENDING")
      coherent =
        observedClass === "PENDING" ||
        (observedClass === null &&
          typeof outcome.requestId === "string" &&
          outcome.requestId !== "");
    else if (outcome.class === "TRANSPORT_BLOCKED")
      coherent = observedClass === null || observedClass === "TRANSPORT_BLOCKED";
    else coherent = observedClass === null; // INVALID_LOCAL
    record(
      "outcomeCoherence",
      !!coherent,
      coherent ? "ok" : "outcome.class contradicts persisted artifacts",
    );
  }
  const ok = failing.length === 0;
  const incomplete = ok && missing !== null && missing.length > 0;
  report({
    ok,
    result: ok ? (incomplete ? "INCOMPLETE" : "VALID") : "CORRUPT",
    causedBy: failing[0] ?? null,
  });
  process.exitCode = ok ? (incomplete ? 2 : 0) : 1;
}

main().catch(async (error) => {
  // Never print SDK errors/causes/response bodies, which may contain private account data.
  const safeCode =
    typeof error?.message === "string" && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "VALIDATION_FAILED";
  let outcomeClass;
  if (runState && !manifestWritten) {
    try {
      const manifest = await writeRunManifest(classifyFailure(error), `run failed: ${safeCode}`);
      manifestWritten = true;
      outcomeClass = manifest.outcome.class;
    } catch {
      outcomeClass = undefined;
    }
  }
  if (activeDirectory) {
    await save(activeDirectory, `validation-error-${Date.now()}.json`, {
      name: error?.name,
      statusCode: error?.statusCode,
      responseBody: error?.responseBody,
    }).catch(() => {});
  }
  report({
    ok: false,
    code: safeCode,
    ...(Number.isInteger(error?.statusCode) ? { httpStatus: error.statusCode } : {}),
    ...(outcomeClass ? { outcome: { class: outcomeClass } } : {}),
    recovery:
      command === "submit"
        ? "Query status using the same run directory; do not submit again."
        : undefined,
  });
  process.exitCode = 1;
});
