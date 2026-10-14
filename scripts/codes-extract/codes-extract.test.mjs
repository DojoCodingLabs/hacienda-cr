import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import ExcelJS from "exceljs";
import { format, resolveConfig } from "prettier";
import { extractCodes } from "./extract.mjs";
import { buildAuxTables, mergeAuxiliary } from "./lib/aux-merge.mjs";
import { parseAnexos, parseMoneda } from "./lib/aux-pdf.mjs";
import { readXlsx } from "./lib/aux-xlsx.mjs";
import { scanXsd } from "./lib/scan.mjs";
import { mergeTables, renderCodesJson } from "./lib/render.mjs";

const extract = resolve(import.meta.dirname, "extract.mjs");
const repoRoot = resolve(import.meta.dirname, "..", "..");
const realSchemasDir = join(repoRoot, "packages", "sdk", "schemas");
const realSetDir = join(realSchemasDir, "2024", "v4.4");

function scanFixture(body, relPath = "fixture.xsd") {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">${body}</xs:schema>`;
  return scanXsd(xml, relPath);
}

test("named simpleType with enumerations becomes a table keyed by name", () => {
  const { tables } = scanFixture(`
    <xs:simpleType name="ColorType">
      <xs:annotation><xs:documentation>Colores</xs:documentation></xs:annotation>
      <xs:restriction base="xs:string">
        <xs:enumeration value="R"><xs:annotation><xs:documentation>Rojo</xs:documentation></xs:annotation></xs:enumeration>
        <xs:enumeration value="G"/>
      </xs:restriction>
    </xs:simpleType>
    <xs:element name="Raiz"><xs:complexType/></xs:element>
  `);
  assert.equal(tables.length, 1);
  assert.equal(tables[0].key, "ColorType");
  assert.equal(tables[0].kind, "named-simple-type");
  assert.equal(tables[0].description, "Colores");
  assert.deepEqual(tables[0].values, [{ code: "R", description: "Rojo" }, { code: "G" }]);
});

test("anonymous simpleType under element uses ancestor path as key", () => {
  const { tables } = scanFixture(`
    <xs:element name="Raiz">
      <xs:annotation><xs:documentation>Raiz doc</xs:documentation></xs:annotation>
      <xs:complexType>
        <xs:sequence>
          <xs:element name="Tipo" nillable="false">
            <xs:annotation><xs:documentation>Tipo id</xs:documentation></xs:annotation>
            <xs:simpleType>
              <xs:restriction base="xs:string">
                <xs:enumeration value="01"><xs:annotation><xs:documentation>Cedula</xs:documentation></xs:annotation></xs:enumeration>
              </xs:restriction>
            </xs:simpleType>
          </xs:element>
        </xs:sequence>
      </xs:complexType>
    </xs:element>
  `);
  assert.equal(tables.length, 1);
  assert.equal(tables[0].key, "Raiz/Tipo");
  assert.equal(tables[0].kind, "element-anonymous");
  assert.equal(tables[0].description, "Tipo id");
  assert.equal(tables[0].values[0].description, "Cedula");
});

test("two anonymous homonyms under different complexTypes get distinct keys", () => {
  const { tables } = scanFixture(`
    <xs:element name="Raiz"><xs:complexType/></xs:element>
    <xs:complexType name="IdentificacionType">
      <xs:sequence>
        <xs:element name="Tipo">
          <xs:simpleType><xs:restriction base="xs:string">
            <xs:enumeration value="01"/>
          </xs:restriction></xs:simpleType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
    <xs:complexType name="CodigoType">
      <xs:sequence>
        <xs:element name="Tipo">
          <xs:simpleType><xs:restriction base="xs:string">
            <xs:enumeration value="02"/>
          </xs:restriction></xs:simpleType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  `);
  assert.deepEqual(tables.map((t) => t.key).sort(), ["CodigoType/Tipo", "IdentificacionType/Tipo"]);
});

test("attribute values with slashes and unicode are kept raw", () => {
  const { tables } = scanFixture(`
    <xs:element name="Raiz"><xs:complexType/></xs:element>
    <xs:simpleType name="Unidades">
      <xs:restriction base="xs:string">
        <xs:enumeration value="1/m"/>
        <xs:enumeration value="°C"><xs:annotation><xs:documentation>grado Celsius</xs:documentation></xs:annotation></xs:enumeration>
      </xs:restriction>
    </xs:simpleType>
  `);
  assert.deepEqual(
    tables[0].values.map((v) => v.code),
    ["1/m", "°C"],
  );
});

