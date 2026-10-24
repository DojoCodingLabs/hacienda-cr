## Context

Véase `proposal.md` — Why para la motivación. Estado actual que condiciona el
diseño:

- `scripts/verify.mjs` ejecuta `turbo run lint typecheck build test`. El script
  `test` de cada paquete es `vitest run`, sin `--coverage`. En Vitest 4
  `coverage.enabled` es `false` por defecto y `coverage.thresholds` solo se
  evalúa con cobertura activa, así que hoy ningún umbral puede romper CI.
- En Vitest 4, `coverage.include` por defecto incluye solo archivos importados
  por los specs, y `coverage.exclude` por defecto está vacío: ni las fuentes sin
  spec ni el bundle construido se excluyen por configuración.
- Medición de referencia (2026-10-20, Node 24.19 local, `vitest run --coverage`,
  reportes fuera del repo). No es el baseline de CI: se debe repetir en Node 22.

  | paquete | statements | branches | functions | lines | nota                                  |
  | ------- | ---------- | -------- | --------- | ----- | ------------------------------------- |
  | shared  | 55.69      | 32.67    | 44.06     | 55.03 | 37 de 39 fuentes medidas              |
  | sdk     | 48.30      | 40.48    | 49.14     | 49.47 | contaminado por `dist/`               |
  | sdk     | 80.45      | 75.38    | 84.27     | 81.33 | solo `src/`, sin `__fixtures__`       |
  | cli     | 31.65      | 28.88    | 62.29     | 30.96 | 16 de 18 fuentes medidas              |
  | mcp     | 95.69      | 67.00    | 97.87     | 96.11 | 14 de 15 fuentes medidas              |
  | mock    | —          | —        | —         | —     | no medido: su spec escribe en el repo |

- En el SDK, `dist/` representa el 47.8% de los statements medidos: 3 archivos
  del bundle frente a 106 archivos de `src/` (91 fuentes y 15 fixtures). CLI y
  MCP no muestran `dist/` porque `allowExternal` es `false` y el bundle queda
  fuera del root del paquete. La contaminación es específica del SDK.
- Solo `packages/sdk/src/config/crash-harness.spec.ts` importa estáticamente el
  bundle. `sequence-process.integration.spec.ts` usa `dist/index.js` en un
  proceso hijo, cuya cobertura no se recolecta; no contamina el reporte.
- `packages/sdk/src/delivery/` no tiene specs propias. Se ejercita desde
  `crash-harness.spec.ts` (bundle) y desde `packages/mock/src/sdk-e2e.spec.ts`
  (bundle). `orchestrator.spec.ts` no toca `persist`, `store` ni `resumePending`.
- Ese spec del mock usa `baseDir: "./.delivery-test-linkdown"` y deja
  `packages/mock/.delivery-test-linkdown/` sin trackear. Es una fuga existente,
  no un archivo a borrar por esta tarea.
- `scripts/verify-packages.mjs` instala tarballs y ejecuta `tsc` y un smoke
  runtime; no hay instrumentación de cobertura en el consumidor aislado.

## Goals / Non-Goals

**Goals:**

- Atribuir la cobertura solo a las fuentes de cada paquete, incluyendo fuentes
  que ningún spec importe y excluyendo bundle, specs y fixtures.
- Medir un baseline reproducible por paquete y fijar umbrales por debajo de él.
- Hacer que `pnpm verify` falle por cobertura y demostrar la falla con un caso
  negativo.
- Cubrir con specs propios los nueve schemas exact de shared, el outbox, el
  camino persistente del orquestador y los handlers del CLI con bajo coverage.
- Mantener el aislamiento: temporales por spec, sin `~/.hacienda-cr` ni escritura
  en el repositorio.

**Non-Goals:**

- Reescribir lógica de negocio para hacerla más testeable.
- Cambiar comportamiento de entrega, consecutivo o firma.
- Añadir dependencias, cambios de API pública o changeset.
- Fijar un 90% global ni umbrales por archivo en módulos no críticos.
- Presentar la cobertura como conformidad XSD, autenticidad de firma o
  aceptación por Hacienda.

## Decisions

**1. Atribuir con `coverage.include: ["src/**/*.ts"]`, no solo excluir `dist/`.**

- Rationale: `include` resuelve tres problemas a la vez — retira el bundle,
  retira fixtures y specs, y hace visible una fuente que ningún spec importa.
  `exclude: ["dist/**"]` solo quitaría el bundle y dejaría la métrica ciega a
  código no importado.
- Alternativa considerada: mover `crash-harness.spec.ts` a importar fuentes.
  Rechazada: duplicaría lo que ya prueba el consumidor empaquetado y debilitaría
  el contrato del bundle publicado.

**2. La puerta corre `test:coverage`, no `coverage.enabled: true` global.**

