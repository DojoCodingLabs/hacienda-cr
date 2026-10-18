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
      '\nimport { createServer } from "@dojocoding/hacienda-mcp";\nimport { FacturaElectronicaSchema } from "@dojocoding/hacienda-shared";\nexport const extra = {createServer, FacturaElectronicaSchema};\n' +
      '\nimport { calculateExactFe, calculateRetainedExactFe, buildExactFacturaXml, type ExactFeInput, type RetainedExactFeInput } from "@dojocoding/hacienda-sdk";\nimport { ExactFeInputSchema, RetainedExactFeInputSchema, ExactFeCalculatedSchema } from "@dojocoding/hacienda-shared";\nexport const exactFeContract = (input: ExactFeInput) => ({ calculated: ExactFeCalculatedSchema.parse(calculateExactFe(ExactFeInputSchema.parse(input))), xml: buildExactFacturaXml(input) });\n' +
      "\nexport const retainedFeReadContract = (input: RetainedExactFeInput) => calculateRetainedExactFe(RetainedExactFeInputSchema.parse(input));\n" +
      '\nimport { calculateExactTe, buildExactTiqueteXml, type ExactTeInput } from "@dojocoding/hacienda-sdk";\nimport { ExactTeInputSchema } from "@dojocoding/hacienda-shared";\nexport const exactTeContract = (input: ExactTeInput) => ({ calculated: calculateExactTe(ExactTeInputSchema.parse(input)), xml: buildExactTiqueteXml(input) });\n' +
      '\nimport { calculateExactNcTotal, buildExactNotaCreditoTotalXml, type ExactNcTotalInput } from "@dojocoding/hacienda-sdk";\nimport { ExactNcTotalInputSchema } from "@dojocoding/hacienda-shared";\nexport const exactNcContract = (input: ExactNcTotalInput) => ({ calculated: calculateExactNcTotal(ExactNcTotalInputSchema.parse(input)), xml: buildExactNotaCreditoTotalXml(input) });\n',
  );
  await writeFile(
    join(consumer, "history-consumer.ts"),
    `
import {listComprobantes,getComprobante,type HistoryRequestOptions} from "@dojocoding/hacienda-sdk";
import {ComprobantesQuerySchema,ComprobanteMetadataSchema,type ComprobantesListResponse,type ComprobanteDetail} from "@dojocoding/hacienda-shared";
export const history={listComprobantes,getComprobante,ComprobantesQuerySchema,ComprobanteMetadataSchema};
export type Contract={page:ComprobantesListResponse;detail:ComprobanteDetail;options:HistoryRequestOptions};
// @ts-expect-error unsupported history dates must migrate before authentication
const unsupported:Parameters<typeof listComprobantes>[1]={fechaEmisionDesde:"2026-01-01"};
void unsupported;
`,
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
        include: ["consumer.ts", "history-consumer.ts"],
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
  // Fixtures now generate coherent identities. Resolve their helper through the
  // installed public SDK rather than depending on repository source paths.
  const identitySource = (
    await readFile(join(root, "packages/sdk/src/__fixtures__/identity.ts"), "utf8")
  )
    .replaceAll("../clave/build-clave.js", "@dojocoding/hacienda-sdk")
    .replaceAll("../clave/types.js", "@dojocoding/hacienda-sdk");
  await writeFile(
    join(consumer, "identity.js"),
    ts.transpileModule(identitySource, { compilerOptions: { module: ts.ModuleKind.ESNext } })
      .outputText,
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
import {execFileSync,spawnSync} from "node:child_process";
import {SIMPLE_INVOICE} from "./fixtures.mjs";
import {calculateExactTe,buildExactTiqueteXml,HttpClient,listComprobantes,getComprobante,calculateExactNcTotal,buildExactNotaCreditoTotalXml,buildFacturaXml,calculateExactFe,calculateRetainedExactFe,buildExactFacturaXml,validateDocumentXml,HaciendaClient,Environment,loadCredentials,signXml,verifyHaciendaResponseXml,ResponseVerificationError} from "@dojocoding/hacienda-sdk";
import {ExactTeInputSchema,ExactFeInputSchema,RetainedExactFeInputSchema,XADES_POLICY_URI,XADES_POLICY_HASH,XADES_POLICY_HASH_ALGORITHM,ExonerationTypeSchema,UNITS_OF_MEASURE} from "@dojocoding/hacienda-shared";
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
const metadata={clave:SIMPLE_INVOICE.clave,fecha:SIMPLE_INVOICE.fechaEmision,emisor:{tipoIdentificacion:"02",numeroIdentificacion:"003101234567",nombre:"Packed synthetic issuer"},receptor:{tipoIdentificacion:"01",numeroIdentificacion:"001230456",nombre:"Packed synthetic receiver"},notasCredito:[]};
let historyFetches=0,historyAuth=0;
const historyClient=new HttpClient({envConfig:{name:"Synthetic",apiBaseUrl:"https://history.example.test/v1",idpTokenUrl:"https://history.example.test/token",clientId:"synthetic"},tokenManager:{getAccessToken:async()=>{historyAuth++;return "synthetic"}},fetchFn:async(url)=>{historyFetches++;return new Response(JSON.stringify(String(url).includes("?offset=")?[metadata]:metadata),{status:String(url).includes("?offset=")?206:200,headers:{"Content-Type":"application/json","Accept-Range":"resource 50","Content-Range":"0-10/100"}})},rateLimiterOptions:false,retryOptions:{maxRetries:0}});
const historyPage=await listComprobantes(historyClient,{limit:10,emisor:"02003101234567",receptor:"01001230456"});
assert.deepEqual(historyPage.comprobantes,[metadata]);assert.deepEqual(historyPage.pagination,{httpStatus:206,acceptRange:"resource 50",contentRange:"0-10/100"});
assert.equal(historyPage.totalRegistros,undefined);assert.equal(historyPage.comprobantes[0].estado,undefined);assert.equal(historyPage.comprobantes[0].comprobanteXml,undefined);
assert.deepEqual(await getComprobante(historyClient,SIMPLE_INVOICE.clave),metadata);
const beforeInvalid=[historyAuth,historyFetches];await assert.rejects(listComprobantes(historyClient,{fechaEmisionDesde:"2026-01-01"}));await assert.rejects(getComprobante(historyClient,"../recepcion/anything"));await assert.rejects(listComprobantes(historyClient,{}, {signal:AbortSignal.abort()}));assert.deepEqual([historyAuth,historyFetches],beforeInvalid);
const xml=buildFacturaXml(SIMPLE_INVOICE);
const exact={caseCode:"FE-domestic-ordinary-iva13-v1",clave:SIMPLE_INVOICE.clave,proveedorSistemas:SIMPLE_INVOICE.proveedorSistemas,codigoActividadEmisor:SIMPLE_INVOICE.codigoActividadEmisor,numeroConsecutivo:SIMPLE_INVOICE.numeroConsecutivo,fechaEmision:SIMPLE_INVOICE.fechaEmision,emisor:SIMPLE_INVOICE.emisor,receptor:SIMPLE_INVOICE.receptor,condicionVenta:"01",detalleServicio:[{numeroLinea:1,codigoCabys:"8310100000000",cantidad:"1",unidadMedida:"Sp",detalle:"Packed exact decimal fixture",precioUnitario:"8849557522123.89380",esServicio:true,impuesto:[{codigo:"01",codigoTarifaIVA:"08",tarifa:"13"}]}],codigoTipoMoneda:{codigoMoneda:"USD",tipoCambio:"513.12345"},medioPago:[{tipoMedioPago:"01",totalMedioPago:"9999999999999.99999"}]};
const exactRoundtrip=JSON.parse(JSON.stringify(exact));
const exactResult=calculateExactFe(exactRoundtrip),exactXml=buildExactFacturaXml(exactRoundtrip);
assert.equal(exactResult.resumenFactura.totalComprobante,"9999999999999.99999");
assert.ok(exactXml.includes("<TotalComprobante>9999999999999.99999</TotalComprobante>"));
assert.ok((await validateDocumentXml(exactXml)).valid);
assert.equal(buildExactFacturaXml(JSON.parse(JSON.stringify(exact))),exactXml);
assert.throws(()=>buildExactFacturaXml({...exact,resumenFactura:{totalComprobante:"0"}}));
for(const condition of ["02","10"]){
 for(const days of [undefined,"0","00000","100000"]){const credit={...exact,condicionVenta:condition,...(days===undefined?{}:{plazoCredito:days})};assert.equal(ExactFeInputSchema.safeParse(credit).success,false);assert.throws(()=>buildExactFacturaXml(credit));}
 for(const days of ["1","00030","99999"]){const credit={...exact,condicionVenta:condition,plazoCredito:days};assert.equal(ExactFeInputSchema.parse(credit).plazoCredito,days);assert.ok(buildExactFacturaXml(credit).includes("<PlazoCredito>"+days+"</PlazoCredito>"));}
}
for(const condition of ["09","11","13"]){const source={...exact,condicionVenta:condition};assert.equal(ExactFeInputSchema.safeParse(source).success,false);assert.throws(()=>calculateExactFe(source));assert.throws(()=>buildExactFacturaXml(source));if(condition==="13")assert.equal(calculateRetainedExactFe(RetainedExactFeInputSchema.parse(source)).resumenFactura.totalComprobante,"9999999999999.99999");else assert.equal(RetainedExactFeInputSchema.safeParse(source).success,false);}
for(const historical of [{...exact,condicionVenta:"02",plazoCredito:"00000"},{...exact,condicionVenta:"10"}]){const retained=RetainedExactFeInputSchema.parse(historical);assert.equal(calculateRetainedExactFe(retained).resumenFactura.totalComprobante,"9999999999999.99999");assert.throws(()=>buildExactFacturaXml(retained));}
const teClave=exact.clave.slice(0,29)+"04"+exact.clave.slice(31);
const {receptor:teReceiver,...teFacts}=exact;
const exactTe={...teFacts,caseCode:"TE-domestic-ordinary-iva13-v1",clave:teClave,numeroConsecutivo:teClave.slice(21,41)};
const teXml=buildExactTiqueteXml(ExactTeInputSchema.parse(JSON.parse(JSON.stringify(exactTe))));
assert.equal(calculateExactTe(exactTe).resumenFactura.totalComprobante,"9999999999999.99999");
assert.ok(teXml.includes("<TiqueteElectronico "));assert.ok(!teXml.includes("<Receptor>"));assert.ok(!teXml.includes("CodigoActividadReceptor"));
assert.ok((await validateDocumentXml(teXml)).valid);assert.equal(buildExactTiqueteXml(exactTe),teXml);
assert.ok(buildExactTiqueteXml({...exactTe,receptor:{nombre:"Actual named consumer"}}).includes("<Receptor>"));
assert.ok((await validateDocumentXml(buildExactTiqueteXml({...exactTe,receptor:teReceiver}))).valid);
assert.throws(()=>buildExactTiqueteXml({...exactTe,codigoActividadReceptor:"620100"}));
assert.throws(()=>buildExactTiqueteXml({...exactTe,condicionVenta:"12"}));
const ncClave=exact.clave.slice(0,29)+"03"+exact.clave.slice(31);
const exactNc={caseCode:"NC-domestic-ordinary-fe-total-iva13-v1",original:exact,clave:ncClave,numeroConsecutivo:ncClave.slice(21,41),fechaEmision:exact.fechaEmision,informacionReferencia:[{tipoDoc:"01",numero:exact.clave,fechaEmision:exact.fechaEmision,codigo:"01",razon:"Packed synthetic full credit"}]};
const ncXml=buildExactNotaCreditoTotalXml(JSON.parse(JSON.stringify(exactNc)));
assert.equal(calculateExactNcTotal(exactNc).resumenFactura.totalComprobante,"9999999999999.99999");
assert.ok(ncXml.includes("<TipoDocIR>01</TipoDocIR>"));assert.ok(ncXml.includes("<Numero>"+exact.clave+"</Numero>"));
assert.ok((await validateDocumentXml(ncXml)).valid);
assert.equal(buildExactNotaCreditoTotalXml(exactNc),ncXml);
assert.throws(()=>buildExactNotaCreditoTotalXml({...exactNc,total:"1"}));
assert.throws(()=>buildExactNotaCreditoTotalXml({...exactNc,informacionReferencia:[{...exactNc.informacionReferencia[0],razon:"ab"}]}));
assert.throws(()=>buildExactNotaCreditoTotalXml({...exactNc,original:{...exactNc.original,condicionVenta:"12"}}));
const preciseOriginalAt=exact.fechaEmision.replace(/(\\d{2}:\\d{2}:\\d{2})(?=Z|[+-])/,'$1.0009');
assert.ok(preciseOriginalAt.includes('.0009'));
const preciseNcAt=preciseOriginalAt.replace('.0009','.0001');
const earlierNc={...exactNc,fechaEmision:preciseNcAt,original:{...exact,fechaEmision:preciseOriginalAt},informacionReferencia:[{...exactNc.informacionReferencia[0],fechaEmision:preciseOriginalAt}]};
assert.throws(()=>calculateExactNcTotal(earlierNc));assert.throws(()=>buildExactNotaCreditoTotalXml(earlierNc));

assert.ok(XADES_POLICY_URI.includes("/xml-schemas/"));
assert.equal(XADES_POLICY_HASH,"DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=");
assert.equal(XADES_POLICY_HASH_ALGORITHM,"http://www.w3.org/2001/04/xmlenc#sha256");
assert.equal(ExonerationTypeSchema.safeParse("12").success,false);
assert.ok(UNITS_OF_MEASURE.includes("Ω"));
execFileSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout","synthetic.key","-out","synthetic.crt","-days","1","-subj","/CN=Offline packed consumer","-addext","basicConstraints=critical,CA:FALSE"],{stdio:"pipe",timeout:15000});
execFileSync("openssl",["pkcs12","-export","-legacy","-inkey","synthetic.key","-in","synthetic.crt","-out","synthetic.p12","-passout","pass:synthetic"],{stdio:"pipe",timeout:15000});
const signed=await signXml(xml,await readFile("synthetic.p12"),"synthetic");
const signedNc=await signXml(ncXml,await readFile("synthetic.p12"),"synthetic");
const ncValidation=await validateDocumentXml(signedNc,{requireSignature:true});assert.ok(ncValidation.valid&&ncValidation.hasSignature);
assert.ok(signed.includes(XADES_POLICY_URI));
assert.ok(signed.includes(XADES_POLICY_HASH));
assert.ok(signed.includes(XADES_POLICY_HASH_ALGORITHM));
const responseClave="50617102600310123456700100001010000000001112345678";
const responseXml='<MensajeHacienda xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda"><Clave>'+responseClave+'</Clave><NombreEmisor>Synthetic</NombreEmisor><TipoIdentificacionEmisor>02</TipoIdentificacionEmisor><NumeroCedulaEmisor>3101234567</NumeroCedulaEmisor><Mensaje>1</Mensaje><EstadoMensaje>Aceptado</EstadoMensaje><DetalleMensaje>Synthetic only</DetalleMensaje><TotalFactura>9999999999999.99999</TotalFactura></MensajeHacienda>';
const signedResponse=await signXml(responseXml,await readFile("synthetic.p12"),"synthetic");
const responseOptions={expectedClave:responseClave,expectedIssuer:{type:"02",number:"3101234567"},expectedReceiver:null,expectedTotal:"9999999999999.99999",trustedSignerCertificates:[await readFile("synthetic.crt","utf8")]};
const verifiedResponse=await verifyHaciendaResponseXml(signedResponse,responseOptions);
assert.equal(verifiedResponse.valid,true); assert.equal(verifiedResponse.status,"accepted"); assert.equal(verifiedResponse.total,"9999999999999.99999");
await assert.rejects(verifyHaciendaResponseXml(signedResponse.replace("Synthetic only","Tampered"),responseOptions),error=>error instanceof ResponseVerificationError && error.reason==="invalid-signature");

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
const invalidHistory=spawnSync(process.execPath,[cli,"list","--fechaDesde","2026-01-01","--json"],{encoding:"utf8",timeout:15000});
assert.equal(invalidHistory.status,1);assert.match(JSON.parse(invalidHistory.stdout).error,/Unsupported history option/);
const transport=new StdioClientTransport({command:process.execPath,args:["./node_modules/@dojocoding/hacienda-mcp/dist/cli.js"],stderr:"pipe"});
let stderr=""; transport.stderr.on("data",chunk=>{stderr+=chunk;});
const client=new Client({name:"packed-package-test",version:"1.0.0"});
const timer=setTimeout(()=>{ console.error("MCP initialization timed out",stderr); process.exit(1); },15000);
try {
  await client.connect(transport);
  const mcpManifest=JSON.parse(await readFile("./node_modules/@dojocoding/hacienda-mcp/package.json","utf8"));
  assert.equal(client.getServerVersion().version,mcpManifest.version);
  const tools=await client.listTools(); assert.equal(tools.tools.length,6);
  const historyTool=tools.tools.find(tool=>tool.name==="list_documents");assert.equal(historyTool.inputSchema.additionalProperties,false);assert.ok(historyTool.inputSchema.properties.emisor);assert.equal(historyTool.inputSchema.properties.fechaDesde,undefined);
  const invalidHistoryTool=await client.callTool({name:"list_documents",arguments:{fechaDesde:"2026-01-01"}});assert.equal(invalidHistoryTool.isError,true);assert.match(JSON.stringify(invalidHistoryTool.content),/Unrecognized|unrecognized/);

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
