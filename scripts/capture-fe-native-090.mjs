/** Reproduce synthetic historical source evidence with actual registry 0.9.
 * Explicit network/package installation; no credentials, signing or submission.
 * Never substitute a current build bearing a historical producer label. */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const root = new URL("../", import.meta.url);
const output = new URL("packages/sdk/src/__fixtures__/retained-fe-native-090.json", root);
const source = JSON.parse(
  await readFile(
    new URL("packages/sdk/src/__fixtures__/retained-fe-credit-080.json", root),
    "utf8",
  ),
).rows[0].source;
source.condicionVenta = "01";
delete source.plazoCredito;
const directory = await mkdtemp(join(tmpdir(), "hacienda-registry-fe090-"));
try {
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      "@dojocoding/hacienda-sdk@0.9.0",
      "@dojocoding/hacienda-shared@0.9.0",
    ],
    { cwd: directory, stdio: "pipe", timeout: 180000 },
  );
  const lock = JSON.parse(await readFile(join(directory, "package-lock.json"), "utf8"));
  const expected = {
    "@dojocoding/hacienda-sdk":
      "sha512-k+oa27RS4Cwf/B7te6voHcMbN/Jf9AXiNQn1zJffD8YwuhIy5jSHydcTGDBVGTVOxy+JZ41/rpvqwQ4ikLha5w==",
    "@dojocoding/hacienda-shared":
      "sha512-WQT9E4gX1Q3yGE0HCr6bO0puOAnY/sO/SliWi42ckWJ8zKjvyzcg/Hao+7dcBzGMMvnPEUB0qBQ1qhmrXy4zOA==",
  };
  for (const [name, integrity] of Object.entries(expected))
    if (
      lock.packages[`node_modules/${name}`]?.version !== "0.9.0" ||
      lock.packages[`node_modules/${name}`]?.integrity !== integrity
    )
      throw new Error("Unexpected historical registry artifact");
  await writeFile(join(directory, "source.json"), JSON.stringify(source));
  await writeFile(
    join(directory, "capture.mjs"),
    `
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {ExactFeInputSchema} from "@dojocoding/hacienda-shared";
import {buildExactFacturaXml,calculateExactFe} from "@dojocoding/hacienda-sdk";
const seed=JSON.parse(await readFile("source.json","utf8")), rows=[];
for(const kind of ["issuer-short","receiver-short","issuer-commercial-empty","receiver-commercial-short","zero-split","zero-fraction-split","unicode-valid"]){
 const source=structuredClone(seed);
 if(kind==="issuer-short")source.emisor.nombre="abcd";
 if(kind==="receiver-short")source.receptor.nombre="ab";
 if(kind==="issuer-commercial-empty")source.emisor.nombreComercial="";
 if(kind==="receiver-commercial-short")source.receptor.nombreComercial="ab";
 if(kind.startsWith("zero"))source.medioPago=[{tipoMedioPago:"01",totalMedioPago:kind==="zero-split"?"0":"0.00000"},{tipoMedioPago:"04",totalMedioPago:calculateExactFe(seed).resumenFactura.totalComprobante}];
 if(kind==="unicode-valid"){source.emisor.nombre="😀".repeat(100);source.receptor.nombre="a\\u0301b";source.emisor.nombreComercial="Nom";source.receptor.nombreComercial="😀".repeat(80);}
 ExactFeInputSchema.parse(source); const xml=buildExactFacturaXml(source),calculated=calculateExactFe(source);
 rows.push({kind,source,xml,sha256:createHash("sha256").update(xml).digest("hex"),calculated});
}
await writeFile("captured.json",JSON.stringify(rows));
`,
  );
  execFileSync(process.execPath, ["capture.mjs"], {
    cwd: directory,
    stdio: "pipe",
    timeout: 30000,
  });
  const rows = JSON.parse(await readFile(join(directory, "captured.json"), "utf8"));
  await writeFile(
    output,
    JSON.stringify(
      {
        scope:
          "Synthetic unsigned original registry 0.9 source/math/bytes; not native compliance, signature or fiscal acceptance",
        producer: {
          version: "0.9.0",
          sourceCommit: "d6b647512eb0e216cf65e6727da06dcf9ead3db2",
          integrities: expected,
        },
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Captured ${rows.length} actual registry 0.9 cases; no current producer used`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
