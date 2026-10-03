import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
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
let polls = 0;
globalThis.fetch = async (url, options) => {
  assert.match(String(url), /rut-stag|recepcion-sandbox/);
  appendFileSync(process.env.NETWORK_LOG, options.method + " " + String(url) + "\\n");
  if (String(url).includes("/token")) {
    if (process.env.MOCK_MODE === "concurrent") {
      const barrier = process.env.RUN_DIRECTORY + "/auth-barrier";
      appendFileSync(barrier, "ready\\n");
      const deadline = Date.now() + 5000;
      while (readFileSync(barrier, "utf8").trim().split("\\n").length < 2) {
        assert.ok(Date.now() < deadline, "Both submitters must authenticate before either signs");
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    return Response.json({access_token:"synthetic-token",refresh_token:"synthetic-refresh",expires_in:300,refresh_expires_in:3600,token_type:"Bearer",scope:""});
  }
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
  polls++;
  if (process.env.MOCK_MODE === "pending" && polls === 1) return Response.json({}, {status:404});
  return Response.json({clave:process.env.MOCK_MODE === "wrong-clave" ? "0".repeat(50) : clave,fecha:new Date().toISOString(),"ind-estado":process.env.MOCK_MODE === "pending" && polls === 2 ? "procesando" : process.env.MOCK_MODE === "rejected" ? "rechazado" : process.env.MOCK_MODE === "error" ? "error" : "aceptado","respuesta-xml":Buffer.from("<MensajeHacienda><DetalleMensaje>Simulated response</DetalleMensaje></MensajeHacienda>").toString("base64")});
};
`,
  );
});
after(() => {
  if (stage) rmSync(stage, { recursive: true, force: true });
});

function runOptions(mode, directory) {
  return {
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
  };
}

function run(args, mode = "accepted", directory = "") {
  const result = spawnSync(
    process.execPath,
    ["--import", join(stage, "mock.mjs"), example, ...args],
    runOptions(mode, directory),
  );
  if (result.error) throw result.error;
  return result;
}

function runAsync(args, mode, directory) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", join(stage, "mock.mjs"), example, ...args],
      runOptions(mode, directory),
    );
    let stderr = "";
    child.stdout.resume();
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stderr }));
  });
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

test("unsupported or mistyped order fields fail before allocating a sequence", () => {
  prepare("invalid-input-baseline");
  const cases = [
    [
      "currency",
      (value) => {
        value.resumenFactura = { codigoTipoMoneda: { codigoMoneda: "USD", tipoCambio: 500 } };
      },
      /order.resumenFactura/,
    ],
    [
      "line-field",
      (value) => {
        value.lineItems[0].unidadMedidaComercial = "Hora";
      },
      /lineItems.0.unidadMedidaComercial/,
    ],
    [
      "classification",
      (value) => {
        value.lineItems[0].esServicio = "false";
      },
      /esServicio must be a boolean/,
    ],
    [
      "tax-field",
      (value) => {
        value.lineItems[0].impuesto[0].factorCalculoIVA = 1;
      },
      /impuesto.0.factorCalculoIVA/,
    ],
    [
      "special-tax",
      (value) => {
        value.lineItems[0].impuesto[0].codigo = "08";
      },
      /ordinary IVA/,
    ],
    [
      "exoneration-field",
      (value) => {
        value.lineItems[0].impuesto[0].exoneracion = { articulo: 1 };
      },
      /exoneracion.articulo/,
    ],
  ];
  const counter = join(stage, ".sandbox-sequences", "02-3101234567", "sequences.json");
  const previousCounter = readFileSync(counter, "utf8");
  const previousLog = networkLog();
  for (const [name, mutate, message] of cases) {
    const value = JSON.parse(readFileSync(order, "utf8"));
    mutate(value);
    const input = join(stage, `${name}.json`);
    const directory = join(stage, `invalid-${name}`);
    writeFileSync(input, JSON.stringify(value));
    const result = run(["prepare", input, directory]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.equal(existsSync(directory), false);
    assert.equal(readFileSync(counter, "utf8"), previousCounter);
    assert.equal(networkLog(), previousLog);
  }
});

test("supported discount, merchandise classification and other payment survive preparation", () => {
  const value = JSON.parse(readFileSync(order, "utf8"));
  value.medioPago = "99";
  value.medioPagoOtros = "Pago de ejemplo";
  value.lineItems[0].esServicio = false;
  value.lineItems[0].descuento = [
    { montoDescuento: 1000, codigoDescuento: "07", naturalezaDescuento: "Descuento de ejemplo" },
  ];
  const input = join(stage, "supported.json");
  const directory = join(stage, "supported");
  writeFileSync(input, JSON.stringify(value));
  const previousLog = networkLog();
  const result = run(["prepare", input, directory]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(networkLog(), previousLog);
  const invoice = JSON.parse(readFileSync(join(directory, "invoice.json"), "utf8"));
  assert.equal(invoice.detalleServicio[0].esServicio, false);
  assert.deepEqual(invoice.detalleServicio[0].descuento, value.lineItems[0].descuento);
  assert.equal(invoice.resumenFactura.totalServGravados, 0);
  assert.equal(invoice.resumenFactura.totalMercanciasGravadas, 100000);
  assert.equal(invoice.resumenFactura.totalComprobante, 111870);
  assert.deepEqual(invoice.resumenFactura.medioPago, [
    { tipoMedioPago: "99", medioPagoOtros: "Pago de ejemplo", totalMedioPago: 111870 },
  ]);
});

test("a partial signing snapshot blocks submission before authentication", () => {
  for (const file of ["signed.xml", "request.json", "attempt.json"]) {
    const { directory, invoice } = prepare(`partial-${file}`);
    const contents = file === "request.json" ? JSON.stringify({ clave: invoice.clave }) : "partial";
    writeFileSync(join(directory, file), contents);
    const previousLog = networkLog();
    const result = run(["submit", directory]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /snapshot already exists/);
    assert.equal(networkLog(), previousLog);
    assert.equal(readFileSync(join(directory, file), "utf8"), contents);
  }
});

test("a status for another clave cannot be recorded as this invoice's result", () => {
  const { directory } = prepare("wrong-clave");
  const previousLog = networkLog();
  const result = run(["submit", directory], "wrong-clave", directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not match the saved clave/);
  assert.equal(existsSync(join(directory, "result.json")), false);
  assert.equal(
    networkLog()
      .slice(previousLog.length)
      .match(/^POST .*recepcion-sandbox/gm)?.length,
    1,
  );
  const status = run(["status", directory], "wrong-clave", directory);
  assert.equal(status.status, 1);
  assert.match(status.stderr, /does not match the saved clave/);
  assert.equal(existsSync(join(directory, "status.json")), false);
  assert.equal(run(["status", directory], "accepted", directory).status, 0);
});

test("indexing delay and processing continue on the same submitted identity", () => {
  const { directory, invoice } = prepare("pending");
  const previousLog = networkLog();
  const result = run(["submit", directory], "pending", directory);
  assert.equal(result.status, 0, result.stderr);
  const terminal = JSON.parse(readFileSync(join(directory, "result.json"), "utf8"));
  assert.equal(terminal.clave, invoice.clave);
  assert.equal(terminal.pollAttempts, 3);
  assert.equal(terminal.accepted, true);
  const log = networkLog().slice(previousLog.length);
  assert.equal(log.match(/^POST .*recepcion-sandbox/gm)?.length, 1);
  assert.equal(log.match(new RegExp(`^GET .*${invoice.clave}$`, "gm"))?.length, 3);
});

test("two submitters that both pass the initial guard send only once", async () => {
  const { directory } = prepare("concurrent");
  const previousLog = networkLog();
  const results = await Promise.all([
    runAsync(["submit", directory], "concurrent", directory),
    runAsync(["submit", directory], "concurrent", directory),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [0, 1], JSON.stringify(results));
  assert.equal(
    networkLog()
      .slice(previousLog.length)
      .match(/^POST .*recepcion-sandbox/gm)?.length,
    1,
  );
  assert.equal(JSON.parse(readFileSync(join(directory, "result.json"), "utf8")).accepted, true);
});
