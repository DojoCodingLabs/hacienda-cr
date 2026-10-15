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
      first.corrections.some(
        (correction) =>
          correction.export === "UNITS_OF_MEASURE" && correction.kind === "replace-value",
      ),
      "la deriva U+03A9/U+2126 queda reportada como corrección sancionada",
    );
    assert.ok(
      !first.unpaired.includes("UnidadMedidaType"),
      "UnidadMedidaType ya no queda sin pareja (corrección sancionada)",
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

test("correcciones sancionadas: se aplican, se reportan y exigen cita y Changeset", async () => {
  const dir = scratch();
  try {
    const { codesPath, tableMap } = syntheticFixture(dir);
    const outDir = join(dir, "out");
    const changeset = ".changeset/a2-spec-as-data-corrections.md";
    const base = {
      report: "docs/conformity-report.md §6.2 (fila 10)",
      source: "ANEXOS V4.4 Nota 10.1 p. 74; XSD TipoExoneracionType",
      changeset,
    };

    // remove-value: la salida pierde el valor y su clave; se reporta con cita
    const conCorreccion = [
      {
        ...tableMap[0],
        corrections: [{ kind: "remove-value", code: "02", ...base }],
      },
    ];
    const report = await generate({ noExtract: true, outDir, codesPath, tableMap: conCorreccion });
    const demo = readFileSync(join(outDir, "demo.ts"), "utf8");
    assert.ok(!demo.includes('"02"'), "el valor eliminado no se genera");
    assert.equal(report.corrections.length, 1, "la corrección aplicada se reporta");
    assert.deepEqual(
      {
        table: report.corrections[0].table,
        kind: report.corrections[0].kind,
        code: report.corrections[0].code,
        report: report.corrections[0].report,
      },
      { table: "Demo/Tipo", kind: "remove-value", code: "02", report: base.report },
      "el reporte nombra tabla, tipo, código y cita",
    );

    // incompleta: falta la cita o el Changeset → falla nombrando tabla, código y campo
    for (const missing of ["report", "source", "changeset"]) {
      const correction = { kind: "remove-value", code: "02", ...base };
      delete correction[missing];
      await assert.rejects(
        generate({
          noExtract: true,
          outDir,
          codesPath,
          tableMap: [{ ...tableMap[0], corrections: [correction] }],
        }),
        new RegExp(`Demo/Tipo.*"02".*falta ${missing}`, "s"),
        `sin ${missing} falla nombrando tabla, código y campo`,
      );
    }

    // Changeset inexistente → falla nombrando la referencia
    await assert.rejects(
      generate({
        noExtract: true,
        outDir,
        codesPath,
        tableMap: [
          {
            ...tableMap[0],
            corrections: [
              { kind: "remove-value", code: "02", ...base, changeset: ".changeset/no-existe.md" },
            ],
          },
        ],
      }),
      /Demo\/Tipo.*"02".*Changeset inexistente/s,
    );

    // contradictoria: rename-key hacia una clave que no es la generada → falla
    await assert.rejects(
      generate({
        noExtract: true,
        outDir,
        codesPath,
        tableMap: [
          {
            ...tableMap[0],
            corrections: [{ kind: "rename-key", code: "01", from: "UNO", to: "OTRO", ...base }],
          },
        ],
      }),
      /Demo\/Tipo.*"01".*la clave generada no es "OTRO"/s,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("corrección sancionada replace-value en una tabla de array (homógrafo Ω)", async () => {
  const dir = scratch();
  try {
    const codesPath = join(dir, "codes.json");
    writeFileSync(
      codesPath,
      JSON.stringify({
        tables: [
          {
            key: "Demo/Unidades",
            kind: "named-simple-type",
            values: [
              { code: "\u2126", description: "ohm" },
              { code: "L", description: "litro" },
            ],
          },
        ],
      }),
    );
    const tableMap = [
      {
        tableKeys: ["Demo/Unidades"],
        exportName: "DEMO_UNITS",
        shape: "array",
        keyType: "DemoUnit",
        corrections: [
          {
            kind: "replace-value",
            code: "\u2126",
            from: "\u03a9",
            to: "\u2126",
            report: "docs/conformity-report.md §6.3 (fila 11)",
            source: "PDF Anexos Nota 15 pp. 76–79; XSD UnidadMedidaType",
            changeset: ".changeset/a2-spec-as-data-corrections.md",
          },
        ],
        namesFrom: null,
      },
    ];
    const outDir = join(dir, "out");
    const report = await generate({ noExtract: true, outDir, codesPath, tableMap });
    assert.equal(report.corrections.length, 1);
    const source = readFileSync(join(outDir, "demo-units.ts"), "utf8");
    assert.ok(source.includes("\u2126"), "emite el homógrafo del XSD (U+2126)");

    // replace-value cuyo `to` no coincide con el valor generado → falla
    await assert.rejects(
      generate({
        noExtract: true,
        outDir,
        codesPath,
        tableMap: [
          {
            ...tableMap[0],
            corrections: [
              {
                kind: "replace-value",
                code: "L",
                from: "l",
                to: "l",
                report: "x",
                source: "y",
                changeset: ".changeset/a2-spec-as-data-corrections.md",
              },
            ],
          },
        ],
      }),
      /"L".*el valor generado no es "l"/s,
    );
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
