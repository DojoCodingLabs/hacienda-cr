import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const script = resolve(import.meta.dirname, "spec-verify.mjs");
const sha256 = (content) => createHash("sha256").update(content).digest("hex");

function manifestFor(files) {
  return {
    schemaVersion: 1,
    currentSet: "2024/v4.4",
    surfaces: [{ id: "atv", url: "https://atv.example/", type: "atv-page" }],
    sets: [{ id: "2024/v4.4", sourceSurface: "atv" }],
    policy: {
      identifier: "https://cdn.example/policy.pdf",
      digestMethod: "http://www.w3.org/2001/04/xmlenc#sha256",
      digestValue: "abc=",
      sourceSurface: "atv",
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

function fixture(t, { files = [], rawManifest, extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "spec-verify-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [relativePath, content] of Object.entries(extra)) write(relativePath, content, dir);
  const body = rawManifest ?? JSON.stringify(manifestFor(files));
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
  const dir = fixture(t, {
    files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
    extra: { "2024/v4.4/FacturaElectronica.xsd": content },
  });
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^spec:verify: OK \(1 archivos verificados\)\n$/);
  assert.equal(result.stderr, "");
});

test("3.1 un byte alterado falla con ruta, esperado, obtenido y remedio git diff", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(t, {
    files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
    extra: { "2024/v4.4/FacturaElectronica.xsd": content.replace("<", "!") },
  });
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/FacturaElectronica\.xsd: sha256=[0-9a-f]{64} \(esperado\) vs sha256=[0-9a-f]{64} \(obtenido\)/,
  );
  assert.ok(result.stderr.includes("git diff"));
  assert.ok(!result.stderr.includes("spec:update"));
});

test("3.2 un archivo vendored: true ausente falla con la plantilla falta", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(t, { files: [entry("2024/v4.4/FacturaElectronica.xsd", content)] });
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
  const dir = fixture(t, {
    files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
    extra: {
      "2024/v4.4/FacturaElectronica.xsd": content,
      "2024/v4.4/suelto.txt": "no declarado",
    },
  });
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/suelto\.txt: no declarado \(allowlist en la raíz: manifest\.json, README\.md\)/,
  );
});

test("3.2 manifest.json y README.md en la raíz no declaran fallo", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(t, {
    files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
    extra: {
      "2024/v4.4/FacturaElectronica.xsd": content,
      "README.md": "# schemas",
    },
  });
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
  const dir = fixture(t, {
    files: [
      entry("2024/v4.4/FacturaElectronica.xsd", content),
      entry("2024/v4.4/futuro.xsd", "futuro", { vendored: false }),
    ],
    extra: { "2024/v4.4/FacturaElectronica.xsd": content },
  });
  const result = run(dir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /OK \(1 archivos verificados\)/);
});

test("3.2 un enlace simbólico en el árbol falla como no soportado", (t) => {
  const content = "<xsd:schema/>schema contents</xsd:schema>";
  const dir = fixture(t, {
    files: [entry("2024/v4.4/FacturaElectronica.xsd", content)],
    extra: { "2024/v4.4/FacturaElectronica.xsd": content },
  });
  symlinkSync("FacturaElectronica.xsd", join(dir, "2024/v4.4/enlace.xsd"));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /spec:verify: 2024\/v4\.4\/enlace\.xsd: enlace simbólico no soportado/,
  );
});

test("3.3 el árbol vendorizado real pasa con exit 0 y sin override", () => {
  const result = run(undefined);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^spec:verify: OK \(\d+ archivos verificados\)\n$/);
  assert.equal(result.stderr, "");
});