test("case-differing codes are separate entries", () => {
  const { tables } = scanFixture(`
    <xs:element name="Raiz"><xs:complexType/></xs:element>
    <xs:simpleType name="Mix">
      <xs:restriction base="xs:string">
        <xs:enumeration value="Ab"/>
        <xs:enumeration value="aB"/>
      </xs:restriction>
    </xs:simpleType>
  `);
  assert.deepEqual(
    tables[0].values.map((v) => v.code),
    ["Ab", "aB"],
  );
});

test("NFC vs NFD codes stay distinct (byte comparison)", () => {
  const nfc = "á".normalize("NFC");
  const nfd = "á".normalize("NFD");
  assert.notEqual(nfc, nfd);
  const { tables } = scanFixture(`
    <xs:element name="Raiz"><xs:complexType/></xs:element>
    <xs:simpleType name="Acentos">
      <xs:restriction base="xs:string">
        <xs:enumeration value="${nfc}"/>
        <xs:enumeration value="${nfd}"/>
      </xs:restriction>
    </xs:simpleType>
  `);
  assert.equal(tables[0].values.length, 2);
  assert.notEqual(tables[0].values[0].code, tables[0].values[1].code);
});

test("description entities are decoded and whitespace collapsed", () => {
  const { tables } = scanFixture(`
    <xs:element name="Raiz"><xs:complexType/></xs:element>
    <xs:simpleType name="Docs">
      <xs:restriction base="xs:string">
        <xs:enumeration value="1"><xs:annotation><xs:documentation>
          A &amp; B   C
        </xs:documentation></xs:annotation></xs:enumeration>
      </xs:restriction>
    </xs:simpleType>
  `);
  assert.equal(tables[0].values[0].description, "A & B C");
});

test("xs:union is fatal", () => {
  assert.throws(
    () =>
      scanFixture(`
        <xs:element name="Raiz"><xs:complexType/></xs:element>
        <xs:simpleType name="U">
          <xs:union memberTypes="xs:string xs:int"/>
        </xs:simpleType>
      `),
    /xs:union/,
  );
});

test("named simpleType inside element is fatal", () => {
  assert.throws(
    () =>
      scanFixture(`
        <xs:element name="Raiz">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="Hijo">
                <xs:simpleType name="Inline">
                  <xs:restriction base="xs:string"><xs:enumeration value="1"/></xs:restriction>
                </xs:simpleType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      `),
    /simpleType con name/,
  );
});

test("XSD without root element is fatal", () => {
  assert.throws(
    () =>
      scanFixture(`
        <xs:simpleType name="Solo">
          <xs:restriction base="xs:string"><xs:enumeration value="1"/></xs:restriction>
        </xs:simpleType>
      `),
    /xs:element de primer nivel/,
  );
});

test("invalid XML structure is fatal", () => {
  assert.throws(
    () => scanXsd('<xs:schema><xs:element name="X"', "bad.xsd"),
    /sin cerrar|correspondiente/,
  );
});

test("merge: same code different description warns and keeps first", () => {
  const a = scanFixture(
    `<xs:element name="Raiz"><xs:complexType/></xs:element><xs:simpleType name="T"><xs:restriction base="xs:string"><xs:enumeration value="01"><xs:annotation><xs:documentation>Uno</xs:documentation></xs:annotation></xs:enumeration></xs:restriction></xs:simpleType>`,
    "a.xsd",
  );
  const b = scanFixture(
    `<xs:element name="Raiz"><xs:complexType/></xs:element><xs:simpleType name="T"><xs:restriction base="xs:string"><xs:enumeration value="01"><xs:annotation><xs:documentation>Otro</xs:documentation></xs:annotation></xs:enumeration></xs:restriction></xs:simpleType>`,
    "b.xsd",
  );
  const { tables, warnings } = mergeTables([
    { relPath: "a.xsd", tables: a.tables },
    { relPath: "b.xsd", tables: b.tables },
  ]);
  assert.equal(tables.length, 1);
  assert.deepEqual(tables[0].sources, ["a.xsd", "b.xsd"]);
  assert.equal(tables[0].values[0].description, "Uno");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /codigo "01"/);
});

test("merge: different code sets under same key is fatal", () => {
  const a = scanFixture(
    `<xs:element name="Raiz"><xs:complexType/></xs:element><xs:simpleType name="T"><xs:restriction base="xs:string"><xs:enumeration value="01"/><xs:enumeration value="02"/></xs:restriction></xs:simpleType>`,
    "a.xsd",
  );
  const b = scanFixture(
    `<xs:element name="Raiz"><xs:complexType/></xs:element><xs:simpleType name="T"><xs:restriction base="xs:string"><xs:enumeration value="01"/><xs:enumeration value="03"/></xs:restriction></xs:simpleType>`,
    "b.xsd",
  );
  assert.throws(
    () =>
      mergeTables([
        { relPath: "a.xsd", tables: a.tables },
        { relPath: "b.xsd", tables: b.tables },
      ]),
    /conjuntos de códigos distintos/,
  );
});

