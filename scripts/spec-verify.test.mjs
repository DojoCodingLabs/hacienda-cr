import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const script = resolve(import.meta.dirname, "spec-verify.mjs");
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const base64 = (content) => createHash("sha256").update(content).digest("base64");

const POLICY_PATH = "2024/v4.4/policy.pdf";
const POLICY_CONTENT = "PDF de la política vendorizado (bytes sintéticos)";
const POLICY_IDENTIFIER = "https://cdn.example/policy.pdf";
const ANEXO2_BASENAME =
  "Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf";
const ANEXO2_IDENTIFIER =
  "https://cdn.comprobanteselectronicos.go.cr/xmlschemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf";

function manifestFor(files, policy = {}) {
  return {
    schemaVersion: 1,
    currentSet: "2024/v4.4",
    surfaces: [{ id: "atv", url: "https://atv.example/", type: "atv-page" }],
    sets: [{ id: "2024/v4.4", sourceSurface: "atv" }],
    policy: {
      identifier: POLICY_IDENTIFIER,
      digestMethod: "http://www.w3.org/2001/04/xmlenc#sha256",
      digestValue: base64(POLICY_CONTENT),
      sourceSurface: "atv",
      sdkStatus: "pending-sdk-migration",
      ...policy,
    },
    files,
  };
}

function write(relativePath, content, dir) {
  const target = join(dir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function entry(relativePath, content, overrides = {}) {
  return {
    path: relativePath,
    sha256: sha256(content),
    bytes: Buffer.byteLength(content),
    vendored: true,
    ...overrides,
  };
}

function policyEntry(overrides = {}) {
  return entry(POLICY_PATH, POLICY_CONTENT, overrides);
}

// El fixture representativo siempre incluye el PDF de la política vendorizado
// (D6): sin él, los chequeos nuevos harían fallar cada test por una razón
// distinta a la que ese test quiere ejercitar.
function withPolicy({ files = [], extra = {}, ...rest } = {}) {
  return {
    files: [policyEntry(), ...files],
    extra: { [POLICY_PATH]: POLICY_CONTENT, ...extra },
    ...rest,
  };
}

function fixture(t, { files = [], rawManifest, extra = {}, policy } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "spec-verify-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [relativePath, content] of Object.entries(extra)) write(relativePath, content, dir);
  const body = rawManifest ?? JSON.stringify(manifestFor(files, policy));
  writeFileSync(join(dir, "manifest.json"), body);
  return dir;
}

function run(dir) {
  const env = { ...process.env };
  if (dir === undefined) delete env.SPEC_VERIFY_SCHEMAS_DIR;
  else env.SPEC_VERIFY_SCHEMAS_DIR = dir;
  try {
    const stdout = execFileSync(process.execPath, [script], { env, encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("3.1 árbol íntegro pasa con exit 0 y anuncia los archivos verificados", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({
      files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
      extra: { "2024/v4.4/FacturaElectronica.xsd": content },
    }),
  );
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^spec:verify: OK \(2 archivos verificados\)\n$/);
  assert.equal(result.stderr, "");
});

test("3.1 un byte alterado falla con ruta, esperado, obtenido y remedio git diff + pnpm spec:update", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({
      files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
      extra: { "2024/v4.4/FacturaElectronica.xsd": content.replace("<", "!") },
    }),
  );
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/FacturaElectronica\.xsd: sha256=[0-9a-f]{64} \(esperado\) vs sha256=[0-9a-f]{64} \(obtenido\)/,
  );
  assert.ok(result.stderr.includes("git diff"));
  assert.ok(result.stderr.includes("pnpm spec:update"));
});

test("3.2 un archivo vendored: true ausente falla con la plantilla falta", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({ files: [entry("2024/v4.4/FacturaElectronica.xsd", content)] }),
  );
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/FacturaElectronica\.xsd: falta \(esperado: sha256=[0-9a-f]{64} bytes=\d+\)/,
  );
  assert.ok(result.stderr.includes("git diff"));
});

test("3.2 un archivo no declarado en un subdirectorio falla y nombra la allowlist", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({
      files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
      extra: {
        "2024/v4.4/FacturaElectronica.xsd": content,
        "2024/v4.4/suelto.txt": "no declarado",
      },
    }),
  );
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/suelto\.txt: no declarado \(allowlist en la raíz: manifest\.json, README\.md, codes\.json\)/,
  );
});

test("3.2 manifest.json, README.md y codes.json en la raíz no declaran fallo", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({
      files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
      extra: {
        "2024/v4.4/FacturaElectronica.xsd": content,
        "README.md": "# schemas",
        "codes.json": '{"schemaVersion":1}',
      },
    }),
  );
  const result = run(dir);
  assert.equal(result.status, 0);
});

test("3.2 un manifiesto JSON inválido falla", (t) => {
  const dir = fixture(t, { rawManifest: "{ no es json" });
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /spec:verify: manifest\.json: JSON inválido:/);
  assert.ok(result.stderr.includes("git diff"));
});

