## Context

El cambio `vendorize-policy-and-code-tables` (en vuelo) vendoriza el set `2024/v4.4` en `packages/sdk/schemas/` con `manifest.json` como fuente de verdad (23 entradas `files[]` con `path`, `sha256`, `bytes`, `vendored: true`). El SDK importa los XSD de 2026 con `?raw` en `packages/sdk/src/xml/schemas/index.ts` y tsup los empaqueta; los respaldos 2024 son la referencia de auditoría. No existe hoy ninguna verificación automática de integridad entre árbol y manifiesto: el INDENT 5.3/5.5/7 lo exige como fase 1. El repositorio ya tiene convención de scripts de raíz en `scripts/*.mjs` ejecutados por `node` (`verify.mjs`, `release.mjs`), regresiones de script como `scripts/*.test.mjs` vía `node --test` (`test:scripts`), y `scripts/verify.mjs` como orquestador de `pnpm verify`. Ver [proposal.md](proposal.md) para la motivación.

## Goals / Non-Goals

**Goals:**

- Un verificador offline (`pnpm spec:verify`) que falle ante hash/tamaño discrepante, archivo `vendored: true` ausente o archivo no declarado bajo `packages/sdk/schemas/`.
- Ejecución desde el build del SDK (antes de empaquetar los XSD) y desde `pnpm verify`.
- Mensajes de error autoexplicativos con plantillas fijas (archivo, esperado, obtenido, remedio `git diff`; `spec:update` solo se anticipa, no se invoca como comando).
- Regresiones de script estables con fixtures temporales, sin red y sin tocar el árbol vendorizado real.

**Non-Goals:**

- Fase 2 (fase INDENT): `spec:generate`, verificación de `codes.json` o tipos generados.
- Fase 3: verificación del digest de la política contra el SDK.
- `spec:check`/`spec:update` (trabajo de otro cambio; el mensaje solo anticipa `spec:update` cuando exista, sin sugerirlo como comando ejecutable hoy).
- Cambios de API pública del SDK, publicación npm o Changesets.

## Decisions

