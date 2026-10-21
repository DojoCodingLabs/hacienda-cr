import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/xml/fuzzing.spec.ts",
      "src/xml/hostile-inputs.spec.ts",
      "src/documents/parser.spec.ts",
      "src/documents/parser-boundary.spec.ts",
      "src/tax/exact-ordinary-compatibility.spec.ts",
      "src/tax/exact-decimal.properties.spec.ts",
      "src/signing/document-verifier.spec.ts",
    ],
  },
});
