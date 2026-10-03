/** Test published artifacts in an isolated consumer with native ESM and stdio. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const stage = await mkdtemp(join(tmpdir(), "hacienda-packed-"));
function run(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      timeout: 180000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(`${command} failed: ${error.stderr ?? error.message}`, { cause: error });
  }
}
try {
  const packed = join(stage, "packed");
  const consumer = join(stage, "consumer");
  await mkdir(packed);
  await mkdir(consumer);
  for (const pkg of ["shared", "packages/sdk", "packages/cli", "packages/mcp"])
    run("pnpm", ["pack", "--pack-destination", packed], join(root, pkg));
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  const tarballs = (await readdir(packed))
    .filter((name) => name.endsWith(".tgz"))
    .map((name) => join(packed, name));
  assert.equal(tarballs.length, 4);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs], consumer);
  const fixtureSource = await readFile(
    join(root, "packages/sdk/src/__fixtures__/invoices.ts"),
    "utf8",
  );
  await writeFile(
    join(consumer, "fixtures.mjs"),
    ts.transpileModule(fixtureSource, { compilerOptions: { module: ts.ModuleKind.ESNext } })
      .outputText,
  );
  await writeFile(
    join(consumer, "smoke.mjs"),
    `
import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {SIMPLE_INVOICE} from "./fixtures.mjs";
import {buildFacturaXml,validateDocumentXml} from "@dojocoding/hacienda-sdk";
import {createServer} from "@dojocoding/hacienda-mcp";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
const xml=buildFacturaXml(SIMPLE_INVOICE);
const result=await validateDocumentXml(xml); assert.equal(result.valid,true,JSON.stringify(result.issues));
await createServer().close();
await writeFile("invoice.json",JSON.stringify(SIMPLE_INVOICE)); await writeFile("invoice.xml",xml);
const cli="./node_modules/@dojocoding/hacienda-cli/dist/index.js";
for (const file of ["invoice.json","invoice.xml"]) {
  const output=execFileSync(process.execPath,[cli,"validate",file,"--json"],{encoding:"utf8",timeout:15000});
  assert.equal(JSON.parse(output).valid,true);
}
execFileSync(process.execPath,[cli,"submit","invoice.json","--dry-run","--json"],{timeout:15000});
const transport=new StdioClientTransport({command:process.execPath,args:["./node_modules/@dojocoding/hacienda-mcp/dist/cli.js"],stderr:"pipe"});
let stderr=""; transport.stderr.on("data",chunk=>{stderr+=chunk;});
const client=new Client({name:"packed-package-test",version:"1.0.0"});
const timer=setTimeout(()=>{ console.error("MCP initialization timed out",stderr); process.exit(1); },15000);
try {
  await client.connect(transport); const tools=await client.listTools(); assert.equal(tools.tools.length,6);
  const resource=await client.readResource({uri:"hacienda://schemas/factura"});
  const schema=JSON.parse(resource.contents[0].text);
  assert.deepEqual(schema.required,tools.tools.find(tool=>tool.name==="create_invoice").inputSchema.required);
  assert.ok(schema.required.includes("proveedorSistemas"));
} catch(error) { console.error(stderr); throw error; }
finally { clearTimeout(timer); await client.close(); }
console.log("Installed ESM SDK, CLI validation/dry-run, and MCP stdio checks passed.");
`,
  );
  process.stdout.write(run(process.execPath, ["smoke.mjs"], consumer));
} finally {
  await rm(stage, { recursive: true, force: true });
}
