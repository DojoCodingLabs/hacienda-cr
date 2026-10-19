import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    rules: {
      // Candado de literales de catálogo (add-codes-generation, D8): un
      // literal de uno o dos dígitos en negocio casi siempre es un código de
      // catálogo escrito a mano; usa la constante generada correspondiente
      // (p. ej. SaleCondition.CREDITO en vez de "02").
      //
      // Exclusiones del selector — sin constante que citar, por diseño:
      // - códigos de ubicación con puntos ("1.1", "1.1.1"; tablas gigantes
      //   sin pareja en fase 2);
      // - códigos de moneda de tres letras (alfabéticos: no casan con \d{1,2}).
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^\\d{1,2}$/]",
          message:
            "Literal de código de catálogo prohibido en negocio: usa la constante generada " +
            'correspondiente (p. ej. SaleCondition.CREDITO en vez de "02"); los catálogos ' +
            "viven en shared/src/generated.",
        },
      ],
    },
  },
  {
    // Excepciones del candado de literales, cada una con su motivo:
    files: [
      "shared/src/generated/**", // el propio generador escribe los códigos
      "shared/src/constants/**", // los catálogos sin pareja quedan aquí como datos, no como negocio
      "**/*.spec.ts", // las pruebas fijan valores a propósito
      "**/__fixtures__/**", // datos de prueba: fijan códigos a propósito, como los specs
      "packages/sdk/src/api/error-codes.ts", // catálogo de rechazos de la API (no XSD); candidato a fase futura
      "packages/sdk/src/auth/types.ts", // enum IdType del API de autenticación (no XSD; duplica IdentificationType 01-04); candidato a fase futura
      "packages/sdk/src/clave/build-clave.ts", // ceros de relleno de padStart y sucursal/POS por defecto, no códigos de catálogo
      // Camino exacto: caso cerrado y revisado (IVA13 ordinario, pago totalmente
      // asignado). Sus literales son hechos declarados del caso (el código de
      // impuesto, la tarifa y su código, el tipo de comprobante), no
      // catálogos de negocio; y sus bytes de salida están fijados por el
      // baseline publicado del SDK. Candidato a la siguiente fase del candado,
      // cuando el camino exacto cubra más de un caso.
      "packages/sdk/src/tax/exact-*.ts",
      "packages/sdk/src/documents/exact-*.ts",
      "shared/src/schemas/exact-*.ts",
      // Ceros de relleno de padStart/padEnd: no son códigos de catálogo. Los
      // códigos de catálogo de estos archivos ya usan las constantes.
      "packages/sdk/src/api/comprobantes.ts",
      "packages/sdk/src/signing/response-verifier.ts",
      "packages/sdk/src/xml/document-identity.ts",
      "shared/src/schemas/history.ts",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.js", "**/*.mjs"],
  },
);
