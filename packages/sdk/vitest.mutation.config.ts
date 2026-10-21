import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/xml/schema-validator.spec.ts",
      "src/xml/document-identity.spec.ts",
      "src/xml/security.spec.ts",
      "src/tax/exact-decimal-boundary.spec.ts",
      "src/signing/document-policy-binding.spec.ts",
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