test("merge: identical code sets from two files union sources", () => {
  const body = `<xs:element name="Raiz"><xs:complexType/></xs:element><xs:simpleType name="T"><xs:restriction base="xs:string"><xs:enumeration value="01"><xs:annotation><xs:documentation>Uno</xs:documentation></xs:annotation></xs:enumeration></xs:restriction></xs:simpleType>`;
  const a = scanFixture(body, "a.xsd");
  const b = scanFixture(body, "b.xsd");
  const { tables, warnings } = mergeTables([
    { relPath: "a.xsd", tables: a.tables },
    { relPath: "b.xsd", tables: b.tables },
  ]);
  assert.equal(tables[0].values.length, 1);
  assert.deepEqual(tables[0].sources, ["a.xsd", "b.xsd"]);
  assert.equal(warnings.length, 0);
});

test("render: stable bytes, sorted tables, path convention", () => {
  const merged = mergeTables([
    {
      relPath: "2024/v4.4/B.xsd",
      tables: [
        {
          key: "B",
          kind: "named-simple-type",
          name: "B",
          sources: ["2024/v4.4/B.xsd"],
          values: [{ code: "1" }],
        },
      ],
    },
    {
      relPath: "2024/v4.4/A.xsd",
      tables: [
        {
          key: "A",
          kind: "named-simple-type",
          name: "A",
          sources: ["2024/v4.4/A.xsd"],
          values: [{ code: "2" }],
        },
      ],
    },
  ]);
  const doc = renderCodesJson({
    currentSet: "2024/v4.4",
    generatedFrom: ["2024/v4.4/FacturaElectronica_V4.4.xsd"],
    tables: merged.tables,
  });
  assert.ok(doc.endsWith("\n"));
  assert.ok(doc.includes('"generatedFrom": [\n    "2024/v4.4/FacturaElectronica_V4.4.xsd"\n  ]'));
  assert.ok(doc.indexOf('"key": "A"') < doc.indexOf('"key": "B"'));
});

function spawnExtract(schemasDir) {
  return spawnSync(process.execPath, [extract], {
    env: { ...process.env, CODES_EXTRACT_SCHEMAS_DIR: schemasDir },
    encoding: "utf8",
  });
}

