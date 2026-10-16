import assert from "node:assert/strict";
import test from "node:test";
import { Linter } from "eslint";
import fullConfig from "../../eslint.config.mjs";

/**
 * Prueba del candado 2 (R5): importa la regla y las excepciones del config
 * real y las ejecuta con el Linter de flat-config sobre snippets JS (espree).
 * Si alguien edita, rebaja o borra la regla en eslint.config.mjs, esta suite
 * falla.
 *
 * Adaptación de compatibilidad: `Linter.verify` exige un bloque con `files`
 * que case el archivo (en una corrida real de eslint lo aportan los bloques
 * universales del config) y no casa los patrones de directorio que terminan
 * en globstar sin componente final (sí lo hace eslint en disco). Se replica
 * el matching añadiendo un comodín final; la regla y la lista de excepciones
 * siguen siendo las del config real, sin tocarlas.
 */

const blocks = Array.isArray(fullConfig) ? fullConfig : [fullConfig];
const ruleBlock = blocks.find((block) => {
  const entry = block.rules?.["no-restricted-syntax"];
  return entry != null && entry !== "off";
});
const exceptionBlock = blocks.find(
  (block) => block.files?.length && block.rules?.["no-restricted-syntax"] === "off",
);

test("el config real define el candado de literales con severidad error", () => {
  assert.ok(ruleBlock, "eslint.config.mjs debe definir no-restricted-syntax");
  const entry = ruleBlock.rules["no-restricted-syntax"];
  assert.equal(entry[0], "error", "la severidad debe ser error, no warning");
  assert.equal(
    entry[1].selector,
    "Literal[value=/^\\d{1,2}$/]",
    "el selector del candado cambió; revisa la task 3.1 y su justificación",
  );
  assert.match(entry[1].message, /generated/, "el mensaje debe apuntar a shared/src/generated");
  assert.ok(exceptionBlock, "el config real debe declarar las excepciones con files");
});

const linterBlocks = [
  { files: ["**/*.ts"] }, // matcher exigido por Linter.verify (ver nota del módulo)
  ruleBlock,
  {
    ...exceptionBlock,
    files: exceptionBlock.files.map((pattern) =>
      pattern.endsWith("/**") ? `${pattern}/*` : pattern,
    ),
  },
];

function lint(code, filename) {
  return new Linter({ configType: "flat" }).verify(code, linterBlocks, filename);
}

const SNIPPET = 'export const condicionVenta = "02";';

test('literal "02" en ruta de negocio → 1 error del candado', () => {
  const messages = lint(SNIPPET, "packages/sdk/src/xml/business.ts");
  assert.equal(messages.length, 1, JSON.stringify(messages));
  assert.equal(messages[0].ruleId, "no-restricted-syntax");
  assert.equal(messages[0].severity, 2, "el candado debe ser error");
  assert.match(messages[0].message, /SaleCondition\.CREDITO/);
});

test("el mismo literal dentro de shared/src/generated/ → 0 (exento)", () => {
  assert.deepEqual(lint(SNIPPET, "shared/src/generated/payment-method.ts"), []);
});

test("el mismo literal en el archivo con allowlist → 0 (exento)", () => {
  assert.deepEqual(lint(SNIPPET, "packages/sdk/src/api/error-codes.ts"), []);
});

test("los catálogos y pruebas quedan exentos por decisión documentada", () => {
  assert.deepEqual(lint(SNIPPET, "shared/src/constants/tax-codes.ts"), []);
  assert.deepEqual(lint(SNIPPET, "shared/src/schemas/common.spec.ts"), []);
  assert.deepEqual(lint(SNIPPET, "packages/sdk/src/__fixtures__/invoices.ts"), []);
  assert.deepEqual(lint(SNIPPET, "packages/sdk/src/auth/types.ts"), []);
  assert.deepEqual(lint(SNIPPET, "packages/sdk/src/clave/build-clave.ts"), []);
});
