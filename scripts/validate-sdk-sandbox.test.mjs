import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildClave, Situation } from "../packages/sdk/dist/index.js";
import { digest, writeRunManifest } from "./sandbox-bundle.mjs";

const root = resolve(import.meta.dirname, "..");
const runner = fileURLToPath(new URL("./validate-sdk-sandbox.mjs", import.meta.url));
// Replace fetch in the runner process: any network attempt fails the run.
const noNetwork =
  "data:text/javascript," +
  encodeURIComponent(
    'globalThis.fetch = async () => { throw new Error("NETWORK_FORBIDDEN_IN_TESTS"); };',
  );
function spawnRunner(command, overrides, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("HACIENDA_")) delete env[key];
  return spawnSync(process.execPath, ["--import", noNetwork, runner, command, ...args], {
    encoding: "utf8",
    env: { ...env, ...overrides },
  });
}
function run(command, overrides = {}, args = []) {
  const result = spawnRunner(command, overrides, args);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}
function runOk(command, overrides = {}, args = []) {
  const result = spawnRunner(command, overrides, args);
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0, result.stdout);
  return JSON.parse(result.stdout);
}

function tempRun() {
  return mkdtempSync(join(tmpdir(), "sdk-sandbox-run-"));
}
function withRun(files, body) {
  const dir = tempRun();
  try {
    for (const [name, value] of Object.entries(files))
      writeFileSync(join(dir, name), JSON.stringify(value));
    return body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --- Synthetic exact inputs (mirrors packages/sdk/src/__fixtures__/exact-*.ts) ---
const ISSUER_ID = "3101234567";
const BUYER_ID = "3109876543";
function fixtureClave(date, documentType, sequence, taxpayerId = ISSUER_ID) {
  return buildClave({
    date: new Date(date),
    taxpayerId,
    branch: "001",
    pos: "00001",
    documentType,
    sequence,
    situation: Situation.NORMAL,
    securityCode: "99999999",
  });
}
const FECHA = "2026-10-18T12:00:00-06:00";
const EMISOR = {
  nombre: "Empresa Test S.A.",
  identificacion: { tipo: "02", numero: ISSUER_ID },
  nombreComercial: "TestCorp",
  ubicacion: {
    provincia: "1",
    canton: "01",
    distrito: "01",
    barrio: "Barrio El Carmen",
    otrasSenas: "100m norte del parque central",
  },
  telefono: { codigoPais: "506", numTelefono: "22223333" },
  correoElectronico: "facturacion@testcorp.cr",
};
const RECEPTOR = {
  nombre: "Cliente Ejemplo S.R.L.",
  identificacion: { tipo: "02", numero: BUYER_ID },
  correoElectronico: "compras@clienteejemplo.cr",
};
const LINE = {
  numeroLinea: 1,
  codigoCabys: "8310100000000",
  cantidad: "1",
  unidadMedida: "Sp",
  detalle: "Servicio sintético",
  precioUnitario: "100",
  esServicio: true,
  impuesto: [{ codigo: "01", codigoTarifaIVA: "08", tarifa: "13" }],
};
function withIdentity(documentType, sequence, taxpayerId) {
  const clave = fixtureClave(FECHA, documentType, sequence, taxpayerId);
  return { clave, numeroConsecutivo: clave.slice(21, 41), fechaEmision: FECHA };
}
function feInput() {
  return {
    caseCode: "FE-domestic-ordinary-iva13-v1",
    ...withIdentity("01", 1),
    proveedorSistemas: ISSUER_ID,
    codigoActividadEmisor: "620100",
    emisor: structuredClone(EMISOR),
    receptor: structuredClone(RECEPTOR),
    condicionVenta: "01",
    detalleServicio: [structuredClone(LINE)],
    codigoTipoMoneda: { codigoMoneda: "CRC", tipoCambio: "1" },
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "113" }],
  };
}
function reference(original, codigo, razon) {
  return [
    { tipoDoc: "01", numero: original.clave, fechaEmision: original.fechaEmision, codigo, razon },
  ];
}
function teInput() {
  const { receptor: _receptor, ...fe } = feInput();
  return { ...fe, caseCode: "TE-domestic-ordinary-iva13-v1", ...withIdentity("04", 7) };
}
function ncInput() {
  const original = feInput();
  return {
    caseCode: "NC-domestic-ordinary-fe-total-iva13-v1",
    ...withIdentity("03", 2),
    original,
    informacionReferencia: reference(original, "01", "Anulación total solicitada"),
  };
}
function ndInput() {
  const original = feInput();
  return {
    caseCode: "ND-domestic-ordinary-fe-increment-iva13-v1",
    original,
    ...withIdentity("02", 3),
    adjustments: [
      { originalLineNumber: 1, line: { ...structuredClone(LINE), precioUnitario: "10.00001" } },
    ],
    medioPago: [{ tipoMedioPago: "01", totalMedioPago: "11.30001" }],
    informacionReferencia: reference(original, "02", "Incremento de monto solicitado"),
  };
}
function ncpInput() {
  return {
    ...ndInput(),
    caseCode: "NC-domestic-ordinary-fe-partial-iva13-v1",
    ...withIdentity("03", 5),
  };
}
function fecInput() {
  const fe = feInput();
  return {
    caseCode: "FEC-domestic-ordinary-iva13-v1",
    // FEC is issued by its buyer: the clave carries the receptor's identification.
    ...withIdentity("08", 4, BUYER_ID),
    proveedorSistemas: fe.proveedorSistemas,
    codigoActividadReceptor: "620100",
    emisor: fe.emisor,
    receptor: {
      ...fe.receptor,
      ubicacion: {
        provincia: "1",
        canton: "01",
        distrito: "01",
        otrasSenas: "Dirección sintética de la compradora",
      },
    },
    condicionVenta: "01",
    detalleServicio: fe.detalleServicio,
    codigoTipoMoneda: fe.codigoTipoMoneda,
    medioPago: fe.medioPago,
    informacionReferencia: [
      {
        tipoDoc: "99",
        tipoDocOtros: "Recibo del proveedor",
        numero: "RECIBO-SINTETICO-0001",
        fechaEmision: "2026-10-18T11:00:00-06:00",
        codigo: "04",
        razon: "Respaldo real de la compra sintética",
      },
    ],
  };
}
const FAMILIES = {
  FE: feInput,
  TE: teInput,
  NC: ncInput,
  NCP: ncpInput,
  ND: ndInput,
  FEC: fecInput,
};

