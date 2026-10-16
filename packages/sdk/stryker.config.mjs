/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "pnpm",
  plugins: ["@stryker-mutator/vitest-runner", "@stryker-mutator/typescript-checker"],
  testRunner: "vitest",
  testFiles: ["src/**/*.spec.ts"],
  mutate: ["src/documents/parser.ts", "src/xml/*.ts", "src/tax/calculator.ts"],
  ignoreMutations: ["StringLiteral", "ArrayDeclaration"],
  thresholds: { high: 80, low: 70, break: 60 },
  reporters: ["clear-text", "json"],
  timeoutMS: 60000,
  concurrency: 2,
};
export default config;
