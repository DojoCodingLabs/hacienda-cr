import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { runCheck } from "./lib/check-core.mjs";
import { correctPolicyIdentifier } from "./lib/discover.mjs";
import { runUpdate } from "./lib/update-core.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (value) => Buffer.byteLength(value);

const ATV = {
  id: "atv",
  url: "https://atv.example/ATV/frmAnexos.aspx",
  base: "https://atv.example/ATV/",
  type: "atv-page",
};
const OVI = {
  id: "ovi",
  baseUrl: "https://www.hacienda.example/docs/",
  type: "known-file-probe",
};
const CDN = { id: "cdn", url: "https://cdn.example/", type: "cdn-xml-schemas" };

const CURRENT = "2024/v4.4";
const NEXT = "2026/v4.4";
const RESOLUCION =
  "Resolucion_General_sobre_disposiciones_tecnicas_comprobantes_electronicos_para_efectos_tributarios.pdf";
const MIN = { "atv-page": 2 };
const DEFAULT_LM = "Wed, 01 Jan 2026 00:00:00 GMT";

const cdnPolicyUrl = (basename) => `${CDN.url}xml-schemas/${encodeURIComponent(basename)}`;

function atvUrl(year, version, basename) {
  return `${ATV.base}docs/esquemas/${year}/v${version}/${encodeURIComponent(basename)}`;
}
function oviUrl(basename) {
  return `${OVI.baseUrl}${encodeURIComponent(basename)}`;
}

function entry(set, year, version, surface, basename, content) {
  return { set, year, version, surface, basename, content };
}

function baseFiles() {
  return [
    entry(CURRENT, 2024, "4.4", "atv", "FacturaElectronica_V4.4.xsd", "atv-factura"),
    entry(CURRENT, 2024, "4.4", "atv", "MensajeHacienda_V4.4.xsd", "atv-mensaje"),
    entry(CURRENT, 2024, "4.4", "atv", "ANEXOS Y ESTRUCTURAS_V4.4.pdf", "atv-anexos"),
    entry(CURRENT, 2024, "4.4", "atv", "Codigodemoneda_V4.4.pdf", "atv-money"),
    entry(CURRENT, 2024, "4.4", "atv", "Codificacionubicacion_V4.4.rar", "atv-loc"),
    entry(CURRENT, 2024, "4.4", "atv", RESOLUCION, "atv-resolucion"),
    entry(NEXT, 2026, "4.4", "ovi", "FacturaElectronica_V4.4.xsd", "ovi-factura"),
    entry(NEXT, 2026, "4.4", "ovi", "MensajeHacienda_V4.4.xsd", "ovi-mensaje"),
  ];
}

function urlFor(file) {
  return file.surface === "atv"
    ? atvUrl(file.year, file.version, file.basename)
    : oviUrl(file.basename);
}

function ok(body, headers = {}) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => headers[name.toLowerCase()] ?? null,
    },
    arrayBuffer: async () => Buffer.from(body),
  };
}
function failure(status) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    arrayBuffer: async () => Buffer.alloc(0),
  };
}

function anchor(url, text = url) {
  return `<a href="${url}">${text}</a>`;
}