// Self-signed synthetic credential; never a Hacienda certificate.
let credentials;
before(() => {
  const forge = createRequire(join(root, "packages/sdk/package.json"))("node-forge");
  credentials = mkdtempSync(join(tmpdir(), "sdk-sandbox-p12-"));
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 60000);
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  cert.setSubject([{ name: "commonName", value: "Synthetic runner test" }]);
  cert.setIssuer(cert.subject.attributes);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "test-pin", {
    algorithm: "3des",
  });
  writeFileSync(
    join(credentials, "test.p12"),
    Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary"),
  );
});
after(() => rmSync(credentials, { recursive: true, force: true }));
const signEnv = () => ({
  HACIENDA_P12_PATH: join(credentials, "test.p12"),
  HACIENDA_P12_PIN: "test-pin",
});

test("auth requires explicit sandbox opt-in even when credentials exist", () => {
  const result = run("auth", { HACIENDA_USERNAME: "private", HACIENDA_PASSWORD: "do-not-print" });
  assert.equal(result.code, "OPT_IN_REQUIRED");
  assert.ok(!JSON.stringify(result).includes("do-not-print"));
});
test("auth refuses a production username before making requests", () => {
  assert.equal(
    run("auth", {
      HACIENDA_SANDBOX_TEST: "1",
      HACIENDA_USERNAME: "test@prod.comprobanteselectronicos.go.cr",
      HACIENDA_PASSWORD: "secret",
    }).code,
    "SANDBOX_USERNAME_REQUIRED",
  );
});
test("preflight lists the missing field without disclosing configured values", () => {
  assert.equal(
    run("preflight", {
      HACIENDA_SANDBOX_TEST: "1",
      HACIENDA_USERNAME: "test@stag.comprobanteselectronicos.go.cr",
    }).code,
    "MISSING_HACIENDA_PASSWORD",
  );
});
test("unrecognized commands fail without network calls", () => {
  assert.equal(run("production").code, "VALIDATION_FAILED");
});

