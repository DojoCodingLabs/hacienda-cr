import assert from "node:assert/strict";
import test from "node:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generate } from "./generate.mjs";
import { TABLE_MAP } from "./table-map.mjs";

const extractPath = new URL("../codes-extract/extract.mjs", import.meta.url).pathname;

function scratch() {
  return mkdtempSync(join(tmpdir(), "codes-generate-"));
}

function syntheticFixture(dir) {
  const codesPath = join(dir, "codes.json");
  writeFileSync(
    codesPath,
    JSON.stringify({
      tables: [
        {
          key: "Demo/Tipo",
          kind: "element-anonymous",
          values: [
            { code: "01", description: "Uno" },
            { code: "02", description: "Dos" },
          ],
        },
      ],
    }),
  );
  const tableMap = [
    {
      tableKeys: ["Demo/Tipo"],
      exportName: "Demo",
      shape: "object",
      keys: { "01": "UNO", "02": "DOS" },
      namesFrom: null,
    },
  ];
  return { codesPath, tableMap };
}

function snapshot(dir) {
  return Object.fromEntries(
    readdirSync(dir)
      .sort()
      .map((file) => [file, readFileSync(join(dir, file), "utf8")]),
  );
}

test("render-only contra el catalogo real: idempotente, cabecera y barrel alfabetico", async () => {
  const outDir = scratch();
  try {
    const first = await generate({ noExtract: true, outDir });
    assert.equal(first.written, TABLE_MAP.length + 1, "un archivo por export mas el barrel");
    assert.ok(first.pairs > 0);
    assert.ok(
      first.unpaired.includes("UnidadMedidaType"),
      "la deriva U+03A9/U+2126 queda reportada",
    );
    assert.ok(
      first.pendingNames.includes("PaymentMethod"),
      "sin names.json todo queda pendiente de nombre",
    );
    const before = snapshot(outDir);
    await generate({ noExtract: true, outDir });
    assert.deepEqual(snapshot(outDir), before, "la segunda corrida no cambia nada");
    for (const [file, source] of Object.entries(before))
      assert.ok(
        source.startsWith("// NO EDITAR"),
        `${file}: cabecera NO EDITAR en la primera linea`,
      );
    assert.deepEqual(
      [...before["index.ts"].matchAll(/\.\/([a-z-]+)\.js/g)].map((match) => match[1]),
      [...before["index.ts"].matchAll(/\.\/([a-z-]+)\.js/g)].map((match) => match[1]).toSorted(),
      "el barrel lista los archivos en orden alfabetico",
    );
    assert.ok(before["currency-codes.ts"].includes('"AED"'), "arrays de moneda generados");
    assert.ok(before["payment-method.ts"].includes('TARJETA: "02"'), "objetos con clave y codigo");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("un codes.json ilegible termina en error sin escribir nada", async () => {
  const outDir = scratch();
  try {
    writeFileSync(join(outDir, "sentinel.ts"), "// intacto\n");
    await assert.rejects(
      generate({ noExtract: true, outDir, codesPath: join(outDir, "inexistente.json") }),
      /no se pudo leer el catálogo/,
    );
    assert.deepEqual(readdirSync(outDir), ["sentinel.ts"], "sin escritura parcial");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("la paridad falla nombrando tabla y codigo en ambos sentidos", async () => {
  const dir = scratch();
  try {
    const { codesPath } = syntheticFixture(dir);
    const outDir = join(dir, "out");
    const sinClave = [
      {
        tableKeys: ["Demo/Tipo"],
        exportName: "Demo",
        shape: "object",
        keys: { "01": "UNO" },
        namesFrom: null,
      },
    ];
    await assert.rejects(
      generate({ noExtract: true, outDir, codesPath, tableMap: sinClave }),
      /Demo\/Tipo.*sin clave en table-map.*"02"/s,
    );
    const sinCodigo = [
      {
        tableKeys: ["Demo/Tipo"],
        exportName: "Demo",
        shape: "object",
        keys: { "01": "UNO", "02": "DOS", "03": "TRES" },
        namesFrom: null,
      },
    ];
    await assert.rejects(
      generate({ noExtract: true, outDir, codesPath, tableMap: sinCodigo }),
      /declara clave\(s\) sin código.*"03"/s,
    );
    await assert.rejects(
      generate({
        noExtract: true,
        outDir,
        codesPath,
        tableMap: [{ ...sinClave[0], tableKeys: ["Tabla/Inexistente"] }],
      }),
      /tableKey inexistente/,
    );
    assert.ok(!existsSync(outDir), "ninguna falla de paridad escribe");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("names.json: presente genera *_NAMES, incompleto nombra codigo, ausente informa", async () => {
  const dir = scratch();
  try {
    const { codesPath, tableMap } = syntheticFixture(dir);
    const namesPath = join(dir, "names.json");
    const withNames = [{ ...tableMap[0], namesFrom: "names.json" }];
    const outDir = join(dir, "out");

    writeFileSync(namesPath, JSON.stringify({ Demo: { "01": "Uno legible" } }));
    await assert.rejects(
      generate({ noExtract: true, outDir, codesPath, namesPath, tableMap: withNames }),
      /Demo\/Tipo.*"02"/s,
    );

    writeFileSync(
      namesPath,
      JSON.stringify({ Demo: { "01": "Uno legible", "02": "Dos legible" } }),
    );
    const report = await generate({
      noExtract: true,
      outDir,
      codesPath,
      namesPath,
      tableMap: withNames,
    });
    const demo = readFileSync(join(outDir, "demo.ts"), "utf8");
    assert.ok(demo.includes("DEMO_NAMES"), "genera la constante de nombres");
    assert.ok(
      demo.includes('[Demo.UNO]: "Uno legible"'),
      "los nombres referencian la constante generada",
    );
    assert.deepEqual(report.pendingNames, [], "sin pendientes cuando names.json cubre todo");

    const sinNames = await generate({
      noExtract: true,
      outDir,
      codesPath,
      namesPath: join(dir, "otro.json"),
      tableMap: withNames,
    });
    assert.ok(
      !readFileSync(join(outDir, "demo.ts"), "utf8").includes("_NAMES"),
      "sin names.json no genera nombres",
    );
    assert.deepEqual(sinNames.pendingNames, ["Demo"], "el informe la lista como pendiente");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("el modo completo propaga el fallo de extraccion sin escribir nada", async () => {
  const dir = scratch();
  try {
    const outDir = join(dir, "out");
    mkdirSync(outDir);
    writeFileSync(join(outDir, "sentinel.ts"), "// intacto\n");
    const emptySchemas = join(dir, "schemas-vacias");
    mkdirSync(emptySchemas);
    // sin manifest.json extract.mjs falla en validacion, antes de invocar pdftotext
    await assert.rejects(
      generate({ outDir, env: { ...process.env, CODES_EXTRACT_SCHEMAS_DIR: emptySchemas } }),
      /extracción/,
    );
    assert.deepEqual(readdirSync(outDir), ["sentinel.ts"], "sin escritura parcial ni en generated");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
