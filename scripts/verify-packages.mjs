/** Test published artifacts in an isolated consumer with native ESM and stdio. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { packPackages, manifests } from "./package-artifacts.mjs";

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
    throw new Error(`${command} failed: ${error.stdout ?? ""} ${error.stderr ?? error.message}`, {
      cause: error,
    });
  }
}
try {
  const packIndex = process.argv.indexOf("--pack-dir");
  const packed = packIndex < 0 ? join(stage, "packed") : resolve(process.argv[packIndex + 1]);
  const consumer = join(stage, "consumer");
  await mkdir(consumer);
  if (packIndex < 0) await packPackages(root, packed);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  const tarballs = (await readdir(packed))
    .filter((name) => name.endsWith(".tgz"))
    .map((name) => join(packed, name));
  assert.equal(tarballs.length, 4);
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...tarballs,
      "typescript@5.9.3",
      "@types/node@22",
    ],
    consumer,
  );
  const expected = await manifests(root);
  for (const pkg of expected) {
    const installed = JSON.parse(
      await readFile(join(consumer, "node_modules", pkg.name, "package.json"), "utf8"),
    );
    assert.equal(installed.version, pkg.version);
    assert.equal(installed.engines.node, ">=22");
    assert.equal(installed.publishConfig.access, "public");
    assert.equal(Object.keys(installed.exports["."])[0], "types");
    for (const [name, version] of Object.entries(installed.dependencies ?? {})) {
      assert.ok(!version.startsWith("workspace:"));
      const dependency = expected.find((item) => item.name === name);
      if (dependency) assert.equal(version, dependency.version);
    }
  }
  await readFile(join(consumer, "node_modules/@dojocoding/hacienda-sdk/MIGRATION-v4.4.md"), "utf8");
  const readme = await readFile(join(root, "packages/sdk/README.md"), "utf8");
  const example = readme.split("```ts\n")[1].split("```")[0];
  await writeFile(
    join(consumer, "consumer.ts"),
    example +
      '\nconst issuedUsernameClient = new HaciendaClient({ environment: Environment.Sandbox, credentials: { username: \"cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr\", password: \"synthetic\" } });\nexport { issuedUsernameClient };\n' +
      '\nimport { createServer } from "@dojocoding/hacienda-mcp";\nimport { FacturaElectronicaSchema } from "@dojocoding/hacienda-shared";\nexport const extra = {createServer, FacturaElectronicaSchema};\n',
  );
  for (const resolution of ["NodeNext", "Bundler"]) {
    await writeFile(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2023",
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          strict: true,
          skipLibCheck: false,
          noEmit: true,
          types: ["node"],
        },
        include: ["consumer.ts"],
      }),
    );
    run(
      process.execPath,
      [join(consumer, "node_modules/typescript/bin/tsc"), "--pretty", "false"],
      consumer,
    );
  }
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
import {writeFile, readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {SIMPLE_INVOICE} from "./fixtures.mjs";
import {buildFacturaXml,validateDocumentXml,HaciendaClient,Environment,loadCredentials} from "@dojocoding/hacienda-sdk";
import {createServer} from "@dojocoding/hacienda-mcp";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
const issuedUsername="cpf-01-1234-5678@stag.comprobanteselectronicos.go.cr";
assert.deepEqual(loadCredentials({username:issuedUsername,password:"synthetic"}),{username:issuedUsername,password:"synthetic"});
let tokenRequests=0;
const issuedClient=new HaciendaClient({environment:Environment.Sandbox,credentials:{username:issuedUsername,password:"synthetic"},fetchFn:async(url,init)=>{
  tokenRequests++;
  assert.ok(String(url).includes("/rut-stag/"));
  assert.equal(new URLSearchParams(init.body).get("username"),issuedUsername);
  return new Response(JSON.stringify({access_token:"synthetic-access",refresh_token:"synthetic-refresh",expires_in:300,refresh_expires_in:36000,token_type:"bearer"}),{status:200});
}});
await issuedClient.authenticate(); assert.equal(tokenRequests,1); assert.equal(issuedClient.isAuthenticated,true);
const xml=buildFacturaXml(SIMPLE_INVOICE);
const result=await validateDocumentXml(xml); assert.equal(result.valid,true,JSON.stringify(result.issues));
const example="./node_modules/@dojocoding/hacienda-sdk/examples/sandbox.mjs";
execFileSync(process.execPath,[example,"prepare","./node_modules/@dojocoding/hacienda-sdk/examples/order.json","./example-run"],{timeout:15000});
const prepared=JSON.parse(await readFile("./example-run/invoice.json","utf8"));
assert.equal(prepared.resumenFactura.totalComprobante,113000);
assert.deepEqual(prepared.resumenFactura.medioPago,[{tipoMedioPago:"01",totalMedioPago:113000}]);
await createServer().close();
await writeFile("invoice.json",JSON.stringify(SIMPLE_INVOICE)); await writeFile("invoice.xml",xml);
const cli="./node_modules/@dojocoding/hacienda-cli/dist/index.js";
const cliManifest=JSON.parse(await readFile("./node_modules/@dojocoding/hacienda-cli/package.json","utf8"));
assert.equal(execFileSync(process.execPath,[cli,"--version"],{encoding:"utf8",timeout:15000}).trim(),cliManifest.version);
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
  await client.connect(transport);
  const mcpManifest=JSON.parse(await readFile("./node_modules/@dojocoding/hacienda-mcp/package.json","utf8"));
  assert.equal(client.getServerVersion().version,mcpManifest.version);
  const tools=await client.listTools(); assert.equal(tools.tools.length,6);
  const resource=await client.readResource({uri:"hacienda://schemas/factura"});
  const schema=JSON.parse(resource.contents[0].text);
  assert.deepEqual(schema.required,tools.tools.find(tool=>tool.name==="create_invoice").inputSchema.required);
  assert.ok(schema.required.includes("proveedorSistemas"));
} catch(error) { console.error(stderr); throw error; }
finally { clearTimeout(timer); await client.close(); }
console.log("Installed metadata, strict TypeScript examples, packaged sandbox preparation, ESM SDK, CLI validation/dry-run, and MCP stdio checks passed.");
`,
  );
  process.stdout.write(run(process.execPath, ["smoke.mjs"], consumer));
} finally {
  await rm(stage, { recursive: true, force: true });
}
