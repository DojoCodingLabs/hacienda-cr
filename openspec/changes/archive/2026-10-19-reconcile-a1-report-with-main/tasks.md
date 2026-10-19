## 1. Anexo de estado histórico

- [x] 1.1 En `docs/conformity-report.md`, cambiar el título del apéndice §10 para declarar que es evidencia histórica del commit `597a556`.
- [x] 1.2 Añadir al inicio del apéndice el commit auditado, la fecha de lectura y la advertencia de que no refleja el main vigente.

## 2. Procedencia de los dos anexos

- [x] 2.1 En la cabecera del informe, declarar el SHA-256 del anexo oficial vigente (`6e093226…`, 99 páginas) y el del anexo histórico retenido (`2e36bd11…`, 98 páginas).
- [x] 2.2 Declarar explícitamente que la diferencia de source-set entre ambos anexos no está reconciliada.
- [x] 2.3 Registrar en la cabecera la base revisada (`cf1db1e4bde37498643f77c8259c0a29e51033a1`) y la cabeza revisada (`81c6e42179320bbacaf5c74c6fe8973fd871159b`) de la pasada de reconciliación, sin mezclarlas con el commit auditado del apéndice (`597a556`).

## 3. Reconciliación con el main vigente

- [x] 3.1 Añadir la sección de reconciliación con una entrada por cada hallazgo del apéndice: resuelto (con PR y evidencia), abierto o cambiado.
- [x] 3.2 Resolver explícitamente los hallazgos ya cerrados en `main` (`#60`/`#70`): tipos de documento del catálogo oficial, valor `12` de exoneración retirado, `06` renombrado a servicios turísticos ICT con alias, Ohm `U+2126` e identificador de política con guion.
- [x] 3.3 Referenciar el trabajo pendiente de generación de catálogos (`#57`) y la evidencia vigente de `main`: oráculo nativo de política (`packages/sdk/src/__testing__/policy-oracle.spec.ts`), alineación de catálogos (`catalog-alignment.spec.ts`) y APIs de FE/NC exactas (`shared/src/schemas/exact-fe.ts`, `exact-nc.ts`).
- [x] 3.4 Declarar lo no verificable con fuentes públicas como no reconciliado: procedencia de los códigos de estado y de rechazo del API, y procedencia de los códigos de los endpoints.
- [x] 3.5 Mantener la reconciliación como tabla de estado por hallazgo (un estado y una evidencia por fila), sin reauditar el set de fuentes.

## 4. Límites de lo que el informe afirma

- [x] 4.1 Añadir al informe una sección que declare que no establece elegibilidad de régimen (ni total ni parcial) ni aceptación real por Hacienda, y que probar conformidad de código no equivale a aceptación fiscal.
- [x] 4.2 Declarar en la misma sección que la reconciliación documental no es precondición de la corrección acotada de la NC exacta (0.7).
- [x] 4.3 Declarar que el informe se presenta como evidencia histórica más delta, nunca como certificación de conformidad vigente.

## 5. Documentación

- [x] 5.1 Ajustar la referencia del informe en `AGENTS.md` y en el README del repo para describirlo como evidencia histórica con delta contra main.
- [x] 5.2 Formatear únicamente los archivos tocados por este cambio.

## 6. Puerta de merge (sin merge)

- [x] 6.1 Rebasar el PR #58 sobre `main` y actualizar la rama, sin fusionar ni cerrar el PR.
- [x] 6.2 Revalidar la reconciliación contra la cabeza vigente de `main` tras el rebase; si cambió algo desde `81c6e421…`, actualizar la tabla de estado.
- [x] 6.3 Dejar el PR abierto con la descripción de evidencia (resumen, hashes preservados, límites declarados) para que otra persona lo revise y fusione.
- [x] 6.4 Confirmar que el cambio no editó fuentes fuera de `docs/` ni del propio paquete de documentación.

## 7. Puertas

- [x] 7.1 Verificar que `openspec validate reconcile-a1-report-with-main` pasa.
- [x] 7.2 Verificar que `openspec validate --specs` no presenta regresiones.
- [x] 7.3 Verificar que `pnpm verify` sigue verde (cambio sólo de documentación).
