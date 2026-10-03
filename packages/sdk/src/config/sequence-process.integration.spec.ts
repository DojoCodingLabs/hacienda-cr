import { it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getCurrentSequence } from "./sequence-store.js";
const run = promisify(execFile);
it("allocates unique sequences and preserves resets across independent processes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hacienda-multiprocess-"));
  try {
    const sdkUrl = new URL("../../dist/index.js", import.meta.url).href;
    const code = `(async()=>{ const sdk=await import(process.argv[1]); const configDir=process.argv[2]; const idx=Number(process.argv[3]); const values=[];
      for(let i=0;i<12;i++) { values.push(await sdk.getNextSequence("01","001","00001",{configDir}));
        if(i%3===0) await sdk.resetSequence("02","001",String(idx+1).padStart(5,"0"),i,{configDir}); }
      console.log(JSON.stringify(values)); })().catch(error=>{console.error(error);process.exitCode=1;});`;
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, idx) =>
        run(process.execPath, ["-e", code, sdkUrl, dir, String(idx)], { timeout: 15000 }),
      ),
    );
    const values = results.flatMap((result) => JSON.parse(result.stdout) as number[]);
    expect(new Set(values).size).toBe(48);
    expect(values.sort((a, b) => a - b)).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
    expect(await getCurrentSequence("01", "001", "00001", { configDir: dir })).toBe(48);
    for (let idx = 0; idx < 4; idx++)
      expect(
        await getCurrentSequence("02", "001", String(idx + 1).padStart(5, "0"), { configDir: dir }),
      ).toBe(9);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 20000);
