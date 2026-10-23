# Tasks: fix-spec-drift-workflow-rebase

## 1. Rebase de la rama

- [x] 1.1 Confirmar el estado de partida: `git cherry` marca `f47f44d`, `a9c8949` y
      `3fdeddf` como ya aplicados y `main` no contiene `.github/workflows/spec-drift.yml`
- [x] 1.2 Reapuntar la rama sobre la de #50 en un worktree limpio
      (`git checkout -B feat/add-spec-drift-workflow feat/add-spec-watch-commands`;
      base elegida por decisión de secuencia: #50 espera revisión, así que no se
      puede mergear antes de rebasear #51)
- [x] 1.3 Cherry-pick de `3fdeddf`, resolviendo los conflictos de `docs/testing.md` y
      `packages/sdk/schemas/README.md` conservando el texto endurecido de #50 y añadiendo
      encima la sección del job programado
- [x] 1.4 Verificar que el árbol resultante es #50 + workflow: el diff contra la rama
      de #50 debe reducirse a `.github/workflows/spec-drift.yml`, `docs/testing.md` y
      `packages/sdk/schemas/README.md` (el diff del PR contra `main` muestra aún a #50
      y colapsa cuando ese se mergee)

## 2. Truncado UTF-8 del cuerpo del issue

- [x] 2.1 Reemplazar `head -c "$MAX_BYTES" "$REPORT"` por
      `head -c ... | iconv -f UTF-8 -t UTF-8 -c > "$BODY" || true`, con comentario que
      explique que `iconv -c` devuelve 1 al descartar una secuencia incompleta
- [x] 2.2 Comprobar la sintaxis del workflow (`bash -n` sobre los bloques `run:`)
- [x] 2.3 Ejecutar la prueba local de truncado con un informe de prueba que contenga
      caracteres multibyte en los tres cortes del design (mitad de carácter, cierre de
      carácter, después de carácter) y confirmar salida UTF-8 válida y exit 0 de la
      tubería completa

## 3. Verificación y cierre

- [x] 3.1 Ejecutar `pnpm verify` completo en la rama reconstruida
- [x] 3.2 Commitear (reaplicación del workflow y, por separado, el fix de truncado) y
      hacer push con `--force-with-lease`
- [x] 3.3 Verificar en el PR #51 que el diff quedó reducido a los archivos esperados, que
      los checks de CI pasan y que el estado deja de ser `CONFLICTING`
- [x] 3.4 Responder el comentario de la revisión señalando el nuevo HEAD y lo aplicado
      (pendiente de autorización para publicar el comentario)
