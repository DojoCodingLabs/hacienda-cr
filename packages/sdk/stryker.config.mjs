/**
 * Mutation testing over the money-critical parsing paths (A6).
 *
 * The scope is deliberately small: the modules where a surviving mutant means
 * a silent defect in a document that Hacienda would accept. The initial global regression floor is 45%;
 * 80 % is the target, and `high` records it.
 *
 * The suite is the one that already guards these modules: the hostile input
 * corpus, the document parser and the published exact baseline.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
const config = {
  packageManager: "pnpm",
  plugins: ["@stryker-mutator/vitest-runner", "@stryker-mutator/typescript-checker"],
  testRunner: "vitest",
  checkers: ["typescript"],
  vitest: { configFile: "vitest.mutation.config.ts" },
  mutate: [
    "src/documents/parser.ts",
    "src/xml/input-limits.ts",
    "src/xml/document-identity.ts",
    "src/xml/schema-validator.ts",
    "src/tax/exact-decimal.ts",
  ],
  mutator: { excludedMutations: ["StringLiteral", "ArrayDeclaration"] },
  // Initial global regression floor; per-contract adversarial tests remain mandatory.
  thresholds: { high: 80, low: 45, break: 45 },
  reporters: ["clear-text", "json"],
  timeoutMS: 60000,
  concurrency: 2,
};
export default config;
