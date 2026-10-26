# Tasks: add-codes-extraction

## 1. Setup

- [x] 1.1 Crear `scripts/codes-extract/` con `extract.mjs` (CLI), `lib/scan.mjs`
      y `lib/render.mjs`, y tests colocados en `scripts/codes-extract/*.test.mjs`
      (descubiertos por `run-script-tests.mjs`, no en `test/`); entrada
      `codes:extract` en `package.json` (`node scripts/codes-extract/extract.mjs`)

## 2. Scanner

- [x] 2.1 `scan.mjs`: parser de stack para el subconjunto XSD (element /
      complexType / sequence / simpleType / annotation / documentation /
      enumeration), atributos `name`/`value` raw entre comillas sin decodificar
      entidades, documentación con trim + colapso de espacios; formas no
      cubiertas (`xs:union`, simpleType con `name` dentro de `xs:element`) →
      error fatal (exit 1, no warn)
- [x] 2.2 Extracción de `xs:simpleType` nombrado con enumeraciones → clave =
      nombre del tipo, `kind: named-simple-type`
- [x] 2.3 Extracción de `xs:element` + `xs:simpleType` anónimo → clave = ruta
      de ancestros desde la raíz del XSD, `kind: element-anonymous`;
      `xs:ref` no se sigue; XSD sin ningún `xs:element` de primer nivel →
      error fatal
- [x] 2.4 Fusión por clave entre XSD del set: `sources[]` en orden
      lexicográfico (rutas relativas a `packages/sdk/schemas/`), valores por
      código exacto, primera descripción gana, advertencias en stderr
      (`codes:extract:`) para descripciones divergentes; conjuntos de códigos
      divergentes bajo la misma clave → error fatal
- [x] 2.5 Resolución del set: leer `manifest.json` (ausente/JSON
      inválido/sin `currentSet` → fatal), tomar `currentSet`, mapear a
      `packages/sdk/schemas/<set>/` (directorio inexistente → fatal); error
      fatal (exit 1, sin escribir) ante XSD ausente/malformado o colisión de
      claves

## 3. Render y CLI

- [x] 3.1 `render.mjs`: emisión de `codes.json` (schemaVersion, currentSet,
      generatedFrom, tablas ordenadas por key, valores en orden de documento del
      primer source; rutas POSIX relativas a `packages/sdk/schemas/`); escritura
      atómica (tmp + rename) solo tras parseo completo
- [x] 3.2 CLI: exit 0 con o sin warnings; warnings por stderr con prefijo
      `codes:extract:`; sin red

## 4. Tests

- [x] 4.1 Tests unitarios con fixtures XSD sintéticas: simpleType nombrado,
      anónimo bajo elemento, dos anónicas homónimas en un XSD (claves distintas),
      colisión fatal, código con/sin mayúsculas como entradas separadas,
      descripción divergente entre XSD → warn + primera gana, NFC vs NFD como
      códigos distintos, XML inválido → exit 1 sin tocar el archivo, XSD válido
      sin raíz `xs:element` → fatal, `xs:union` → fatal, simpleType nombrado
      dentro de `xs:element` → fatal, conjuntos de códigos distintos bajo la
      misma clave → fatal, manifest ausente/JSON inválido/sin
      `currentSet`/directorio del set inexistente → fatal
- [x] 4.2 Test de integración sobre el set real: ejecuta el extractor en
      directorio temporal, aserciones de estructura (schemaVersion, currentSet,
      ≥ 40 tablas, toda tabla con sources/clave/values, códigos no vacíos) sin
      congelar valores oficiales
- [x] 4.3 Idempotencia: dos ejecuciones consecutivas → bytes idénticos
      (fixtures y, en el test de integración, sobre el set real ya copiado a tmp)
- [x] 4.4 `pnpm test:scripts` descubre y corre los tests nuevos

## 5. Artefacto y docs

- [x] 5.1 Generar `packages/sdk/schemas/codes.json` con `pnpm codes:extract`
      sobre el set vigente y commitearlo
- [x] 5.2 README de `packages/sdk/schemas/`: sección "codes.json" (origen,
      regeneración, semántica de clave, rutas relativas a ese directorio, SDK no
      lo consume aún)
- [x] 5.3 `pnpm verify` en verde con el artefacto commiteado (requiere la
      sección 6)

## 6. Modificación a spec-verify

- [x] 6.1 `scripts/spec-verify.mjs`: ampliar la allowlist de la raíz de
      `packages/sdk/schemas/` de `manifest.json`/`README.md` a incluir
      `codes.json`; test colocado que verifique que `codes.json` presente no
      hace fallar y que un archivo no declarado sí
