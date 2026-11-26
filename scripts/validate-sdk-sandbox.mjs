/** Explicit manual runner: never selected by pnpm test; sandbox endpoints only. */
import { readFile, writeFile, access, realpath } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
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
  buildExactFacturaXml,
  buildExactTiqueteXml,
  buildExactNotaCreditoTotalXml,
  buildExactNotaCreditoPartialXml,
  buildExactNotaDebitoXml,
  buildExactFacturaCompraXml,
} from "../packages/sdk/dist/index.js";
import {
  ExactFeInputSchema,
  ExactTeInputSchema,
  ExactNcTotalInputSchema,
  ExactNcPartialInputSchema,
  ExactNdInputSchema,
  ExactFecInputSchema,
} from "../shared/dist/index.js";
import {
  classifySubmissionResult,
  classifyDeliveryError,
  containsFiscalMarkers,
  isDeliveryError,
} from "./sandbox-outcome.mjs";
import {
  assertIdentity,
  digest,
  familyIdentity,
  identityFacts,
  readRunInput,
  save,
  verifyBundle,
  writeRunManifest,
} from "./sandbox-bundle.mjs";

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
const report = (value) => console.log(JSON.stringify(value));
/** Acknowledgement required before a live FEC POST (party mapping unverified). */
const FEC_ACK_NAME = "HACIENDA_SANDBOX_FEC_ACK";
const FEC_ACK_VALUE = "party-mapping-unverified";

