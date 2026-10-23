## 1. Lander el stack de implementación (specs ya archivados)

- [x] 1.1 Rebase de `feat/add-aux-codes-extraction` (PR #53) sobre `main` con
      CI verde, sin cambios de contenido
- [x] 1.3 Rebase de `feat/add-codes-generation` (PR #54, retargeteado a
      `main` tras el merge de #53) con CI verde
- [x] 1.5 Retargete y rebase de `feat/verify-signing-policy-digest` (PR #55)
      sobre `main` con CI verde; queda como PR final de A2 (no merge)

## 2. Correcciones de catálogo sancionadas (design 3 y 4; delta `codes-generation`)

- [x] 2.1 Canonizar en `openspec/specs/codes-generation/spec.md` los
      encabezados de los Candados 1 y 2 (`### Requirement (Candado N):` →
      `### Requirement: <nombre> (Candado N)`), para que el maquinario de
      deltas los trate como requisitos propios; sin cambio de contenido
- [x] 2.2 Extender `scripts/codes-generate/table-map.mjs` con el mecanismo de
      correcciones sancionadas (entrada con tipo, cita al informe de
      conformidad y referencia a Changeset) y su reporte por tabla-clave-cita;
      desvíos no declarados o incompletos siguen fallando
- [x] 2.3 Corregir `DocumentTypeCode` al catálogo oficial de 10 tipos
      (`Nota3/TipoComprobanteDocumentoAsociado`, ANEXOS V4.4 p. 65 inciso c):
      emparejar la tabla, eliminar las claves sin respaldo
      (`COMPRA_PAGO`, `GASTO_VIAJE`), nombrar las claves nuevas según la
      convención del repo sin inventar nombres
- [x] 2.4 Corregir `ExonerationType`: quitar el valor «12» (enum XSD oficial
      01–11 + 99) y la etiqueta 06 a «Servicios turísticos ICT», con cita
- [x] 2.5 Unificar `UNITS_OF_MEASURE` al homógrafo `U+2126` (fuente ANEXOS),
      con cita
- [x] 2.6 Regenerar con `pnpm spec:generate` y confirmar determinismo (doble
      corrida sin diff) y consistencia `codes.json` ↔ `shared/src/generated/`
- [x] 2.7 Actualizar consumidores internos (clave numérica, CLI, MCP, tests y
      fixtures) a las claves nuevas de `DocumentTypeCode` y al enum de
      exoneración corregido

## 3. Política de firma alineada (design 5; delta `spec-integrity`)

- [x] 3.1 Corregir `shared/src/constants/xades-policy.ts`: URI de la
      Resolución General vigente, algoritmo SHA-256 y digest
      `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`, con cita Anexo 2 p. 87
- [x] 3.2 Implementar la verificación de constantes publicadas ↔
      `manifest.policy` dentro del gate de `pnpm verify`, que nombra campo,
      valor publicado y esperado al divergir
- [x] 3.3 Poner `manifest.policy.sdkStatus` en `aligned` y actualizar el
      README del manifiesto con la semántica de ambos estados y del gate

## 4. Tablas sin fuente y transiciones documentadas (design 6)

- [x] 4.1 Documentar la transición de `REFERENCE_*` al set 2026 con su fecha
      límite `2026-11-01` y el diff PDF↔XSD del código 02 («Corrige monto» vs
      «Corrige texto»), como pareja explícita sin emparejar por diseño
- [x] 4.2 Intentar el manual REST de la API como fuente para
      `HaciendaStatus` (casing) y un catálogo oficial de
      `HaciendaRejectionCode`; si no se confirma fuente, registrar ambos como
      supuestos documentados sin cambio de comportamiento

## 5. Candados y verificación (specs archivados + deltas)

- [x] 5.1 Verificar en `pnpm verify`: candado 1 (diff entre árbol y
      regeneración), candado 2 (literales de catálogo prohibidos fuera de
      `shared/src/generated/`) y frescura de `codes.json`
- [x] 5.2 Añadir pruebas de regresión de comportamiento: corrección
      sancionada aplicada y reportada, desvío no declarado que falla,
      divergencia constante de política ↔ manifiesto que falla
- [x] 5.3 `pnpm verify` verde de punta a punta en el PR final

## 6. Changeset y entrega

- [x] 6.1 Escribir el Changeset (major) con la tabla de migración: claves de
      `DocumentTypeCode` viejas → nuevas, `ExonerationType` sin «12», Ω
      `U+2126`, política de firma nueva; confirmar el alcance del bump con
      `pnpm changeset status`
- [x] 6.2 Retitular el PR #55 como PR final de A2, con la descripción
      enlazando el informe A1 (`docs/conformity-report.md`) y este cambio
- [ ] 6.3 CI verde en el PR final y revisión humana del Changeset antes de
      cualquier publicación (flujo de `docs/releasing.md`, sin publicar en
      este cambio)