function scenario({
  files = baseFiles(),
  serve = {},
  extra = {},
  links = {},
  omit = [],
  html = {},
  policy = {},
  surfaceFailures = {},
  probe = {},
  sets = [
    { id: CURRENT, year: 2024, version: "4.4", sourceSurface: "atv", current: true },
    { id: NEXT, year: 2026, version: "4.4", sourceSurface: "ovi" },
  ],
} = {}) {
  const routes = new Map();
  const manifestFiles = [];
  for (const file of files) {
    const url = urlFor(file);
    if (!probe.omit?.includes(file.basename)) routes.set(url, file.content);
    const manifestFile = {
      path: `${file.set}/${file.basename}`,
      set: file.set,
      sha256: sha(file.content),
      bytes: bytes(file.content),
      vendored: true,
    };
    if (probe.baseline && file.surface === "ovi") manifestFile.lastModified = DEFAULT_LM;
    manifestFiles.push(manifestFile);
  }

  const defaultLinks = { atv: [] };
  for (const file of files) {
    if (omit.includes(file.basename)) continue;
    if (file.surface === "atv") defaultLinks.atv.push(urlFor(file));
  }
  const atvLinks = [...defaultLinks.atv, ...(links.atv ?? [])];
  const atvHtml =
    html.atv ?? `<html><body>${atvLinks.map((url) => anchor(url)).join("\n")}</body></html>`;

  const policyBasename = policy.basename ?? RESOLUCION;
  const policyMatch = files.find((file) => file.basename === policyBasename);
  const policyContent = policy.content ?? policyMatch?.content ?? "policy-bytes";
  routes.set(cdnPolicyUrl(policyBasename), policyContent);

  for (const [url, content] of Object.entries({ ...extra, ...serve })) routes.set(url, content);

  const oviKnownFiles = [
    ...files.filter((file) => file.surface === "ovi").map((file) => file.basename),
    ...(probe.knownFiles ?? []),
  ];

  const calls = [];
  const gets = [];
  const headHeaders = (url, content) => ({
    "content-length": String(bytes(content)),
    "last-modified": probe.headLastModified?.[url] ?? DEFAULT_LM,
  });
  const fetchFn = async (url, options = {}) => {
    const method = options.method ?? "GET";
    calls.push(url);
    if (method === "GET") gets.push(url);
    if (surfaceFailures.atv && url.startsWith(ATV.base)) return failure(surfaceFailures.atv);
    if (surfaceFailures.ovi && url.startsWith(OVI.baseUrl)) return failure(surfaceFailures.ovi);
    if (surfaceFailures.cdn && url.startsWith(CDN.url)) return failure(surfaceFailures.cdn);
    if (method === "HEAD" && url.startsWith(OVI.baseUrl)) {
      if (probe.head405) return failure(405);
      if (!routes.has(url)) return failure(404);
      return ok(routes.get(url), headHeaders(url, routes.get(url)));
    }
    if (method === "HEAD") return failure(405);
    if (url === ATV.url) return ok(atvHtml);
    if (routes.has(url)) {
      return ok(routes.get(url), headHeaders(url, routes.get(url)));
    }
    return failure(404);
  };

  const current = sets.find((set) => set.current);
  const next = sets.find((set) => !set.current && set.id !== current.id);
  const manifest = {
    schemaVersion: 1,
    lastSyncedAt: "2026-01-01",
    currentSet: current.id,
    surfaces: [
      { id: ATV.id, url: ATV.url, type: ATV.type },
      { id: OVI.id, baseUrl: OVI.baseUrl, type: OVI.type, knownFiles: oviKnownFiles },
      { id: CDN.id, url: CDN.url, type: CDN.type },
    ],
    sets: sets.map(({ current: _current, ...set }) => ({ ...set, downloadedAt: "2026-01-01" })),
    policy: {
      identifier: `${CDN.url}xmlschemas/${encodeURIComponent(policyBasename)}`,
      digestMethod: "http://www.w3.org/2001/04/xmlenc#sha256",
      digestValue: "x=",
      sourceSurface: "cdn",
    },
    files: manifestFiles,
  };
  if (next) manifest.nextSet = { id: next.id, effectiveFrom: "2026-11-01" };

  return { manifest, fetchFn, calls, gets, routes };
}

async function check(config) {
  const world = scenario(config);
  const result = await runCheck({
    manifest: world.manifest,
    fetchFn: world.fetchFn,
    minLinks: config?.minLinks ?? MIN,
  });
  return { ...world, result };
}

test("policy identifier errata is corrected", () => {
  assert.equal(
    correctPolicyIdentifier("https://cdn.example/xmlschemas/Resolucion.pdf"),
    "https://cdn.example/xml-schemas/Resolucion.pdf",
  );
});

test("sin diferencias -> sin cambios y código 0", async () => {
  const { result } = await check();
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.equal(result.stdout, "spec:check: sin cambios\n");
});