- **D1 — Un único script de raíz, Node ESM sin dependencias.** `scripts/spec-verify.mjs` con `node:crypto`, `node:fs`, `node:path`. Sigue la convención de `verify.mjs`/`release.mjs`; es el mismo artefacto para el script de raíz y para el build del SDK (vía ruta relativa), evitando duplicar lógica. Alternativa descartada: script dentro de `packages/sdk/scripts/` (rompería la invocación de raíz sin delegación y mezclaría tooling de repo con código del paquete).
- **D2 — Puntos de integración.** Raíz: `"spec:verify": "node scripts/spec-verify.mjs"` en `package.json`; en `scripts/verify.mjs`, paso `["spec:verify"]` colocado después de `format` y antes de `turbo` (barato y offline: falla temprana antes de builds caros). SDK: `"build": "node ../../scripts/spec-verify.mjs && tsup"` (turbo ejecuta el build con cwd `packages/sdk`); va antes de tsup porque los XSD se empaquetan con `?raw` — un esquema corrupto no debe llegar a `dist`. En `pnpm verify` el script corre dos veces (una como paso propio, otra dentro del build del SDK vía turbo): es intencional; el paso propio da fallo temprano barato y el del SDK protege los builds directos de `packages/sdk`. Caché de turbo: `turbo.json` no declara `inputs` en `build` y el default ya cubre los archivos del paquete (incluido `packages/sdk/schemas/**`); al implementar, declarar `inputs` explícitos para que la invalidación no dependa del default.
- **D3 — Resolución de raíz y testeabilidad.** El script calcula la raíz del repo desde su propia ubicación (`import.meta.dirname/..`) y usa `packages/sdk/schemas`. Las pruebas inyectan el directorio con la variable de entorno `SPEC_VERIFY_SCHEMAS_DIR` para apuntar a un fixture temporal. Alternativa descartada: argumentos CLI (más superficie de parsing sin ganancia; env es el patrón ya usado para switches de entorno en `verify.mjs`). La variable admite ruta absoluta (los fixtures usan `fs.mkdtemp` en `os.tmpdir()`) o relativa, en cuyo caso se resuelve contra el cwd de la invocación.
- **D4 — Regla de «archivo no declarado» y allowlist.** Caminata recursiva de archivos bajo `packages/sdk/schemas/`; solo se comparan archivos, no directorios (directorios vacíos son inocuos y git no los trackea). Allowlist exacta en la raíz de esa carpeta: `manifest.json` y `README.md` (el manifiesto no puede declararse a sí mismo sin recursión; el README documenta la procedencia). Un archivo oculto como `.DS_Store` cuenta como no declarado y hace fallar (estricto: visibiliza suciedad en CI). El mensaje de fallo por no declarado indica la allowlist para que el remedio sea obvio (mover el archivo, borrarlo o ampliar la allowlist como decisión explícita). La caminata usa `lstat` y no sigue symlinks: un symlink se reporta como violación con su propio mensaje (el árbol vendorizado no contiene enlaces y el hash de un enlace no es el contenido declarado). Nota: cuando la fase 1c añada `codes.json` a `packages/sdk/schemas/`, ampliar la allowlist será un cambio explícito y revisable, no un accidente.
- **D5 — Validación mínima del manifiesto, falla cerrada.** Antes de comparar: JSON parseable; `files[]` con `path` string relativo (sin `/` inicial ni `..`), `sha256` de 64 hex, `bytes` entero ≥ 0, `vendored` booleano, sin paths duplicados. Además, campos de primer nivel: `schemaVersion === 1`, `currentSet` presente en `sets[].id`, todo `sets[].sourceSurface` y `policy.sourceSurface` referenciando un `id` de `surfaces[]`, y `policy` con `identifier`, `digestMethod` y `digestValue`. Las comparaciones de sha256 normalizan ambos lados a minúsculas antes de comparar. Un manifiesto inválido es un fallo (no un pase implícito). Solo las entradas `vendored: true` se exigen en disco (hoy todas; conserva la puerta para entradas futuras `vendored: false`).
- **D6 — Orden de comprobaciones y reporte acumulado.** Por archivo: existencia → tamaño → SHA-256 (tamaño antes por costo). El script acumula todas las violaciones y termina con exit 1 mostrándolas juntas; éxito imprime una línea `spec:verify: OK (N archivos verificados)` en stdout y sale con exit 0. Mejor DX que fallar en la primera discrepancia cuando hay varias.
- **D7 — Sin Changeset.** Los cambios son tooling de repo (script raíz, orquestador, script de build del SDK); el campo `files` publicado del SDK no cambia y los consumidores npm no ven diferencia. Igual criterio que el cambio vendorize.
- **D8 — Contrato de mensaje.** Tres plantillas fijas en stderr, cada una seguida de la misma línea de remedio:
  - falta: `spec:verify: <ruta>: falta (esperado: sha256=<…> bytes=<…>)`
  - hash o tamaño distinto: `spec:verify: <ruta>: <esperado> vs <obtenido>`
  - no declarado: `spec:verify: <ruta>: no declarado (allowlist en la raíz: manifest.json, README.md)`
  - symlink: `spec:verify: <ruta>: enlace simbólico no soportado`

  Remedio (en los cuatro casos): revisar `git diff`; si el cambio es legítimo, actualizar `manifest.json` y revisar su diff antes de commitear. No se sugiere `spec:update` como comando porque aún no existe (fase posterior); solo se anticipa con esa frase. La ruta nombrada es relativa a `packages/sdk/schemas/` para que coincida con `files[].path`.

## Risks / Trade-offs

- [El build del SDK falla en máquinas con el árbol a medio actualizar] → Es el comportamiento deseado (fallo cerrado); el remedio está en el mensaje (`git diff`; actualizar `manifest.json` — `spec:update` se anticipa pero no se invoca, aún no existe).
- [Allowlist rígida: un documento nuevo legítimo en la raíz de `schemas/` rompe el build] → A propósito; el mensaje nombra la allowlist. Ampliarla es un diff explícito revisable.
- [Duplicar el verificador en otro lenguaje/ubicación a futuro] → Un solo script D1; cualquier consumidor futuro (CI extra, job mensual) lo reutiliza.
- [Costo de hashear ~2 MB en cada build] → Despreciable (hash local de 23 archivos); se ejecuta sin red.

## Migration Plan

Aditivo, sin despliegue ni rollback especial: revertir el commit que agrega el script y sus dos ganchos restaura el comportamiento previo. Los contribuidores obtienen la verificación en su siguiente `pnpm verify` o build.

## Open Questions

Ninguna. (Si más adelante se decide declarar entradas `vendored: false`, D5 ya lo admite sin cambiar specs.)