- Rationale: `scripts/verify.mjs` reemplaza `test` por `test:coverage` en la
  invocación de Turbo. La tarea ya existe en `turbo.json` y su salida
  `coverage/**` se cachea. Los comandos locales `pnpm test` siguen rápidos y
  `pnpm test:coverage` sigue disponible.
- Alternativa considerada: activar coverage en cada config. Rechazada: obliga a
  instrumentar cada ejecución local y de watch.
- `turbo.json` deja de declarar `coverage/**` como salida de `test`, porque ese
  script no produce cobertura.

**3. Baseline medido antes de fijar umbrales, en Node 22.**

- Rationale: el baseline determina el umbral; fijarlo antes de corregir la
  atribución obliga a reescribirlo. Node 22 es la versión de CI (`.nvmrc`); Node
  24 puede variar ligeramente. Los valores se registran con comando y fecha.
- Regla: redondear 1–2 puntos por debajo de lo medido y no subir un umbral sin
  una medición nueva. La tabla de Context es referencia, no baseline de CI.

**4. Piso global por paquete más umbrales por glob en módulos críticos.**

- Rationale: un piso global deja que un módulo crítico baje mientras otro sube.
  Vitest permite thresholds por glob. Aplicar solo a clave, firma, entrega y
  schemas exact, donde el error tiene costo fiscal o de secuencia.
- Alternativa considerada: `perFile: true` global. Rechazada: demasiado frágil
  para módulos auxiliares y ruidoso en el primer PR.

**5. Todo spec de persistencia usa un temporal por prueba.**

- Rationale: el outbox escribe archivos; el estado compartido produce falsos
  positivos y fugas como `.delivery-test-linkdown`. `mkdtemp` + `rm` en
  `finally` hace la prueba repetible y deja `git status` limpio.
- Se corrige el spec del mock para usar `mkdtemp`; el directorio ya filtrado no
  se elimina como parte de este cambio.

**6. Los handlers del CLI se prueban por su efecto observable.**

- Rationale: los tests actuales solo validan metadatos. Se ejecuta `run()` con
  red mockeada, `configDir` temporal y salida capturada, verificando archivo
  escrito, JSON válido y código de salida. `process.exitCode` se restablece entre
  specs.
- El `.p12` se genera en runtime con node-forge: `*.p12` está en `.gitignore` y
  el fixture del SDK (`src/__fixtures__/signing.ts`) no se exporta. Se duplica el
  generador mínimo en el fixture del CLI en vez de importar fuentes del SDK
  cruzando paquetes.

**7. El consumidor empaquetado prueba comportamiento, no cobertura.**

- Rationale: los tarballs no tienen instrumentación ni fuentes. El smoke
  existente ya valida tipos y runtime; se le añade un roundtrip del outbox en
  `mkdtemp` (persistir, leer, transicionar, reintentar) y limpieza.
- Alternativa considerada: "cobertura mínima en consumidor". Rechazada: no es
  medible y duplicaría la puerta del workspace.

**8. Documentación y versionado.**

- `docs/testing.md` y `CONTRIBUTING.md` describen la puerta y dejan de presentar
  la cobertura como métrica meramente informativa.
- Sin changeset: la configuración de Vitest y los specs no se publican; `files`
  solo incluye `dist` y el runtime no cambia.

## Risks / Trade-offs

- [Risk] Umbrales frágiles por diferencias de Node o del proveedor v8. →
  Mitigation: medir en Node 22, redondear a la baja y documentar comando y fecha.
- [Risk] Un piso global permite que un módulo crítico caiga. → Mitigation:
  thresholds por glob en clave, firma, entrega y schemas exact.
- [Risk] Excluir `dist/` oculte una regresión del bundle publicado. →
  Mitigation: el consumidor empaquetado sigue validando el tarball por separado.
- [Risk] La cobertura añada tiempo a CI. → Mitigation: medición de referencia
  21.8s (SDK), 4.0s (CLI), 2.3s (shared) y 3.9s (MCP); el job tiene 10 minutos.
- [Risk] Specs nuevos escriban en el repo o en el perfil del usuario. →
  Mitigation: temporal por spec, escenario de `git status` limpio y revisión del
  `configDir`.
- [Risk] La cobertura se lea como corrección fiscal. → Mitigation: las suites de
  XSD, firma y propiedades siguen siendo la evidencia autoritativa; la
  documentación lo repite.
- [Risk] El baseline cambie al añadir specs. → Mitigation: secuencia atribución →
  baseline → specs → umbrales; los umbrales se fijan al final.

## Migration Plan

Sin migración de runtime. Los cambios entran por PR y no alteran artefactos
publicados. Rollback: revertir el commit de configuración y specs; la puerta
vuelve a ser informativa sin afectar la API.
