import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Floors apply independently: more coverage in the parser cannot hide a lost
// monetary, identity or XML-input check. These are regression floors, not a
// claim that every surviving mutation represents an exploitable defect.
export const MUTATION_FLOORS = {
  "src/documents/parser.ts": 45,
  "src/tax/exact-decimal.ts": 75,
  "src/xml/document-identity.ts": 60,
  "src/xml/input-limits.ts": 65,
  "src/xml/schema-validator.ts": 65,
};
export function verifyMutationReport(report, scope) {
  if (scope !== undefined && !Object.hasOwn(MUTATION_FLOORS, scope))
    throw new Error("Unknown mutation scope");
  const results = [];
  for (const [file, floor] of Object.entries(MUTATION_FLOORS).filter(
    ([file]) => scope === undefined || file === scope,
  )) {
    const mutants = report?.files?.[file]?.mutants;
    if (!Array.isArray(mutants) || !mutants.length)
      throw new Error(`Missing mutation evidence for ${file}`);
    let detected = 0,
      total = 0;
    for (const mutant of mutants) {
      if (["Killed", "Timeout"].includes(mutant.status)) {
        detected++;
        total++;
      } else if (["Survived", "NoCoverage"].includes(mutant.status)) total++;
      else if (!["Ignored", "CompileError", "RuntimeError"].includes(mutant.status))
        throw new Error(`Incomplete mutation evidence for ${file}`);
    }
    const score = total ? (detected * 100) / total : 0;
    if (score < floor)
      throw new Error(`Mutation regression in ${file}: ${score.toFixed(2)}% < ${floor}%`);
    results.push({ file, score, floor, detected, total });
  }
  return results;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const file =
    process.argv[2] ??
    resolve(import.meta.dirname, "../packages/sdk/reports/mutation/mutation.json");
  const results = verifyMutationReport(JSON.parse(readFileSync(file, "utf8")), process.argv[3]);
  for (const result of results)
    console.log(`mutation: ${result.file}: ${result.score.toFixed(2)}% (floor ${result.floor}%)`);
}
