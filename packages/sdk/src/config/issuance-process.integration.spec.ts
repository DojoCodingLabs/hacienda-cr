import { it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestP12 } from "../__fixtures__/signing.js";
import { SIMPLE_INVOICE } from "../__fixtures__/invoices.js";
import { getCurrentSequence, getAssignedDocument } from "./sequence-store.js";
const run = promisify(execFile);
it("serializes first issuance across processes and recovers committed bytes after SIGKILL", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hacienda-issuance-process-"));
  const sdkUrl = new URL("../../dist/index.js", import.meta.url).href;
  const code = `(async()=>{
  const sdk=await import(process.argv[1]),fs=await import("node:fs/promises");
  const configDir=process.argv[2],invoice=JSON.parse(await fs.readFile(configDir+"/fixture.json","utf8"));
  const p12=await fs.readFile(configDir+"/synthetic.p12");
  await sdk.assignSequenceWithDocument("01",async sequence=>{
   invoice.clave=invoice.clave.slice(0,31)+String(sequence).padStart(10,"0")+invoice.clave.slice(41);
   invoice.numeroConsecutivo=invoice.clave.slice(21,41);
   const xml=await sdk.signXml(sdk.buildFacturaXml(invoice),p12,"synthetic");
   return sdk.createStoredDocument({clave:invoice.clave,xml,situation:"normal",generatedAt:new Date(invoice.fechaEmision)});
  },{configDir});
  if(process.argv[3]==="kill") process.kill(process.pid,"SIGKILL");
 })().catch(error=>{console.error(error);process.exitCode=1;});`;
  try {
    await writeFile(join(directory, "fixture.json"), JSON.stringify(SIMPLE_INVOICE), {
      mode: 0o600,
    });
    await writeFile(join(directory, "synthetic.p12"), createTestP12("synthetic"), { mode: 0o600 });
    await Promise.all([
      run(process.execPath, ["-e", code, sdkUrl, directory, "ok"], { timeout: 20000 }),
      run(process.execPath, ["-e", code, sdkUrl, directory, "ok"], { timeout: 20000 }),
    ]);
    await expect(
      run(process.execPath, ["-e", code, sdkUrl, directory, "kill"], { timeout: 20000 }),
    ).rejects.toMatchObject({ signal: "SIGKILL" });
    expect(await getCurrentSequence("01", undefined, undefined, { configDir: directory })).toBe(3);
    const ledger = JSON.parse(await readFile(join(directory, "sequences.json"), "utf8")) as {
      documents: Record<string, { xml: string }>;
    };
    expect(Object.keys(ledger.documents)).toHaveLength(3);
    for (const [clave, doc] of Object.entries(ledger.documents))
      expect((await getAssignedDocument(clave, { configDir: directory }))?.xml).toBe(doc.xml);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