test("el informe ordena las cuatro categorías 1..4 y clasifica cada hallazgo", async () => {
  const world = scenario({
    files: [
      ...baseFiles(),
      entry(CURRENT, 2024, "4.4", "atv", "Anexo_Extra_V4.4.pdf", "atv-extra"),
    ],
    omit: ["Anexo_Extra_V4.4.pdf"],
    serve: { [atvUrl(2024, "4.4", "FacturaElectronica_V4.4.xsd")]: "atv-factura-NEW" },
    links: {
      atv: [
        atvUrl(2024, "4.5", "FacturaElectronica_V4.5.xsd"),
        atvUrl(2024, "4.4", "Nuevo_V4.4.xsd"),
      ],
    },
    extra: { [atvUrl(2024, "4.4", "Nuevo_V4.4.xsd")]: "nuevo" },
  });
  const result = await runCheck({
    manifest: world.manifest,
    fetchFn: world.fetchFn,
    minLinks: MIN,
  });
  assert.equal(result.code, 1);
  const order = [
    result.stdout.indexOf("1. Versión nueva publicada"),
    result.stdout.indexOf("2. Hash distinto en el set vigente o el sondeo"),
    result.stdout.indexOf("3. Archivos agregados o eliminados"),
  ];
  assert.ok(
    order.every((index) => index >= 0) && order[0] < order[1] && order[1] < order[2],
    result.stdout,
  );
  assert.match(result.stdout, /FacturaElectronica_V4\.5\.xsd\s+versión=4\.5/);
  assert.match(
    result.stdout,
    /FacturaElectronica_V4\.4\.xsd\s+sha256 esperado=[0-9a-f]{64} obtenido=[0-9a-f]{64}/,
  );
  assert.match(result.stdout, /Nuevo_V4\.4\.xsd\s+agregado\s+superficie atv/);
  assert.match(result.stdout, /Anexo_Extra_V4\.4\.pdf\s+eliminado\s+superficie atv/);
  assert.ok(!result.stdout.includes("4. Cambio en auxiliares"), result.stdout);
});

test("un auxiliar cambiado va en la sección 4 y no en la 2", async () => {
  const { result } = await check({
    serve: { [atvUrl(2024, "4.4", "Codigodemoneda_V4.4.pdf")]: "atv-money-NEW" },
  });
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /4\. Cambio en auxiliares/);
  assert.match(result.stdout, /Codigodemoneda_V4\.4\.pdf/);
  assert.ok(!result.stdout.includes("2. Hash distinto"), result.stdout);
});

test("un cambio en la Resolución va en la sección 2 con revisión prioritaria", async () => {
  const { result } = await check({
    serve: { [cdnPolicyUrl(RESOLUCION)]: "atv-resolucion-NEW" },
  });
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /2\. Hash distinto en el set vigente o el sondeo/);
  assert.match(result.stdout, /Resolucion_General.*\[revisión humana prioritaria\]/);
});

test("un archivo vigilado ausente no canario va en la sección 3", async () => {
  const { result } = await check({
    files: [
      ...baseFiles(),
      entry(CURRENT, 2024, "4.4", "atv", "Anexo_Extra_V4.4.pdf", "atv-extra"),
    ],
    omit: ["Anexo_Extra_V4.4.pdf"],
  });
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /3\. Archivos agregados o eliminados/);
  assert.match(result.stdout, /Anexo_Extra_V4\.4\.pdf\s+eliminado/);
});

test("la versión se toma de la ruta y se ignoran id y title", async () => {
  const links = baseFiles()
    .filter((file) => file.surface === "atv")
    .map((file) => anchor(urlFor(file)));
  links.push(
    `<a id="version_43" title="zip" href="${atvUrl(2024, "4.4", "FacturaElectronica_V4.4.xsd")}">Factura</a>`,
  );
  const { result } = await check({
    html: { atv: `<html><body>${links.join("\n")}</body></html>` },
  });
  assert.equal(result.code, 0, result.stdout + result.stderr);
});

test("la comparación de versiones es numérica: 4.10 > 4.9", async () => {
  const world = scenario({
    sets: [{ id: "2024/v4.9", year: 2024, version: "4.9", sourceSurface: "atv", current: true }],
    files: [
      entry("2024/v4.9", 2024, "4.9", "atv", "FacturaElectronica_V4.9.xsd", "v49"),
      entry("2024/v4.9", 2024, "4.9", "atv", "ANEXOS Y ESTRUCTURAS_V4.9.pdf", "anexos-49"),
    ],
    links: { atv: [atvUrl(2024, "4.10", "FacturaElectronica_V4.10.xsd")] },
    extra: { [atvUrl(2024, "4.10", "FacturaElectronica_V4.10.xsd")]: "v410" },
  });
  const result = await runCheck({
    manifest: world.manifest,
    fetchFn: world.fetchFn,
    minLinks: { "atv-page": 1 },
  });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /1\. Versión nueva publicada/);
  assert.match(result.stdout, /versión=4\.10/);
});