test("3.2 un currentSet sin correspondencia en sets[] falla", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const manifest = manifestFor([entry("2024/v4.4/FacturaElectronica.xsd", content)]);
  manifest.currentSet = "1999/v9.9";
  const dir = fixture(t, {
    files: [],
    rawManifest: JSON.stringify(manifest),
    extra: { "2024/v4.4/FacturaElectronica.xsd": content },
  });
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /currentSet="1999\/v9\.9" sin correspondencia en sets\[\]/);
});

test("3.2 una entrada vendored: false cuyo archivo no existe no falla", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({
      files: [
        entry("2024/v4.4/FacturaElectronica.xsd", content),
        entry("2024/v4.4/futuro.xsd", "futuro", { vendored: false }),
      ],
      extra: { "2024/v4.4/FacturaElectronica.xsd": content },
    }),
  );
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /OK \(2 archivos verificados\)/);
});

test("3.2 un enlace simbólico en el árbol falla como no soportado", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(
    t,
    withPolicy({
      files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
      extra: { "2024/v4.4/FacturaElectronica.xsd": content },
    }),
  );
  symlinkSync("FacturaElectronica.xsd", join(dir, "2024/v4.4/enlace.xsd"));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/enlace\.xsd: enlace simbólico no soportado/,
  );
});

test("policy: un digestValue editado a mano hace fallar nombrando el campo", (t) => {
  const dir = fixture(t, withPolicy({ policy: { digestValue: "otro-valor" } }));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: policy\.digestValue: [A-Za-z0-9+/]{43}= \(esperado\) vs otro-valor \(obtenido\)/,
  );
  assert.ok(result.stderr.includes("pnpm spec:update no recalcula policy.*"));
});

test("policy: un digestValue sin el padding = (la forma del INDENT) hace fallar", (t) => {
  const unpadded = base64(POLICY_CONTENT).slice(0, -1);
  assert.equal(unpadded.length, 43);
  const dir = fixture(t, withPolicy({ policy: { digestValue: unpadded } }));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    new RegExp(
      `spec:verify: policy\\.digestValue: ${base64(POLICY_CONTENT)} \\(esperado\\) vs ${unpadded} \\(obtenido\\)`,
    ),
  );
});

test("policy: un PDF de política sustituido por otros bytes hace fallar su digest", (t) => {
  const dir = fixture(t, withPolicy({ extra: { [POLICY_PATH]: "otros bytes distintos" } }));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: policy\.digestValue: [A-Za-z0-9+/]{43}= \(esperado\) vs [A-Za-z0-9+/]{43}= \(obtenido\)/,
  );
});

test("policy: un digestMethod distinto de la URI SHA-256 hace fallar", (t) => {
  const dir = fixture(
    t,
    withPolicy({ policy: { digestMethod: "http://www.w3.org/2000/09/xmldsig#sha1" } }),
  );
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: policy\.digestMethod: http:\/\/www\.w3\.org\/2001\/04\/xmlenc#sha256 \(esperado\) vs http:\/\/www\.w3\.org\/2000\/09\/xmldsig#sha1 \(obtenido\)/,
  );
});

test("policy: un sdkStatus fuera del conjunto conocido hace fallar con los admitidos", (t) => {
  const dir = fixture(t, withPolicy({ policy: { sdkStatus: "migration-in-progress" } }));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: policy\.sdkStatus: valores admitidos \[pending-sdk-migration, aligned\] vs migration-in-progress \(obtenido\)/,
  );
});

test("policy: un sdkStatus ausente hace fallar como campo requerido, no por valor", (t) => {
  const dir = fixture(t, withPolicy({ policy: { sdkStatus: "" } }));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /spec:verify: manifest\.json: policy\.sdkStatus ausente o vacío/);
  assert.doesNotMatch(result.stderr, /valores admitidos/);
});

test("policy: una política no localizable con 0 candidatos hace fallar", (t) => {
  const dir = fixture(t, withPolicy({ policy: { identifier: "https://cdn.example/otro.pdf" } }));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: policy\.identifier: 0 candidatos \(esperado: exactamente 1\)/,
  );
});

test("policy: una política con más de un candidato hace fallar sin comparar digests", (t) => {
  const second = "2024/v4.5/policy.pdf";
  const dir = fixture(
    t,
    withPolicy({
      files: [entry(second, POLICY_CONTENT)],
      extra: { [second]: POLICY_CONTENT },
    }),
  );
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: policy\.identifier: 2 candidatos \(esperado: exactamente 1\)/,
  );
  assert.doesNotMatch(result.stderr, /policy\.digestValue/);
});

test("policy: un identifier percent-encoded (la forma del Anexo 2) localiza el PDF y pasa", (t) => {
  const path = `2024/v4.4/${ANEXO2_BASENAME}`;
  const dir = fixture(t, {
    files: [entry(path, POLICY_CONTENT)],
    extra: { [path]: POLICY_CONTENT },
    policy: { identifier: ANEXO2_IDENTIFIER },
  });
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /OK \(1 archivos verificados\)/);
  assert.equal(result.stderr, "");
});

test("3.3 el árbol vendorizado real pasa con exit 0 y sin override", () => {
  const result = run(undefined);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^spec:verify: OK \(\d+ archivos verificados\)\n$/);
  assert.equal(result.stderr, "");
});
