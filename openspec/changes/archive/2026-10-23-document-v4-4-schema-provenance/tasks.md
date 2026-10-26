## 1. Verificar la evidencia de las superficies

- [x] 1.1 Comprobar con `curl -sSI` el `Last-Modified` de cada XSD en la superficie ATV (`docs/esquemas/2024/v4.4/`) y en la superficie OVi (`https://www.hacienda.go.cr/docs/`), y anotar la fecha de comprobación.
- [x] 1.2 Descargar los bytes de ambas superficies con `curl -sS -L` y verificar con `sha256sum` que coinciden exactamente con `2024/v4.4/` y `2026/v4.4/` respectivamente, registrando hash y tamaño por archivo.
- [x] 1.3 Generar el diff de contenido de los nueve XSD normalizando terminadores CR/CRLF (`tr '\r' '\n'`), y confirmar la lista de diferencias: patrón de `Clave`, `TipoDocReferenciaType` 19–20, `CodigoReferenciaType` 13–16 y capitalización de la anotación de nota de crédito.
- [x] 1.4 Confirmar en la página ATV de Anexos y Estructuras que la v4.4 se publica solo bajo `docs/esquemas/2024/v4.4/` y que no existe un set `2026/v4.4` en esa superficie.

## 2. Escribir el registro de procedencia

- [x] 2.1 Crear `docs/specs/v4-4-schema-provenance.md` con la sección de superficies (ATV y OVi: identificador, URL, tipo y fecha de consulta).
- [x] 2.2 Añadir la tabla por set y archivo con `set`, `surface`, URL, `lastModified`, `sha256`, `bytes`, `checkedAt` y `rol`, para los nueve XSD y los auxiliares aplicables.
- [x] 2.3 Declarar `2024/v4.4` (ATV) como referencia autoritativa y `2026/v4.4` (OVi) como publicación posterior fuera de ATV sin autoridad confirmada.
- [x] 2.4 Añadir la tabla de divergencia archivo por archivo con la diferencia de restricciones observada y la nota de que no es un error de vendorización.
- [x] 2.5 Registrar la decisión abierta con sus efectos: `nextSet`, `effectiveFrom: 2026-11-01`, set embebido por el build y expectativas de conformidad; dejar explícito que el registro no cambia esos valores.
- [x] 2.6 Documentar el procedimiento reproducible de comprobación (HEAD para `Last-Modified`, GET + `sha256sum`, diff con normalización de fin de línea) y la política de actualización de evidencia.

## 3. Enlazar y mantener consistencia

- [x] 3.1 Añadir un enlace al registro desde la sección de procedencia de `packages/sdk/schemas/README.md`, sin duplicar las tablas ni alterar la semántica de campos.
- [x] 3.2 Enlazar el registro desde la sección de esquemas de `docs/specs/v4.4-compliance.md`.
- [x] 3.3 Contrastar cada hash y tamaño del registro con `packages/sdk/schemas/manifest.json` y corregir cualquier discrepancia de transcripción.

## 4. Verificación

- [x] 4.1 Confirmar que `git status`/`git diff` solo incluye documentación y artefactos de este cambio: ni `manifest.json`, ni archivos vendorizados, ni código.
- [x] 4.2 Formatear únicamente los archivos modificados y verificar que no quedan cambios de formato pendientes.
- [x] 4.3 Ejecutar `openspec validate document-v4-4-schema-provenance --strict`.
- [x] 4.4 Revisar que cada escenario del delta de `spec-integrity` tiene su afirmación correspondiente en el registro, incluida la de actualización de evidencia.