test("las versiones anteriores a la vigente no se descargan ni se reportan", async () => {
  const oldUrl = atvUrl(2016, "4.1", "Viejo_V4.1.xsd");
  const world = await check({ links: { atv: [oldUrl] }, extra: { [oldUrl]: "viejo" } });
  assert.equal(world.result.code, 0, world.result.stdout + world.result.stderr);
  assert.ok(!world.gets.includes(oldUrl), "no debe descargar una versión anterior");
  assert.ok(!world.result.stdout.includes("4.1"));
});

test("una versión nueva publicada en la página ATV se reporta aunque el sondeo OVi no la conozca", async () => {
  const { result } = await check({
    links: { atv: [atvUrl(2024, "4.5", "FacturaElectronica_V4.5.xsd")] },
    extra: { [atvUrl(2024, "4.5", "FacturaElectronica_V4.5.xsd")]: "schema-4.5" },
  });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /versión=4\.5/);
});

test("un auxiliar con versión nueva se reporta aunque los XSD sigan en 4.4", async () => {
  const { result } = await check({
    links: {
      atv: [
        atvUrl(2024, "4.5", "Codigodemoneda_V4.5.pdf"),
        atvUrl(2024, "4.5", "Codificacionubicacion_V4.5.rar"),
      ],
    },
    extra: {
      [atvUrl(2024, "4.5", "Codigodemoneda_V4.5.pdf")]: "money-4.5",
      [atvUrl(2024, "4.5", "Codificacionubicacion_V4.5.rar")]: "loc-4.5",
    },
  });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /Codigodemoneda_V4\.5\.pdf\s+versión=4\.5/);
  assert.match(result.stdout, /Codificacionubicacion_V4\.5\.rar\s+versión=4\.5/);
});

test("el sondeo sin línea base descarga y reporta un hash distinto de cualquier set", async () => {
  const { result } = await check({
    serve: { [oviUrl("FacturaElectronica_V4.4.xsd")]: "ovi-factura-NEW" },
  });
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /2\. Hash distinto en el set vigente o el sondeo/);
  assert.match(
    result.stdout,
    /2026\/v4\.4\/FacturaElectronica_V4\.4\.xsd\s+sha256 esperado=[0-9a-f]{64} obtenido=[0-9a-f]{64}/,
  );
});

test("validadores coincidentes no obligan a descargar", async () => {
  const world = await check({ probe: { baseline: true } });
  assert.equal(world.result.code, 0, world.result.stdout + world.result.stderr);
  for (const file of baseFiles().filter((item) => item.surface === "ovi")) {
    assert.ok(!world.gets.includes(oviUrl(file.basename)), `no debe descargar ${file.basename}`);
    assert.ok(world.calls.includes(oviUrl(file.basename)), `debe sondear ${file.basename}`);
  }
});

test("validador distinto obliga a descargar y hashear", async () => {
  const url = oviUrl("FacturaElectronica_V4.4.xsd");
  const { result } = await check({
    probe: { baseline: true, headLastModified: { [url]: "Thu, 02 Jan 2026 00:00:00 GMT" } },
    serve: { [url]: "ovi-factura-NEW" },
  });
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /2\. Hash distinto en el set vigente o el sondeo/);
});

test("un knownFiles sin entrada en files[] se reporta como agregado", async () => {
  const { result } = await check({
    probe: { knownFiles: ["Nuevo_V4.5.xsd"] },
    extra: { [oviUrl("Nuevo_V4.5.xsd")]: "ovi-nuevo" },
  });
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /3\. Archivos agregados o eliminados/);
  assert.match(result.stdout, /Nuevo_V4\.5\.xsd\s+agregado\s+superficie ovi/);
});

test("el sondeo no descubre archivos no declarados", async () => {
  const hidden = oviUrl("Oculto_V4.4.xsd");
  const { result, gets, calls } = await check({ extra: { [hidden]: "oculto" } });
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.ok(!gets.includes(hidden), "no debe descargar archivos no declarados");
  assert.ok(!calls.includes(hidden), "no debe sondear archivos no declarados");
});

test("un HEAD 405 cae a GET", async () => {
  const world = await check({ probe: { head405: true, baseline: true } });
  assert.equal(world.result.code, 0, world.result.stdout + world.result.stderr);
  assert.ok(world.gets.includes(oviUrl("FacturaElectronica_V4.4.xsd")));
});