/** Run identity for the failure-path manifest; set once the run input is bound. */
let runState;
/** Set once the exclusive attempt marker exists: only then is a POST possible. */
let attemptStarted = false;
/** Set once a manifest is persisted, so the failure path never overwrites it. */
let manifestWritten = false;
/** Evidence captured by `sdkFetch` for the delivery path of the current run. */
const captured = {
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
  // Persist the exact bytes the SDK transmits (its compact JSON.stringify body)
  // before the receipt POST travels. Token requests and status GETs have no
  // submission body to bind.
  if (receipt && method === "POST" && activeDirectory) {
    if (typeof init?.body !== "string") throw new Error("POST_BODY_NOT_JSON");
    let parsed;
    try {
      parsed = JSON.parse(init.body);
    } catch {
      throw new Error("POST_BODY_NOT_JSON");
    }
    if (typeof parsed !== "object" || parsed === null || typeof parsed.comprobanteXml !== "string")
      throw new Error("POST_BODY_NOT_SUBMISSION");
    await writeFile(join(activeDirectory, "request.body.json"), init.body, {
      mode: 0o600,
      flag: "wx",
    });
    await save(activeDirectory, "request.pretty.json", parsed);
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
      if (method === "POST" && response.status >= 200 && response.status < 400)
        captured.deliveryConfirmed = true;
      captured.lastReceiptBody = await response.clone().text();
    }
    await save(activeDirectory, `validation-http-${Date.now()}-${++traceSequence}.json`, {
      phase: token ? "authentication" : "receipt",
      method,
      status: response.status,
      headers,
      // Never persist OAuth responses, access tokens or request authorization.
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

// Clave identity (document type and taxpayer) lives in FAMILY_IDENTITY so that
// `verify` applies the same binding offline; FEC's taxpayer is its buyer.
// The POST `emisor` for FEC is the XML Emisor (supplier). Whether Hacienda
// expects the supplier or the buyer there is an open question; see
// docs/support-matrix.md#fec-post-party-mapping-open-question.
const issuer = (input) => input.emisor;
const originalIssuer = (input) => input.original.emisor;
const originalReceptor = (input) => input.original.receptor;
const FAMILY_SPECS = {
  FE: { schema: ExactFeInputSchema, builder: buildExactFacturaXml, emisor: issuer },
  TE: { schema: ExactTeInputSchema, builder: buildExactTiqueteXml, emisor: issuer },
  NC: {
    schema: ExactNcTotalInputSchema,
    builder: buildExactNotaCreditoTotalXml,
    emisor: originalIssuer,
    receptor: originalReceptor,
  },
  NCP: {
    schema: ExactNcPartialInputSchema,
    builder: buildExactNotaCreditoPartialXml,
    emisor: originalIssuer,
    receptor: originalReceptor,
  },
  ND: {
    schema: ExactNdInputSchema,
    builder: buildExactNotaDebitoXml,
    emisor: originalIssuer,
    receptor: originalReceptor,
  },
  FEC: { schema: ExactFecInputSchema, builder: buildExactFacturaCompraXml, emisor: issuer },
};

async function documentRun() {
  if (!runPath) throw new Error("RUN_DIRECTORY_REQUIRED");
  const directory = await realpath(resolve(runPath));
  const local = relative(repository, directory);
  if (!local.startsWith("..") && local !== "..")
    throw new Error("ARTIFACTS_MUST_BE_OUTSIDE_REPOSITORY");
  activeDirectory = directory;

  // Prefer document.json (multi-family); fall back to legacy invoice.json (FE).
  const run = await readRunInput(directory);
  const invoiceHash = digest(run.serialized);
  if (run.legacy) {
    const invoice = run.input;
    const result = validateFacturaInput(invoice);
    if (!result.valid) throw new Error("INVALID_INVOICE_INPUT");
    assertIdentity(identityFacts(run));
    const xml = buildFacturaXml(invoice);
    if (!(await validateDocumentXml(xml)).valid) throw new Error("INVALID_UNSIGNED_XSD");
    return { directory, family: "FE", invoice, xml, invoiceHash };
  }

  const spec = Object.hasOwn(FAMILY_SPECS, run.family) ? FAMILY_SPECS[run.family] : undefined;
  if (!spec || !familyIdentity(run.family)) throw new Error("UNKNOWN_FAMILY");
  const parsed = spec.schema.safeParse(run.input);
  if (!parsed.success) throw new Error("INVALID_DOCUMENT_INPUT");
  const validated = parsed.data;
  assertIdentity(identityFacts({ ...run, input: validated }));
  const xml = spec.builder(validated);
  if (!(await validateDocumentXml(xml)).valid) throw new Error("INVALID_UNSIGNED_XSD");
  const invoice = {
    clave: validated.clave,
    fechaEmision: validated.fechaEmision,
    emisor: spec.emisor(validated),
    receptor: (spec.receptor ?? ((input) => input.receptor))(validated),
  };
  return { directory, family: run.family, invoice, xml, invoiceHash };
}

const outcomeObservation = () => ({
  ...(Number.isInteger(captured.lastHttpStatus) ? { httpStatus: captured.lastHttpStatus } : {}),
  ...(captured.lastErrorType ? { gatewayErrorType: captured.lastErrorType } : {}),
  ...(captured.lastRequestId ? { requestId: captured.lastRequestId } : {}),
  ...(captured.lastCfRay ? { cfRay: captured.lastCfRay } : {}),
  ...(captured.lastErrorCause ? { errorCause: captured.lastErrorCause } : {}),
  observedAt: new Date().toISOString(),
});

/** Persist `response.raw.json` (raw receipt body) when one was received. */
async function persistRawResponse(directory) {
  if (!captured.lastReceiptBody) return;
  try {
    await writeFile(join(directory, "response.raw.json"), captured.lastReceiptBody, {
      mode: 0o600,
      flag: "wx",
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function manifestFor(outcomeClass, missingReason) {
  await persistRawResponse(runState.directory);
  const manifest = await writeRunManifest({
    ...runState,
    outcomeClass,
    observation: outcomeObservation(),
    missingReason,
  });
  manifestWritten = true;
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

async function verifyCommand() {
  if (!runPath) throw new Error("RUN_DIRECTORY_REQUIRED");
  const verdict = await verifyBundle(await realpath(resolve(runPath)));
  if (verdict.manifestRequired) {
    report({
      ok: false,
      code: "MANIFEST_REQUIRED",
      recovery: "Directory has no manifest: keep it as legacy or pre-submission evidence.",
    });
  } else {
    for (const check of verdict.checks) report(check);
    report(verdict.summary);
  }
  process.exitCode = verdict.exitCode;
}

async function main() {
  if (
    extra.length ||
    !["preflight", "auth", "sign", "submit", "status", "verify"].includes(command)
  ) {
    throw new Error("USAGE_preflight_auth_sign_submit_status_verify");
  }
  if (command === "verify") return verifyCommand();
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
  const { directory, family, invoice, xml, invoiceHash } = await documentRun();
  const identityHash = digest(invoice.clave);
  runState = { directory, clave: invoice.clave, identityHash, family };
  if (command === "sign") {
    const signed = await signXml(
      xml,
      await readFile(required("HACIENDA_P12_PATH")),
      required("HACIENDA_P12_PIN"),
    );
    if (!(await validateDocumentXml(signed, { requireSignature: true })).valid)
      throw new Error("INVALID_SIGNED_XSD");
    // Canonical bundle names plus the validation-* files earlier runs used.
    for (const [name, content] of [
      ["unsigned.xml", xml],
      ["signed.xml", signed],
      ["validation-signed.xml", signed],
    ])
      await writeFile(join(directory, name), content, { mode: 0o600, flag: "wx" });
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
  // FEC POST party mapping is unverified (docs/support-matrix.md, roadmap P0-7):
  // the request below sends the XML Emisor (supplier) as `emisor`, while the
  // buyer issues/signs the FEC and owns its clave. A live FEC POST therefore
  // needs this explicit acknowledgement on top of the submit opt-in.
  if (family === "FEC" && process.env[FEC_ACK_NAME] !== FEC_ACK_VALUE)
    throw new Error("FEC_PARTY_MAPPING_UNVERIFIED");
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
  await save(directory, "validation-request.json", request);
  await save(directory, "validation-attempt.json", {
    environment: "sandbox",
    identityHash,
    invoiceHash,
    startedAt: new Date().toISOString(),
  });
  attemptStarted = true;
  const result = await submitAndWait(client, request, { timeoutMs: 90_000 });
  const outcomeClass = classifySubmissionResult(result);
  if (outcomeClass === null) throw new Error("UNKNOWN_FISCAL_STATE");
  await save(directory, "validation-result.json", {
    environment: "sandbox",
    class: outcomeClass,
    result,
  });
  const manifest = await manifestFor(outcomeClass, "unresolved at manifest build");
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

main().catch(async (error) => {
  // Never print SDK errors/causes/response bodies, which may contain private account data.
  const safeCode =
    typeof error?.message === "string" && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "VALIDATION_FAILED";
  // A manifest is evidence of an attempt: write one only after the exclusive
  // attempt marker exists, so a local failure never blocks a later submit.
  let outcomeClass;
  if (attemptStarted && !manifestWritten) {
    try {
      outcomeClass = (await manifestFor(classifyFailure(error), `run failed: ${safeCode}`)).outcome
        .class;
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
