import { test } from "node:test";
import assert from "node:assert/strict";
import { MUTATION_FLOORS, verifyMutationReport } from "./verify-mutation-report.mjs";
function passing() {
  return {
    files: Object.fromEntries(
      Object.keys(MUTATION_FLOORS).map((file) => [file, { mutants: [{ status: "Killed" }] }]),
    ),
  };
}
test("checks each critical module independently instead of a misleading global score", () => {
  const report = passing();
  report.files["src/documents/parser.ts"].mutants = Array.from({ length: 1000 }, () => ({
    status: "Killed",
  }));
  report.files["src/tax/exact-decimal.ts"].mutants = [{ status: "Survived" }];
  assert.throws(() => verifyMutationReport(report), /exact-decimal/);
});
test("rejects missing and incomplete evidence", () => {
  const report = passing();
  delete report.files["src/xml/input-limits.ts"];
  assert.throws(() => verifyMutationReport(report), /Missing mutation evidence/);
  const incomplete = passing();
  incomplete.files["src/xml/input-limits.ts"].mutants = [{ status: "Pending" }];
  assert.throws(() => verifyMutationReport(incomplete), /Incomplete mutation evidence/);
});
test("does not count ignored or uncompilable mutants as successful detections", () => {
  const report = passing();
  report.files["src/xml/input-limits.ts"].mutants = [
    { status: "CompileError" },
    { status: "Ignored" },
  ];
  assert.throws(() => verifyMutationReport(report), /Mutation regression/);
  assert.equal(verifyMutationReport(passing()).length, 5);
});
test("a scoped CI report must satisfy its own module and cannot bypass unknown scopes", () => {
  const file = "src/tax/exact-decimal.ts";
  const report = { files: { [file]: { mutants: [{ status: "Killed" }] } } };
  assert.equal(verifyMutationReport(report, file).length, 1);
  assert.throws(() => verifyMutationReport(report), /Missing mutation evidence/);
  assert.throws(() => verifyMutationReport(report, "unreviewed.ts"), /Unknown mutation scope/);
});