test("canario: parseo vacío", async () => {
  const { result } = await check({ html: { atv: "<html><body>sin enlaces</body></html>" } });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /superficie atv: parseo vacío/);
  assert.equal(result.stdout, "");
});

test("canario: menos enlaces que el mínimo", async () => {
  const { result } = await check({
    html: { atv: anchor(atvUrl(2024, "4.4", "FacturaElectronica_V4.4.xsd")) },
    minLinks: { "atv-page": 2 },
  });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /superficie atv: 1 enlaces, mínimo 2/);
});

test("canario: archivo conocido ausente nombra el archivo", async () => {
  const { result } = await check({ omit: ["Codigodemoneda_V4.4.pdf"] });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /archivo conocido faltante 2024\/v4\.4\/Codigodemoneda_V4\.4\.pdf/);
});

test("canario: superficie inaccesible nombra la superficie", async () => {
  const { result } = await check({ surfaceFailures: { ovi: 503 } });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /superficie ovi: inaccesible/);
});

test("canario: un knownFiles sin 200 hace fallar el sondeo", async () => {
  const { result } = await check({ probe: { omit: ["MensajeHacienda_V4.4.xsd"] } });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /superficie ovi: archivo sin responder MensajeHacienda_V4\.4\.xsd/);
  assert.equal(result.stdout, "");
});

test("spec:check no modifica el manifiesto real", async () => {
  const realManifest = resolve(
    import.meta.dirname,
    "..",
    "..",
    "packages",
    "sdk",
    "schemas",
    "manifest.json",
  );
  const before = readFileSync(realManifest);
  const beforeStat = statSync(realManifest);
  await check();
  assert.deepEqual(readFileSync(realManifest), before);
  assert.equal(statSync(realManifest).mtimeMs, beforeStat.mtimeMs);
});