test("CLI: missing manifest is fatal and does not write codes.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "codes-extract-"));
  try {
    const result = spawnExtract(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /manifest\.json/);
    assert.ok(!existsSync(join(dir, "codes.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: invalid currentSet directory is fatal", () => {
  const dir = mkdtempSync(join(tmpdir(), "codes-extract-"));
  try {
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({ schemaVersion: 1, currentSet: "nope" }),
    );
    const result = spawnExtract(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /directorio del set/);
    assert.ok(!existsSync(join(dir, "codes.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: manifest JSON invalid is fatal", () => {
  const dir = mkdtempSync(join(tmpdir(), "codes-extract-"));
  try {
    writeFileSync(join(dir, "manifest.json"), "{not json");
    const result = spawnExtract(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /manifest\.json/);
    assert.ok(!existsSync(join(dir, "codes.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: malformed XSD does not write codes.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "codes-extract-"));
  try {
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({ schemaVersion: 1, currentSet: "2024/v4.4" }),
    );
    mkdirSync(join(dir, "2024", "v4.4"), { recursive: true });
    writeFileSync(join(dir, "2024", "v4.4", "Bad.xsd"), "<xs:schema><unclosed");
    const result = spawnExtract(dir);
    assert.notEqual(result.status, 0);
    assert.ok(!existsSync(join(dir, "codes.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function copySchemasFixture(schemasDir) {
  mkdirSync(join(schemasDir, "2024", "v4.4"), { recursive: true });
  copyFileSync(join(realSchemasDir, "manifest.json"), join(schemasDir, "manifest.json"));
  for (const name of readdirSync(realSetDir)) {
    if (name.endsWith(".xsd")) {
      copyFileSync(join(realSetDir, name), join(schemasDir, "2024", "v4.4", name));
    }
  }
}

function syntheticAnexos({ nota3Codes, note5Lines, skipNotes = [] } = {}) {
  const codes3 = nota3Codes ?? ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
  const rows5 = note5Lines ?? [`${"Fila de prueba".padEnd(40)}01`];
  const lines = [
    "Nota 3/",
    `${"Tabla de tipos de comprobante".padEnd(40)}Código`,
    ...codes3.map((code) => `${`Tipo ${code}`.padEnd(40)}${code}`),
    "",
    "1 Pies de nota de la tabla anterior.",
    "Código   Situación   comprobante   Descripción",
    "   1   Normal",
    "   2   Contingencia",
    "   3   Sin envío",
  ];
  for (const note of [
    "5",
    "6",
    "8",
    "8.1",
    "9",
    "10",
    "10.1",
    "16",
    "18",
    "20",
    "21",
    "22",
    "23",
  ]) {
    if (skipNotes.includes(note)) continue;
    lines.push(`Nota ${note}/`, `${"Tabla de codigos".padEnd(40)}Código`);
    if (note === "5") lines.push(...rows5);
    else lines.push(`${"Valor de ejemplo".padEnd(40)}01`);
  }
  return lines.join("\n");
}

function monedaLine(pais, moneda, code) {
  const head = `${pais}   ${moneda}`;
  return head.padEnd(Math.max(head.length + 3, 44), " ") + (code ?? "");
}

function syntheticMoneda() {
  return [
    "CÓDIGOMONEDA",
    "NOMBRE DEL PAÍS      NOMBRE DE LA MODENA      CÓDIGO",
    monedaLine("Costa Rica", "Colón costarricense", "CRC"),
    monedaLine("Estados Unidos", "Dólar americano", "USD"),
    monedaLine("Estados Unidos", "Dólar estadounidense", "USD"),
    monedaLine("Francia", "Franco sin codigo"),
    monedaLine("Unión Europea", "Euro", "EUR"),
    monedaLine("Prueba", "Moneda falsa", "ZZZ"),
    "",
  ].join("\n");
}

test("aux-pdf: parseAnexos une renglones partidos y parsea las dos tablas de la nota 3", () => {
  const parsed = parseAnexos(
    syntheticAnexos({
      note5Lines: ["Descripción partida", `${"  en dos renglones".padEnd(40)}01`],
    }),
    "ANEXOS.pdf",
  );
  assert.equal(parsed.tables.length, 15);
  const note5 = parsed.tables.find((table) => table.note === "5");
  assert.deepEqual(note5.segments, ["CondicionVenta"]);
  assert.deepEqual(note5.values, [
    { code: "01", description: "Descripción partida en dos renglones" },
  ]);
  const nota3 = parsed.tables.filter((table) => table.note === "3");
  assert.equal(nota3.length, 2);
  assert.equal(nota3[0].tableKey, "Nota3/TipoComprobanteDocumentoAsociado");
  assert.equal(nota3[0].name, "Tipo de comprobante o documento asociado");
  assert.deepEqual(
    nota3[0].values.map((value) => value.code),
    ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"],
  );
  assert.equal(nota3[1].tableKey, "Nota3/SituacionComprobante");
  assert.deepEqual(nota3[1].values, [
    { code: "1", description: "Normal" },
    { code: "2", description: "Contingencia" },
    { code: "3", description: "Sin envío" },
  ]);
});

test("aux-pdf: 0 filas, nota listada ausente o secuencia fuera de contrato es fatal", () => {
  assert.throws(() => parseAnexos(syntheticAnexos({ note5Lines: [] }), "ANEXOS.pdf"), /0 filas/);
  assert.throws(
    () => parseAnexos(syntheticAnexos({ skipNotes: ["23"] }), "ANEXOS.pdf"),
    /seccion Nota 23/,
  );
  assert.throws(
    () =>
      parseAnexos(
        syntheticAnexos({
          nota3Codes: ["01", "02", "03", "04", "05", "06", "07", "08", "09"],
        }),
        "ANEXOS.pdf",
      ),
    /codigos inesperados/,
  );
});

test("aux-pdf: parseMoneda deduplica por primera aparicion y advierte divergencias", () => {
  const { values, warnings } = parseMoneda(syntheticMoneda(), "Codigodemoneda.pdf");
  assert.deepEqual(
    values.map((value) => value.code),
    ["CRC", "USD", "EUR", "ZZZ"],
  );
  assert.equal(values.find((value) => value.code === "USD").description, "Dólar americano");
  assert.equal(warnings.length, 2);
  assert.ok(warnings.some((warning) => warning.includes("fila sin codigo")));
  assert.ok(
    warnings.some((warning) => warning.includes("descripcion distinta en Codigodemoneda.pdf")),
  );
});

test("aux-pdf: moneda sin titulo o con encabezado inesperado es fatal", () => {
  assert.throws(() => parseMoneda("texto cualquiera", "x.pdf"), /titulo/);
  assert.throws(() => parseMoneda("CÓDIGOMONEDA\nencabezado raro", "x.pdf"), /encabezado/);
});

function mergeFixture() {
  const xsTables = [
    {
      key: "CodigoMonedaType/CodigoMoneda",
      kind: "named-simple-type",
      name: "CodigoMonedaType",
      sources: ["2024/v4.4/FacturaElectronica_V4.4.xsd"],
      values: [{ code: "CRC" }, { code: "USD", description: "Dólar" }, { code: "PAB" }],
    },
    {
      key: "FacturaElectronica/CondicionVenta",
      kind: "element-anonymous",
      sources: ["2024/v4.4/FacturaElectronica_V4.4.xsd"],
      values: [{ code: "01", description: "Contado" }],
    },
  ];
  const anexos = {
    tables: [
      {
        note: "5",
        segments: ["CondicionVenta"],
        values: [
          { code: "01", description: "Venta de contado" },
          { code: "88", description: "Extra" },
        ],
      },
      {
        note: "3",
        tableKey: "Nota3/TipoComprobanteDocumentoAsociado",
        name: "Tipo de comprobante o documento asociado",
        values: [{ code: "01", description: "Factura electrónica" }],
      },
    ],
  };
  const moneda = {
    values: [
      { code: "CRC", description: "Colón costarricense" },
      { code: "USD", description: "Dólar" },
      { code: "ZZZ", description: "Falsa" },
    ],
    warnings: [],
  };
  const ubicacion = [
    {
      key: "CodificacionUbicacion/Provincia",
      name: "Provincia",
      values: [{ code: "1", description: "SAN JOSÉ" }],
    },
  ];
  const paths = {
    anexos: "2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf",
    moneda: "2024/v4.4/Codigodemoneda_V4.4.pdf",
    ubicacion: "2024/v4.4/Codificacionubicacion_V4.4.rar",
  };
  return { xsTables, anexos, moneda, ubicacion, paths };
}

test("aux-merge: la autoridad XSD fija codigos, el auxiliar completa y advierte", () => {
  const fixture = mergeFixture();
  const auxTables = buildAuxTables(fixture);
  const { tables, warnings } = mergeAuxiliary({ xsTables: fixture.xsTables, auxTables });

  const cv = tables.find((table) => table.key === "FacturaElectronica/CondicionVenta");
  assert.equal(cv.values.length, 1, "el codigo solo-auxiliar 88 se descarta");
  assert.equal(cv.values[0].description, "Contado");
  assert.deepEqual(cv.sources, ["2024/v4.4/FacturaElectronica_V4.4.xsd", fixture.paths.anexos]);
  assert.deepEqual(cv.values[0].sources, ["2024/v4.4/FacturaElectronica_V4.4.xsd"]);
  assert.ok(warnings.some((warning) => warning.includes('codigo "88" solo en')));
  assert.ok(warnings.some((warning) => warning.includes('codigo "01" descripcion distinta entre')));

  const monedaTable = tables.find((table) => table.key === "CodigoMonedaType/CodigoMoneda");
  const crc = monedaTable.values.find((value) => value.code === "CRC");
  assert.equal(crc.description, "Colón costarricense");
  assert.deepEqual(crc.sources, ["2024/v4.4/FacturaElectronica_V4.4.xsd", fixture.paths.moneda]);
  const usd = monedaTable.values.find((value) => value.code === "USD");
  assert.equal(usd.description, "Dólar");
  assert.deepEqual(usd.sources, ["2024/v4.4/FacturaElectronica_V4.4.xsd", fixture.paths.moneda]);
  const pab = monedaTable.values.find((value) => value.code === "PAB");
  assert.equal(pab.description, undefined, "codigo XSD sin auxiliar queda sin descripcion");
  assert.deepEqual(pab.sources, ["2024/v4.4/FacturaElectronica_V4.4.xsd"]);
  assert.ok(warnings.some((warning) => warning.includes('codigo "ZZZ" solo en')));
});

test("aux-merge: claves solo-auxiliar son aux-table sin sources por valor", () => {
  const fixture = mergeFixture();
  const { tables } = mergeAuxiliary({
    xsTables: fixture.xsTables,
    auxTables: buildAuxTables(fixture),
  });
  const nota3 = tables.find((table) => table.key === "Nota3/TipoComprobanteDocumentoAsociado");
  assert.equal(nota3.kind, "aux-table");
  assert.equal(nota3.name, "Tipo de comprobante o documento asociado");
  assert.deepEqual(nota3.sources, [fixture.paths.anexos]);
  assert.ok(nota3.values.every((value) => !("sources" in value)));
  const provincia = tables.find((table) => table.key === "CodificacionUbicacion/Provincia");
  assert.equal(provincia.kind, "aux-table");
  assert.deepEqual(provincia.sources, [fixture.paths.ubicacion]);
  assert.ok(provincia.values.every((value) => !("sources" in value)));
  const keys = tables.map((table) => table.key);
  assert.deepEqual(keys, [...keys].sort());
});

test("aux-merge: segmento sin destino, auxiliar sin nombre y doble fuente son fatales", () => {
  const fixture = mergeFixture();
  assert.throws(
    () =>
      buildAuxTables({
        ...fixture,
        anexos: {
          tables: [
            { note: "99", segments: ["NoExiste"], values: [{ code: "01", description: "X" }] },
          ],
        },
      }),
    /sin claves XSD destino para el segmento "NoExiste"/,
  );

  const sinNombre = buildAuxTables({
    ...fixture,
    anexos: { tables: [] },
    ubicacion: [{ key: "CodificacionUbicacion/Extra", values: [{ code: "1", description: "X" }] }],
  });
  assert.throws(
    () => mergeAuxiliary({ xsTables: fixture.xsTables, auxTables: sinNombre }),
    /sin nombre/,
  );

  const auxTables = buildAuxTables(fixture);
  auxTables.push({
    key: "CodificacionUbicacion/Provincia",
    source: "otro.pdf",
    name: "Provincia",
    values: [{ code: "1", description: "X" }],
  });
  assert.throws(
    () => mergeAuxiliary({ xsTables: fixture.xsTables, auxTables }),
    /mas de una fuente auxiliar/,
  );
});

async function writeFixtureXlsx(xlsxPath, { headerCells, dataRows } = {}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hoja1");
  const header = headerCells ?? {
    2: "Provincia",
    4: "Cantón",
    6: "Distrito",
    8: "Barrio o Poblado",
  };
  for (const [column, value] of Object.entries(header)) {
    sheet.getRow(1).getCell(Number(column)).value = value;
  }
  const rows = dataRows ?? [[1, "San José", 1, "San José", 1, "Carmen", 1, "Amón"]];
  rows.forEach((cells, index) => {
    cells.forEach((value, offset) => {
      sheet.getRow(index + 2).getCell(offset + 2).value = value;
    });
  });
  await workbook.xlsx.writeFile(xlsxPath);
}

test("aux-xlsx: genera los codigos compuestos por nivel desde una fila por barrio", async () => {
  const dir = mkdtempSync(join(tmpdir(), "codes-xlsx-"));
  try {
    const xlsxPath = join(dir, "fixture.xlsx");
    await writeFixtureXlsx(xlsxPath, {
      dataRows: [
        [1, "San José", 1, "San José", 1, "Carmen", 1, "Amón"],
        [1, "San José", 1, "San José", 1, "Carmen", 2, "Merced"],
        [2, "Alajuela", 1, "Alajuela", 1, "Alajuela", 1, "Norte"],
      ],
    });
    const tables = await readXlsx(xlsxPath);
    assert.deepEqual(
      tables.map((table) => table.key),
      [
        "CodificacionUbicacion/Provincia",
        "CodificacionUbicacion/Canton",
        "CodificacionUbicacion/Distrito",
        "CodificacionUbicacion/Barrio",
      ],
    );
    assert.equal(tables[0].name, "Provincia");
    assert.deepEqual(
      tables[0].values.map((value) => value.code),
      ["1", "2"],
    );
    assert.equal(tables[0].values[0].description, "San José");
    assert.deepEqual(
      tables[1].values.map((value) => value.code),
      ["1.1", "2.1"],
    );
    assert.deepEqual(
      tables[2].values.map((value) => value.code),
      ["1.1.1", "2.1.1"],
    );
    assert.deepEqual(
      tables[3].values.map((value) => value.code),
      ["1.1.1.1", "1.1.1.2", "2.1.1.1"],
    );
    assert.equal(tables[3].values[0].description, "Amón");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("aux-xlsx: compuesto duplicado, cabecera rara, hoja vacia y celda no entera son fatales", async () => {
  const dir = mkdtempSync(join(tmpdir(), "codes-xlsx-invalid-"));
  try {
    const duplicated = join(dir, "duplicado.xlsx");
    await writeFixtureXlsx(duplicated, {
      dataRows: [
        [1, "San José", 1, "San José", 1, "Carmen", 1, "Amón"],
        [1, "San José", 1, "San José", 1, "Carmen", 1, "Distinto"],
      ],
    });
    await assert.rejects(() => readXlsx(duplicated), /duplicado/);

    const badHeader = join(dir, "cabecera.xlsx");
    await writeFixtureXlsx(badHeader, {
      headerCells: { 2: "Provincia", 4: "Provincia", 6: "Distrito", 8: "Barrio o Poblado" },
    });
    await assert.rejects(() => readXlsx(badHeader), /cabecera inesperada/);

    const empty = join(dir, "vacia.xlsx");
    await writeFixtureXlsx(empty, { dataRows: [] });
    await assert.rejects(() => readXlsx(empty), /sin filas de datos/);

    const fractional = join(dir, "decimal.xlsx");
    await writeFixtureXlsx(fractional, {
      dataRows: [[1.5, "San José", 1, "San José", 1, "Carmen", 1, "Amón"]],
    });
    await assert.rejects(() => readXlsx(fractional), /no entero/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function stubSeams({ failAnexos = false } = {}) {
  return {
    runPdftotext: (pdfPath) => {
      const name = basename(pdfPath);
      if (name.includes("ANEXOS")) {
        if (failAnexos) throw new Error("auxiliar no disponible");
        return syntheticAnexos();
      }
      if (name.includes("Codigodemoneda")) return syntheticMoneda();
      throw new Error(`pdf inesperado en el stub: ${name}`);
    },
    extractRar: async () => ({ xlsxPath: join(tmpdir(), "stub-unrar.xlsx"), cleanup: () => {} }),
    readXlsx: async () => [
      {
        key: "CodificacionUbicacion/Provincia",
        name: "Provincia",
        values: [{ code: "1", description: "SAN JOSÉ" }],
      },
      {
        key: "CodificacionUbicacion/Canton",
        name: "Cantón",
        values: [{ code: "1.1", description: "SAN JOSÉ" }],
      },
      {
        key: "CodificacionUbicacion/Distrito",
        name: "Distrito",
        values: [{ code: "1.1.1", description: "CARMEN" }],
      },
      {
        key: "CodificacionUbicacion/Barrio",
        name: "Barrio o Poblado",
        values: [{ code: "1.1.1.1", description: "Amón" }],
      },
    ],
  };
}

test("extract: pipeline con seams stubeados es idempotente y estructuralmente correcta", async () => {
  const work = mkdtempSync(join(tmpdir(), "codes-extract-e2e-"));
  try {
    const schemas = join(work, "schemas");
    copySchemasFixture(schemas);
    const run = async () => {
      const chunks = [];
      const result = await extractCodes({
        schemasDir: schemas,
        seams: stubSeams(),
        stderr: { write: (text) => chunks.push(text) },
      });
      return { result, stderr: chunks.join("") };
    };

    const first = await run();
    const bytesFirst = readFileSync(first.result.outPath);
    const second = await run();
    const bytesSecond = readFileSync(second.result.outPath);
    assert.ok(bytesFirst.equals(bytesSecond), "doble corrida debe dar bytes identicos");

    const doc = JSON.parse(bytesFirst.toString("utf8"));
    assert.equal(doc.schemaVersion, 1);
    assert.equal(doc.currentSet, "2024/v4.4");
    assert.deepEqual(doc.generatedFrom.slice(-3), [
      "2024/v4.4/ANEXOS Y ESTRUCTURAS_V4.4.pdf",
      "2024/v4.4/Codigodemoneda_V4.4.pdf",
      "2024/v4.4/Codificacionubicacion_V4.4.rar",
    ]);
    assert.ok(doc.tables.length >= 50, `se esperaban >= 50 tablas, hay ${doc.tables.length}`);

    for (const table of doc.tables) {
      assert.ok(table.key);
      assert.ok(Array.isArray(table.sources) && table.sources.length > 0);
      assert.ok(table.values.length > 0);
      for (const source of table.sources) {
        assert.ok(!source.startsWith("packages/"), `ruta relativa al set: ${source}`);
      }
      for (const value of table.values) {
        assert.equal(typeof value.code, "string");
        assert.ok(value.code.length > 0);
      }
    }

    for (const key of [
      "CodificacionUbicacion/Provincia",
      "CodificacionUbicacion/Canton",
      "CodificacionUbicacion/Distrito",
      "CodificacionUbicacion/Barrio",
      "Nota3/TipoComprobanteDocumentoAsociado",
      "Nota3/SituacionComprobante",
    ]) {
      const table = doc.tables.find((entry) => entry.key === key);
      assert.ok(table, `falta la tabla ${key}`);
      assert.equal(table.kind, "aux-table");
      for (const value of table.values) {
        assert.ok(!("sources" in value), `${key} no debe declarar sources por valor`);
      }
    }
    const provincia = doc.tables.find((entry) => entry.key === "CodificacionUbicacion/Provincia");
    assert.deepEqual(provincia.sources, ["2024/v4.4/Codificacionubicacion_V4.4.rar"]);

    const monedaTable = doc.tables.find((entry) => entry.key === "CodigoMonedaType/CodigoMoneda");
    const crc = monedaTable.values.find((value) => value.code === "CRC");
    assert.equal(crc.description, "Colón costarricense");
    assert.ok(crc.sources.includes("2024/v4.4/Codigodemoneda_V4.4.pdf"));
    assert.equal(
      monedaTable.values.some((value) => value.code === "ZZZ"),
      false,
      "el codigo solo-auxiliar ZZZ se descarta",
    );

    assert.ok(
      first.stderr.includes('codigo "ZZZ" solo en 2024/v4.4/Codigodemoneda_V4.4.pdf descartado'),
      "se esperaba advertencia de codigo extra de moneda",
    );
    assert.deepEqual(
      readdirSync(schemas).filter((name) => name.includes(".tmp-")),
      [],
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("extract: auxiliar faltante sale con error sin tocar codes.json", async () => {
  const work = mkdtempSync(join(tmpdir(), "codes-extract-noaux-"));
  try {
    const schemas = join(work, "schemas");
    copySchemasFixture(schemas);
    const outPath = join(schemas, "codes.json");
    writeFileSync(outPath, "SENTINEL\n");
    await assert.rejects(
      extractCodes({
        schemasDir: schemas,
        seams: stubSeams({ failAnexos: true }),
        stderr: { write: () => {} },
      }),
      /ANEXOS Y ESTRUCTURAS_V4\.4\.pdf: pdftotext fall/,
    );
    assert.equal(readFileSync(outPath, "utf8"), "SENTINEL\n");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("CLI: auxiliar vendorizado ausente sale con exit != 0 sin codes.json", () => {
  const work = mkdtempSync(join(tmpdir(), "codes-extract-cli-noaux-"));
  try {
    const schemas = join(work, "schemas");
    copySchemasFixture(schemas);
    const result = spawnExtract(schemas);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ANEXOS/);
    assert.ok(!existsSync(join(schemas, "codes.json")));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("rar vendorizado real se extrae y se lee con las tablas de ubicacion", async (t) => {
  const rarPath = join(realSetDir, "Codificacionubicacion_V4.4.rar");
  if (!existsSync(rarPath)) {
    t.skip("Codificacionubicacion_V4.4.rar no esta vendorizado");
    return;
  }
  let extractRar;
  let rar;
  try {
    ({ extractRar } = await import("./lib/aux-rar.mjs"));
    rar = await extractRar(rarPath);
  } catch (error) {
    t.skip(`node-unrar-js no pudo usarse en este entorno: ${error.message}`);
    return;
  }
  try {
    assert.ok(existsSync(rar.xlsxPath));
    const tables = await readXlsx(rar.xlsxPath);
    assert.deepEqual(
      tables.map((table) => table.key),
      [
        "CodificacionUbicacion/Provincia",
        "CodificacionUbicacion/Canton",
        "CodificacionUbicacion/Distrito",
        "CodificacionUbicacion/Barrio",
      ],
    );
    const barrios = tables.find((table) => table.key === "CodificacionUbicacion/Barrio");
    assert.ok(barrios.values.length > 7000, `barrios: ${barrios.values.length}`);
  } finally {
    rar.cleanup();
  }
});

// `copySchemasFixture` filtra los `.xsd` a propósito: los tests de negativo
// necesitan ausencia de auxiliares. La verificación de frescura, en cambio,
// regenera a partir del árbol commiteado tal cual, así que copia el set completo.
function copyRealSet(schemasDir) {
  mkdirSync(join(schemasDir, "2024", "v4.4"), { recursive: true });
  copyFileSync(join(realSchemasDir, "manifest.json"), join(schemasDir, "manifest.json"));
  for (const name of readdirSync(realSetDir)) {
    copyFileSync(join(realSetDir, name), join(schemasDir, "2024", "v4.4", name));
  }
}

// `codes.json` es derivado, no vendorizado: no tiene entrada en el manifiesto y
// `spec:verify` lo tiene en su allowlist, así que esta regeneración es lo único
// que impide que el artefacto commiteado quede obsoleto en silencio.
//
// El artefacto commiteado no es texto crudo del extractor: el hook de commit lo
// pasa por prettier, que inlinea los arrays cortos. Se normaliza con `.prettierrc`
// a ambos lados y se compara después byte a byte; la deriva de formato pura la
// cubre `prettier --check`, que `verify` ya ejecuta.
test("freshness: committed codes.json matches a fresh regeneration", async () => {
  const committedPath = join(realSchemasDir, "codes.json");
  const prettierConfig = (await resolveConfig(committedPath)) ?? {};
  const normalize = (source) => format(source, { ...prettierConfig, parser: "json" });
  const committed = await normalize(readFileSync(committedPath, "utf8"));
  const work = mkdtempSync(join(tmpdir(), "codes-extract-freshness-"));
  try {
    const schemas = join(work, "schemas");
    copyRealSet(schemas);
    const run = spawnExtract(schemas);
    assert.equal(run.status, 0, run.stderr);
    const fresh = await normalize(readFileSync(join(schemas, "codes.json"), "utf8"));
    assert.equal(
      fresh,
      committed,
      "codes.json del repo ya no coincide con una regeneración fresca de las " +
        "fuentes del árbol actual: ejecuta `pnpm codes:extract` y commitea el resultado",
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
