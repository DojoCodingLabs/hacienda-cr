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
  // Credentials must never be forwarded through an HTTP redirect.
  const response = await fetch(input, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (activeDirectory) {
    await save(activeDirectory, `validation-http-${Date.now()}-${++traceSequence}.json`, {
      phase: token ? "authentication" : "receipt",
      method,
      status: response.status,
      headers: Object.fromEntries(
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
      ),
      // Never persist OAuth responses, access tokens or request authorization.
      ...(receipt ? { body: await response.clone().text() } : {}),
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

async function main() {
  if (extra.length || !["preflight", "auth", "sign", "submit", "status"].includes(command)) {
    throw new Error("USAGE_preflight_auth_sign_submit_status");
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
  if (command === "sign") {
    const signed = await signXml(
      xml,
      await readFile(required("HACIENDA_P12_PATH")),
      required("HACIENDA_P12_PIN"),
    );
    if (!(await validateDocumentXml(signed, { requireSignature: true })).valid)
      throw new Error("INVALID_SIGNED_XSD");
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
  const result = await submitAndWait(client, request, { timeoutMs: 90_000 });
  await save(directory, "validation-result.json", result);
  report({
    environment: "sandbox",
    status: result.status,
    accepted: result.accepted,
    identityHash,
  });
  if (result.clave !== invoice.clave) throw new Error("RESPONSE_IDENTITY_MISMATCH");
  if (!result.accepted) process.exitCode = 1;
}

main().catch(async (error) => {
  if (activeDirectory) {
    await save(activeDirectory, `validation-error-${Date.now()}.json`, {
      name: error?.name,
      statusCode: error?.statusCode,
      responseBody: error?.responseBody,
    }).catch(() => {});
  }
  // Never print SDK errors/causes/response bodies, which may contain private account data.
  const safeCode =
    typeof error?.message === "string" && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "VALIDATION_FAILED";
  report({
    ok: false,
    code: safeCode,
    ...(Number.isInteger(error?.statusCode) ? { httpStatus: error.statusCode } : {}),
    recovery:
      command === "submit"
        ? "Query status using the same run directory; do not submit again."
        : undefined,
  });
  process.exitCode = 1;
});
