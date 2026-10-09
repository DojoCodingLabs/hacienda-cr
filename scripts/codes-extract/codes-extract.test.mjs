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
import { dirname, join, resolve } from "node:path";
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

test("integration: real set produces structural codes.json idempotently", () => {
  const work = mkdtempSync(join(tmpdir(), "codes-extract-int-"));
  try {
    const schemas = join(work, "schemas");
    mkdirSync(join(schemas, "2024", "v4.4"), { recursive: true });
    copyFileSync(join(realSchemasDir, "manifest.json"), join(schemas, "manifest.json"));
    for (const name of readdirSync(realSetDir)) {
      if (name.endsWith(".xsd")) {
        copyFileSync(join(realSetDir, name), join(schemas, "2024", "v4.4", name));
      }
    }
    const firstRun = spawnExtract(schemas);
    assert.equal(firstRun.status, 0, firstRun.stderr);
    const first = readFileSync(join(schemas, "codes.json"), "utf8");
    const secondRun = spawnExtract(schemas);
    assert.equal(secondRun.status, 0, secondRun.stderr);
    const second = readFileSync(join(schemas, "codes.json"), "utf8");
    assert.equal(first, second);
    const doc = JSON.parse(first);
    assert.equal(doc.schemaVersion, 1);
    assert.equal(doc.currentSet, "2024/v4.4");
    assert.ok(doc.tables.length >= 40, `expected >= 40 tables, got ${doc.tables.length}`);
    for (const table of doc.tables) {
      assert.ok(table.key);
      assert.ok(Array.isArray(table.sources) && table.sources.length > 0);
      assert.ok(table.values.length > 0);
      for (const source of table.sources) {
        assert.ok(
          !source.startsWith("packages/"),
          `path must be relative to schemas dir: ${source}`,
        );
      }
      for (const value of table.values) {
        assert.equal(typeof value.code, "string");
        assert.ok(value.code.length > 0);
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
