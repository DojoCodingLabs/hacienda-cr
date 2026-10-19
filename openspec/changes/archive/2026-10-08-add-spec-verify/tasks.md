## 1. Verificador

- [x] 1.1 Crear `scripts/spec-verify.mjs`: resolución de raíz (`import.meta.dirname/..`) y override `SPEC_VERIFY_SCHEMAS_DIR` (absoluta — fixtures en `os.tmpdir()` — o relativa contra cwd); validar el manifiesto (JSON parseable, `files[]` con `path` relativo sin `..`, `sha256` de 64 hex comparado en minúsculas, `bytes` entero ≥ 0, `vendored` booleano, sin duplicados) y campos de primer nivel (`schemaVersion === 1`, `currentSet ∈ sets[].id`, `sourceSurface ∈ surfaces[].id`, `policy` con `identifier`/`digestMethod`/`digestValue`) con fallo cerrado (design D3, D5).
- [x] 1.2 Implementar la comparación: por cada entrada `vendored: true` existencia → tamaño → SHA-256 (hex minúsculas); caminata recursiva del árbol y fallo por archivo no declarado con allowlist `manifest.json`/`README.md` en la raíz de `packages/sdk/schemas/` (design D4, D6).
- [x] 1.3 Implementar el contrato de salida: violaciones acumuladas a stderr con las plantillas fijas de D8 — `falta (esperado: sha256=… bytes=…)`, `<esperado> vs <obtenido>`, `no declarado (allowlist…)`, `enlace simbólico no soportado` — más remedio `git diff` / actualizar `manifest.json` (sin invocar `spec:update`, aún no existe), exit 1; éxito = `spec:verify: OK (N archivos verificados)`, exit 0, sin red y sin escribir (design D6, D8).

## 2. Integración en build y verify

- [x] 2.1 Agregar `"spec:verify": "node scripts/spec-verify.mjs"` al `package.json` de raíz.
- [x] 2.2 Insertar `["spec:verify"]` en `scripts/verify.mjs` después de `format` y antes del paso de turbo (design D2).
- [x] 2.3 Cambiar el `build` del SDK (`packages/sdk/package.json`) a `node ../../scripts/spec-verify.mjs && tsup` (design D2).
- [x] 2.4 Verificar la invalidación de caché de turbo para `packages/sdk/schemas/**` y declarar `inputs` explícitos en el task `build` de `turbo.json` (el default ya los cubre; hacerlo explícito evita depender del default) (design D2).

## 3. Regresiones de script

- [x] 3.1 Crear `scripts/spec-verify.test.mjs` (`node --test`) con helper de fixture temporal (árbol mínimo + manifiesto) que invoca el script vía `execFileSync` con `SPEC_VERIFY_SCHEMAS_DIR`: caso árbol íntegro pasa (exit 0); caso byte alterado falla y el mensaje contiene ruta, esperado, obtenido y el remedio `git diff` (no `spec:update` como comando).
- [x] 3.2 Agregar casos: archivo `vendored: true` eliminado; archivo no declarado (incluido en subdirectorio) con mención de la allowlist; `manifest.json`/`README.md` en la raíz no declaran fallo; manifiesto JSON inválido falla; manifiesto con campo de primer nivel inválido (`currentSet` sin correspondencia) falla; entrada `vendored: false` cuyo archivo no existe → no falla.
- [x] 3.3 Agregar caso de integración read-only: `spec:verify` contra el árbol real `packages/sdk/schemas/` termina con exit 0.

## 4. Verificación

- [x] 4.1 Ejecutar `pnpm test:scripts` y `pnpm spec:verify`; ambas pasan.
- [x] 4.2 Formatear solo los archivos tocados con `pnpm exec prettier --write` y ejecutar `pnpm verify` completo (sin credenciales, sin red).
- [x] 4.3 Revisar `git status`: solo `scripts/spec-verify.mjs`, `scripts/spec-verify.test.mjs`, `package.json` raíz, `scripts/verify.mjs`, `packages/sdk/package.json` y `turbo.json`; sin Changeset; no commitear.
