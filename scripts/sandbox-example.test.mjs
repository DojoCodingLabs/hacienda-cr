import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const root = resolve(import.meta.dirname, "..");
const example = join(root, "packages/sdk/examples/sandbox.mjs");
const order = join(root, "packages/sdk/examples/order.json");
const forge = createRequire(join(root, "packages/sdk/package.json"))("node-forge");
let stage;

before(() => {
  stage = mkdtempSync(join(tmpdir(), "hacienda-example-"));
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 60000);
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  cert.setSubject([{ name: "commonName", value: "Synthetic example test" }]);
  cert.setIssuer(cert.subject.attributes);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "test-pin", {
    algorithm: "3des",
  });
  writeFileSync(join(stage, "test.p12"), Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary"));
  // Replace every network request before importing the example; never contact Hacienda.
  writeFileSync(
    join(stage, "mock.mjs"),
    `
import assert from "node:assert/strict";
import {appendFileSync,readFileSync} from "node:fs";
if (process.env.MOCK_MODE === "timeout") {
  const nativeSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => nativeSetTimeout(fn, ms === 60000 ? 30 : ms, ...args);
}
globalThis.fetch = async (url, options) => {
  assert.match(String(url), /rut-stag|recepcion-sandbox/);
  appendFileSync(process.env.NETWORK_LOG, options.method + " " + String(url) + "\\n");
  if (String(url).includes("/token")) return Response.json({access_token:"synthetic-token",refresh_token:"synthetic-refresh",expires_in:300,refresh_expires_in:3600,token_type:"Bearer",scope:""});
  if (options.method === "POST") {
    const request = JSON.parse(options.body);
    const saved = JSON.parse(readFileSync(process.env.RUN_DIRECTORY + "/request.json", "utf8"));
    assert.deepEqual(request, saved);
    assert.ok(readFileSync(process.env.RUN_DIRECTORY + "/attempt.json", "utf8"));
    assert.match(Buffer.from(request.comprobanteXml, "base64").toString(), /Signature/);
    if (process.env.MOCK_MODE === "network") throw new TypeError("Simulated lost response");
    if (process.env.MOCK_MODE === "duplicate") return Response.json({}, {status:409});
    return new Response(null, {status:202});
  }
  const clave = String(url).split("/").at(-1);
  return Response.json({clave,fecha:new Date().toISOString(),"ind-estado":process.env.MOCK_MODE === "rejected" ? "rechazado" : process.env.MOCK_MODE === "error" ? "error" : "aceptado","respuesta-xml":Buffer.from("<MensajeHacienda><DetalleMensaje>Simulated response</DetalleMensaje></MensajeHacienda>").toString("base64")});
};
`,
  );
});
after(() => {
  if (stage) rmSync(stage, { recursive: true, force: true });
});

function run(args, mode = "accepted", directory = "") {
  const result = spawnSync(
    process.execPath,
    ["--import", join(stage, "mock.mjs"), example, ...args],
    {
      cwd: stage,
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        HACIENDA_USERNAME: "",
        HACIENDA_SANDBOX_E2E: "",
        HACIENDA_PASSWORD: "synthetic-password",
        HACIENDA_P12_PIN: "test-pin",
        HACIENDA_P12_PATH: join(stage, "test.p12"),
        MOCK_MODE: mode,
        RUN_DIRECTORY: directory,
        NETWORK_LOG: join(stage, "network.log"),
      },
    },
  );
  if (result.error) throw result.error;
  return result;
}

function networkLog() {
  const path = join(stage, "network.log");
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function prepare(name) {
  const directory = join(stage, name);
  const before = networkLog();
  const result = run(["prepare", order, directory]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(networkLog(), before, "Preparation must stay offline");
  const invoice = JSON.parse(readFileSync(join(directory, "invoice.json"), "utf8"));
  assert.equal(invoice.resumenFactura.totalComprobante, 113000);
  assert.deepEqual(invoice.resumenFactura.medioPago, [
    { tipoMedioPago: "01", totalMedioPago: 113000 },
  ]);
  assert.equal(invoice.clave.slice(21, 41), invoice.numeroConsecutivo);
  assert.equal(run(["prepare", order, directory]).status, 1, "Must preserve existing artifacts");
  return { directory, invoice };
}

for (const mode of ["accepted", "rejected", "error", "network", "duplicate", "timeout"]) {
  test(`example preserves identity after ${mode} and never replays submission`, () => {
    const { directory, invoice } = prepare(mode);
    const previousLog = networkLog();
    const result = run(["submit", directory], mode, directory);
    assert.equal(result.status, mode === "accepted" ? 0 : 1, result.stderr);
    assert.equal(
      networkLog()
        .slice(previousLog.length)
        .match(/^POST .*recepcion-sandbox/gm)?.length,
      1,
    );
    const snapshot = JSON.parse(readFileSync(join(directory, "request.json"), "utf8"));
    assert.equal(snapshot.clave, invoice.clave);
    assert.ok(existsSync(join(directory, "signed.xml")));
    if (["accepted", "rejected", "error"].includes(mode)) {
      const terminal = JSON.parse(readFileSync(join(directory, "result.json"), "utf8"));
      assert.equal(
        terminal.status,
        mode === "accepted" ? "aceptado" : mode === "rejected" ? "rechazado" : "error",
      );
    } else {
      assert.match(result.stderr, /Run the status command/);
      assert.equal(existsSync(join(directory, "result.json")), false);
    }
    const beforeReplay = networkLog();
    const replay = run(["submit", directory], mode, directory);
    assert.equal(replay.status, 1);
    assert.match(replay.stderr, /snapshot already exists/);
    assert.equal(networkLog(), beforeReplay, "Refuse repeat submission before auth or signing");
    // Status must use the persisted request even if the draft is corrupted or removed.
    writeFileSync(join(directory, "invoice.json"), "edited draft");
    const recovered = run(["status", directory], "accepted", directory);
    assert.equal(recovered.status, 0, recovered.stderr);
    const status = JSON.parse(readFileSync(join(directory, "status.json"), "utf8"));
    assert.equal(status.clave, invoice.clave);
    assert.equal(
      networkLog()
        .slice(beforeReplay.length)
        .match(/^POST .*recepcion-sandbox/gm),
      null,
    );
  });
}

test("edited preparation is rejected before any network request", () => {
  const { directory, invoice } = prepare("edited");
  invoice.receptor.nombre = "Edited customer";
  writeFileSync(join(directory, "invoice.json"), JSON.stringify(invoice));
  const before = networkLog();
  const result = run(["submit", directory]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /changed after preparation/);
  assert.equal(networkLog(), before);
  assert.equal(existsSync(join(directory, "attempt.json")), false);
});