test("document run refuses an unknown family", () => {
  withRun({ "document.json": { family: "FOO", input: {} } }, (dir) =>
    assert.equal(run("sign", {}, [dir]).code, "UNKNOWN_FAMILY"),
  );
});

test("document run refuses inherited property names as families", () => {
  withRun({ "document.json": { family: "constructor", input: {} } }, (dir) =>
    assert.equal(run("sign", {}, [dir]).code, "UNKNOWN_FAMILY"),
  );
});

test("document run refuses invalid input", () => {
  withRun({ "document.json": { family: "FE", input: {} } }, (dir) =>
    assert.equal(run("sign", {}, [dir]).code, "INVALID_DOCUMENT_INPUT"),
  );
});

test("document run requires a family", () => {
  withRun({ "document.json": { input: {} } }, (dir) =>
    assert.equal(run("sign", {}, [dir]).code, "MISSING_FAMILY"),
  );
});

for (const [family, make] of Object.entries(FAMILIES)) {
  test(`${family} document run builds, validates and signs offline`, () => {
    withRun({ "document.json": { family, input: make() } }, (dir) => {
      const result = runOk("sign", signEnv(), [dir]);
      assert.equal(result.signed, true);
      assert.equal(result.xsdValid, true);
      assert.equal(result.networkRequests, 0);
      assert.match(result.identityHash, /^[0-9a-f]{64}$/);
      assert.ok(existsSync(join(dir, "validation-signed.xml")));
      const signature = JSON.parse(readFileSync(join(dir, "validation-signature.json"), "utf8"));
      assert.equal(signature.identityHash, result.identityHash);
    });
  });
}

/** Re-derives a clave for a different taxpayer while keeping the consecutive. */
function claveFor(input, taxpayerId) {
  return input.clave.slice(0, 9) + taxpayerId.padStart(12, "0") + input.clave.slice(21);
}

test("document run binds the clave taxpayer to the issuer", () => {
  for (const family of ["FE", "TE", "NC", "NCP", "ND"]) {
    const input = FAMILIES[family]();
    input.clave = claveFor(input, "3101999999");
    withRun({ "document.json": { family, input } }, (dir) =>
      assert.equal(run("sign", signEnv(), [dir]).code, "IDENTITY_MISMATCH", family),
    );
  }
});

test("document run binds the FEC clave taxpayer to the buyer, not the supplier", () => {
  const input = fecInput();
  input.clave = claveFor(input, ISSUER_ID);
  withRun({ "document.json": { family: "FEC", input } }, (dir) =>
    assert.equal(run("sign", signEnv(), [dir]).code, "IDENTITY_MISMATCH"),
  );
});

test("document run binds the clave to its consecutive", () => {
  for (const family of Object.keys(FAMILIES)) {
    const input = FAMILIES[family]();
    const sequence = input.numeroConsecutivo.slice(10);
    input.numeroConsecutivo =
      input.numeroConsecutivo.slice(0, 10) +
      String(Number(sequence) + 1).padStart(sequence.length, "0");
    withRun({ "document.json": { family, input } }, (dir) =>
      assert.equal(run("sign", signEnv(), [dir]).code, "IDENTITY_MISMATCH", family),
    );
  }
});

