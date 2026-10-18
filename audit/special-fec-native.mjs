/** Audit-only native counterexamples. No special FEC calculator or tax oracle. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  dir = mkdtempSync(path.join(tmpdir(), "special-fec-native-"));
const sdk = pathToFileURL(path.join(root, "packages/sdk/dist/index.js")).href,
  shared = pathToFileURL(path.join(root, "shared/dist/index.js")).href;
try {
  for (const name of ["identity", "invoices", "exact-nc", "exact-fec"]) {
    let source = readFileSync(
      path.join(root, "packages/sdk/src/__fixtures__", name + ".ts"),
      "utf8",
    )
      .replaceAll("@dojocoding/hacienda-shared", shared)
      .replaceAll("../clave/build-clave.js", sdk)
      .replaceAll("../clave/types.js", sdk);
    for (const fixture of ["identity", "invoices", "exact-nc"])
      source = source.replaceAll(`./${fixture}.js`, `./${fixture}.mjs`);
    writeFileSync(
      path.join(dir, name + ".mjs"),
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    );
  }
  const helper = path.join(root, "packages/sdk/src/__testing__/xsd.ts"),
    source = readFileSync(helper, "utf8").replace(
      "fileURLToPath(import.meta.url)",
      JSON.stringify(helper),
    );
  writeFileSync(
    path.join(dir, "xsd.mjs"),
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  );
  const { buildExactFacturaCompraXml } = await import(sdk),
    { exactFecFixture } = await import(pathToFileURL(path.join(dir, "exact-fec.mjs")).href),
    { validateAgainstXsd } = await import(pathToFileURL(path.join(dir, "xsd.mjs")).href);
  const base = buildExactFacturaCompraXml(exactFecFixture());
  function supplier(xml, type, address = true) {
    return xml.replace(
      /<Emisor>[\s\S]*?<\/Emisor>/,
      `<Emisor><Nombre>Proveedor sintético real</Nombre><Identificacion><Tipo>${type}</Tipo><Numero>SUPPLIER12345</Numero></Identificacion>${type === "05" && address ? "<OtrasSenasExtranjero>Actual synthetic foreign address</OtrasSenasExtranjero>" : ""}</Emisor>`,
    );
  }
  function foreign(xml) {
    return supplier(xml, "05")
      .replace(/<TipoDocIR>99<\/TipoDocIR>/, "<TipoDocIR>16</TipoDocIR>")
      .replace(/<TipoDocRefOTRO>[\s\S]*?<\/TipoDocRefOTRO>/, "")
      .replace(/<Codigo>04<\/Codigo>/, "<Codigo>11</Codigo>");
  }
  function used(xml) {
    return supplier(xml, "06")
      .replace("<CondicionVenta>01</CondicionVenta>", "<CondicionVenta>13</CondicionVenta>")
      .replace("8310100000000", "4321000000000")
      .replace("<UnidadMedida>Sp</UnidadMedida>", "<UnidadMedida>Unid</UnidadMedida>")
      .replace(
        "<TotalServGravados>100.00000</TotalServGravados>",
        "<TotalServGravados>0.00000</TotalServGravados>",
      )
      .replace(
        "<TotalMercanciasGravadas>0.00000</TotalMercanciasGravadas>",
        "<TotalMercanciasGravadas>100.00000</TotalMercanciasGravadas>",
      );
  }
  function zero(xml) {
    return xml
      .replaceAll("<CodigoTarifaIVA>08</CodigoTarifaIVA>", "<CodigoTarifaIVA>11</CodigoTarifaIVA>")
      .replaceAll("<Tarifa>13</Tarifa>", "<Tarifa>0</Tarifa>")
      .replaceAll(">13.00000<", ">0.00000<")
      .replaceAll(">113.00000<", ">100.00000<");
  }
  const candidates = [
    ["05 with explicit ordinary 13 hypothesis", foreign(base), true],
    ["05 with distinct zero/no-credit hypothesis", zero(foreign(base)), true],
    [
      "05 missing mandatory foreign address",
      foreign(base).replace(/<OtrasSenasExtranjero>[\s\S]*?<\/OtrasSenasExtranjero>/, ""),
      true,
    ],
    ["05 missing required reference16", supplier(base, "05"), true],
    ["06 condition13 ordinary13 hypothesis", used(base), true],
    ["06 condition13 zero/no-credit hypothesis", zero(used(base)), true],
    [
      "06 wrong condition01",
      used(base).replace(
        "<CondicionVenta>13</CondicionVenta>",
        "<CondicionVenta>01</CondicionVenta>",
      ),
      true,
    ],
    [
      "native name violation control",
      foreign(base).replace("Proveedor sintético real", "abcd"),
      false,
    ],
  ];
  const results = candidates.map(([name, xml, expected]) => {
    const native = ["2024", "2026"].map((generation) => {
      const result = validateAgainstXsd(xml, "FacturaElectronicaCompra_V4.4.xsd", {
        allowMissingSignature: true,
        generation,
      });
      assert.equal(result.valid, expected, `${name}: ${result.errors}`);
      return { generation, valid: result.valid };
    });
    return {
      name,
      xmlSha256: createHash("sha256").update(xml).digest("hex"),
      taxTreatmentApproved: false,
      native,
    };
  });
  console.log(
    JSON.stringify(
      {
        baseline: "7d5891a7c96f5f084b2e97e4d33fbf7839a74537",
        scope:
          "Audit-only synthetic mutated XML; mutually incompatible native-valid hypotheses are not producers, legal eligibility, signatures or fiscal acceptance",
        results,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