function tree(t, files) {
  const dir = mkdtempSync(join(tmpdir(), "spec-watch-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const file of files) {
    const target = join(dir, `${file.set}/${file.basename}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  return dir;
}

function persisted(dir) {
  return JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
}

test("descarga idéntica actualiza fechas, no reescribe y ejecuta el gate", async (t) => {
  const files = baseFiles();
  const world = scenario({ files });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  let gateCalls = 0;
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    now: new Date("2026-12-25T00:00:00Z"),
    verifyFn: () => {
      gateCalls += 1;
    },
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(gateCalls, 1);
  for (const file of files) {
    assert.equal(readFileSync(join(dir, `${file.set}/${file.basename}`), "utf8"), file.content);
  }
  const written = persisted(dir);
  assert.equal(written.lastSyncedAt, "2026-12-25");
  assert.equal(written.sets.find((set) => set.id === CURRENT).downloadedAt, "2026-12-25");
  assert.equal(written.currentSet, CURRENT);
});

test("un cambio real actualiza el archivo y su hash/tamaño en el manifiesto", async (t) => {
  const files = baseFiles();
  const world = scenario({
    files,
    serve: { [atvUrl(2024, "4.4", "FacturaElectronica_V4.4.xsd")]: "atv-factura-NEW" },
  });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    verifyFn: () => {},
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(
    readFileSync(join(dir, `${CURRENT}/FacturaElectronica_V4.4.xsd`), "utf8"),
    "atv-factura-NEW",
  );
  const entryAfter = persisted(dir).files.find(
    (file) => file.path === `${CURRENT}/FacturaElectronica_V4.4.xsd`,
  );
  assert.equal(entryAfter.sha256, sha("atv-factura-NEW"));
  assert.equal(entryAfter.bytes, bytes("atv-factura-NEW"));
});

test("un archivo nuevo del set vigente se vendoriza en la misma corrida", async (t) => {
  const files = baseFiles();
  const newUrl = atvUrl(2024, "4.4", "Nuevo_V4.4.xsd");
  const world = scenario({ files, links: { atv: [newUrl] }, extra: { [newUrl]: "nuevo" } });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    verifyFn: () => {
      assert.ok(existsSync(join(dir, `${CURRENT}/Nuevo_V4.4.xsd`)));
    },
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(readFileSync(join(dir, `${CURRENT}/Nuevo_V4.4.xsd`), "utf8"), "nuevo");
  const entryAfter = persisted(dir).files.find((file) => file.path === `${CURRENT}/Nuevo_V4.4.xsd`);
  assert.ok(entryAfter);
  assert.equal(entryAfter.sha256, sha("nuevo"));
});

test("una derivada detectada por sondeo se vendoriza sin tocar currentSet y registra lastModified", async (t) => {
  const files = baseFiles();
  const world = scenario({
    files,
    serve: { [oviUrl("FacturaElectronica_V4.4.xsd")]: "ovi-factura-NEW" },
  });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    verifyFn: () => {},
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(
    readFileSync(join(dir, `${NEXT}/FacturaElectronica_V4.4.xsd`), "utf8"),
    "ovi-factura-NEW",
  );
  const written = persisted(dir);
  const entryAfter = written.files.find(
    (file) => file.path === `${NEXT}/FacturaElectronica_V4.4.xsd`,
  );
  assert.equal(entryAfter.sha256, sha("ovi-factura-NEW"));
  assert.equal(entryAfter.bytes, bytes("ovi-factura-NEW"));
  assert.equal(entryAfter.lastModified, DEFAULT_LM);
  assert.equal(written.currentSet, CURRENT);
});

test("un archivo vigilado ausente impide la escritura", async (t) => {
  const files = [...baseFiles(), entry(CURRENT, 2024, "4.4", "atv", "Anexo_Extra_V4.4.pdf", "x")];
  const world = scenario({ files, omit: ["Anexo_Extra_V4.4.pdf"] });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const manifestBefore = readFileSync(join(dir, "manifest.json"), "utf8");
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    verifyFn: () => {},
  });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /archivo vigilado ausente/);
  assert.equal(readFileSync(join(dir, "manifest.json"), "utf8"), manifestBefore);
});

test("canario fallido no escribe nada ni ejecuta el gate", async (t) => {
  const files = baseFiles();
  const world = scenario({
    files,
    serve: { [atvUrl(2024, "4.4", "FacturaElectronica_V4.4.xsd")]: "atv-factura-NEW" },
  });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const manifestBefore = readFileSync(join(dir, "manifest.json"), "utf8");
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: { "atv-page": 999 },
    verifyFn: () => assert.fail("el gate no debe ejecutarse"),
  });
  assert.equal(result.code, 2);
  assert.equal(readFileSync(join(dir, "manifest.json"), "utf8"), manifestBefore);
  assert.equal(
    readFileSync(join(dir, `${CURRENT}/FacturaElectronica_V4.4.xsd`), "utf8"),
    "atv-factura",
  );
});

test("un knownFiles sin 200 durante spec:update no escribe nada", async (t) => {
  const files = baseFiles();
  const world = scenario({ files, probe: { omit: ["MensajeHacienda_V4.4.xsd"] } });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const manifestBefore = readFileSync(join(dir, "manifest.json"), "utf8");
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    verifyFn: () => assert.fail("el gate no debe ejecutarse"),
  });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /superficie ovi: archivo sin responder/);
  assert.equal(readFileSync(join(dir, "manifest.json"), "utf8"), manifestBefore);
});

test("--set válido mueve currentSet y elimina nextSet", async (t) => {
  const files = baseFiles();
  const world = scenario({ files });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const result = await runUpdate({
    manifest: world.manifest,
    schemasDir: dir,
    fetchFn: world.fetchFn,
    minLinks: MIN,
    setFlag: NEXT,
    verifyFn: () => {},
  });
  assert.equal(result.code, 0, result.stderr);
  const written = persisted(dir);
  assert.equal(written.currentSet, NEXT);
  assert.ok(!("nextSet" in written));
});

test("--set desconocido falla sin escribir", async (t) => {
  const files = baseFiles();
  const world = scenario({ files });
  const dir = tree(t, files);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(world.manifest, null, 2)}\n`);
  const manifestBefore = readFileSync(join(dir, "manifest.json"), "utf8");
  await assert.rejects(
    runUpdate({
      manifest: world.manifest,
      schemasDir: dir,
      fetchFn: world.fetchFn,
      minLinks: MIN,
      setFlag: "1999/v9.9",
      verifyFn: () => {},
    }),
    /set desconocido/,
  );
  assert.equal(readFileSync(join(dir, "manifest.json"), "utf8"), manifestBefore);
});