test("document run refuses a document type that does not match the family", () => {
  // A valid FE identity declared as TE: the consecutive carries type 01, not 04.
  const input = { ...teInput(), ...withIdentity("01", 7) };
  withRun({ "document.json": { family: "TE", input } }, (dir) =>
    assert.equal(run("sign", signEnv(), [dir]).code, "IDENTITY_MISMATCH"),
  );
});

test("sign writes the canonical bundle files and no manifest", () => {
  withRun({ "document.json": { family: "FE", input: feInput() } }, (dir) => {
    runOk("sign", signEnv(), [dir]);
    const signed = readFileSync(join(dir, "signed.xml"), "utf8");
    assert.equal(readFileSync(join(dir, "validation-signed.xml"), "utf8"), signed);
    assert.match(readFileSync(join(dir, "unsigned.xml"), "utf8"), /<FacturaElectronica/);
    assert.ok(!existsSync(join(dir, "manifest.json")));
  });
});

test("local failures before an attempt leave no manifest that would block a later submit", () => {
  withRun({ "document.json": { family: "FE", input: feInput() } }, (dir) => {
    // MISSING_HACIENDA_P12_PATH contains digits, so the safe-code filter reduces it.
    assert.equal(run("sign", {}, [dir]).code, "VALIDATION_FAILED");
    assert.ok(!existsSync(join(dir, "signed.xml")));
    // Submission opt-in is deliberately absent: the runner stops before any network step.
    const refused = run("submit", { HACIENDA_SANDBOX_TEST: "1" }, [dir]);
    assert.equal(refused.code, "SUBMIT_OPT_IN_REQUIRED");
    assert.equal(refused.outcome, undefined);
    assert.ok(!existsSync(join(dir, "manifest.json")));
    assert.ok(!existsSync(join(dir, "validation-attempt.json")));
  });
});

test("verify reports MANIFEST_REQUIRED for a directory without a manifest", () => {
  withRun({ "document.json": { family: "FE", input: feInput() } }, (dir) =>
    assert.equal(run("verify", {}, [dir]).code, "MANIFEST_REQUIRED"),
  );
});

test("verify re-audits a signed FEC bundle offline and detects tampering", async () => {
  const dir = tempRun();
  try {
    const input = fecInput();
    writeFileSync(join(dir, "document.json"), JSON.stringify({ family: "FEC", input }));
    runOk("sign", signEnv(), [dir]);
    // Synthetic stand-ins for the artifacts a submit would capture; no POST happens here.
    const signed = readFileSync(join(dir, "signed.xml"));
    writeFileSync(
      join(dir, "request.body.json"),
      JSON.stringify({ clave: input.clave, comprobanteXml: signed.toString("base64") }),
    );
    writeFileSync(join(dir, "response.raw.json"), JSON.stringify({ "ind-estado": "aceptado" }));
    writeFileSync(
      join(dir, "validation-result.json"),
      JSON.stringify({ class: "ACCEPTED", result: { status: "aceptado" } }),
    );
    await writeRunManifest({
      directory: dir,
      clave: input.clave,
      identityHash: digest(input.clave),
      family: "FEC",
      outcomeClass: "ACCEPTED",
      missingReason: "unresolved at manifest build",
    });
    const valid = spawnRunner("verify", {}, [dir]);
    assert.equal(valid.status, 0, valid.stdout);
    const lines = valid.stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(lines.at(-1), { ok: true, result: "VALID", causedBy: null });
    writeFileSync(join(dir, "signed.xml"), signed.toString("utf8").replace("<", "< "));
    const corrupt = spawnRunner("verify", {}, [dir]);
    assert.equal(corrupt.status, 1);
    const summary = JSON.parse(corrupt.stdout.trim().split("\n").at(-1));
    assert.equal(summary.result, "CORRUPT");
    assert.equal(summary.causedBy, "signedXmlHash");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verify takes exactly one directory argument", () => {
  assert.equal(run("verify", {}, ["/tmp", "extra"]).code, "VALIDATION_FAILED");
});
