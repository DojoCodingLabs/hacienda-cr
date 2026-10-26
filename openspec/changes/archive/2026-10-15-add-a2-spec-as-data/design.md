# Design: add-a2-spec-as-data

## Context

Ver `proposal.md` (Why) para motivación. El estado relevante: los specs de
fases 2 y 3 (`codes-extraction` con fuentes auxiliares, `codes-generation`
con candados 1/2 y reemplazo de tablas, `spec-integrity` con digest de la
política) ya están archivados en `openspec/specs/`; su implementación vive
en el stack de drafts `#53` → `#54` → `#55` sin landear. El informe A1
(`docs/conformity-report.md`, en PR `#56`) entrega la lista de correcciones
sancionadas con cita por fila, entre ellas cuatro «no coincide» de catálogo y
la discrepancia XAdES (URI v4.1 + SHA-1 vs Resolución General + SHA-256).
`table-map.mjs` y `shared/src/generated/` existen solo en la rama del stack;
el registro de parejas hoy exige paridad exacta con las tablas manuales, lo
cual impide generar las correcciones sin tocar el spec (de ahí el delta de
`codes-generation`).

## Goals / Non-Goals

**Goals:**

- Landear el stack y cerrar la implementación de los specs ya archivados.
- Aplicar las correcciones P0/P1 del informe A1 con su cita y Changeset.
- Que la cadena XSD vendorizado → `codes.json` → generado → constantes
  publicadas sea única y verificable en `pnpm verify`, sin literales de
  catálogo fuera del generado y sin que las constantes de la política de
  firma puedan divergir del manifiesto.

**Non-Goals:**

- `names.json` y su revisión humana (decisión 10 del INDENT: sin responsable).
- PR automático de actualización, borrador automático de Changeset,
  multiversión en paralelo, retirada de sets con fecha límite.
- Corrección documental de `docs/specs/v4.4-compliance.md` §3.1/§1.9 y
  consultas externas a Hacienda (items P2 de A1).

## Decisions

1. **Alcance A (cerrar el ciclo).** Landear stack + correcciones P0/P1 +
   candados. Se descarta el alcance mínimo (solo landear): dejaría la
   contradicción `codes.json`(10 oficiales) ↔ constants(9 desplazados) viva y
   la generación regeneraría sobre emparejamientos incorrectos. Se descarta el
   alcance total: los items P2 dependen de respuesta externa y bloquearían la
   entrega.
2. **Estrategia de landeo.** `#53` y `#54` se landean primero en su forma
   actual (rebase + CI verde por eslabón; son prerequisitos puros). Después,
   `#55` se retargetea a `main`, recibe los commits de correcciones y
   Changeset de A2, y se retitula como PR final de A2. Alternativa
   considerada: PR de correcciones separado post-merge — descartada por
   duplicar rondas de revisión/CI sobre el mismo paquete publicado.
3. **Correcciones sancionadas vía registro de parejas.** `table-map.mjs` gana
   entradas de corrección con cita (§ del informe + fuente primaria) y tipo
   (sustituir/eliminar/renombrar); el generador las aplica, las reporta por
   tabla-clave-cita, y un desvío sin entrada sigue fallando (spec
   `codes-generation`, delta). Alternativa considerada: editar `codes.json` a
   mano — descartada: `codes.json` es derivado y la siguiente extracción lo
   restauraría.
4. **`DocumentTypeCode`: manda el catálogo oficial de 10 tipos** (ANEXOS
   V4.4 p. 65 inciso c; `Nota3/TipoComprobanteDocumentoAsociado` ya en
   `codes.json`). Se eliminan las claves sin respaldo (`COMPRA_PAGO`,
   `GASTO_VIAJE`) y se suman las oficiales (incluida «10» REP). La semántica
   alternativa del SDK no tiene fuente en ninguna superficie consultada, y
   la contradicción interna con `codes.json` es inaceptable. Riesgo de
   consumidores con claves viejas → Changeset con tabla de migración.
5. **Política de firma: alineación total con el manifiesto.**
   `xades-policy.ts` pasa a URI de la Resolución General, algoritmo SHA-256
   y digest `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=`; `sdkStatus` pasa
   a `aligned`; la verificación nueva compara constantes ↔ `manifest.policy`
   (spec `spec-integrity`, delta). Se descarta mantener la DGT-R-48-2016:
   el Anexo 2 p. 87 exige SHA-256 con la política vigente.
6. **Tablas sin fuente quedan declaradas, no adivinadas.** `REFERENCE_*` se
   deja como pareja explícita «sin pareja por diseño» con la transición al
   set 2026 y su fecha `2026-11-01` documentada (incluye el diff PDF↔XSD del
   código 02). `HaciendaStatus`/`HaciendaRejectionCode`: se intenta el
   manual REST como fuente; sin fuente confirmada, supuesto documentado y sin
   cambio de comportamiento.
7. **Changesets por rompimiento.** Un Changeset (major) cubre los catálogos
   corregidos y la política de firma, con notas de migración: mapa de claves
   eliminadas/renombradas y el cambio de política emitida. Se ajusta al
   flujo de `docs/releasing.md`; nada se publica como parte de este cambio.

## Risks / Trade-offs

- [Claves eliminadas de `DocumentTypeCode` rompen consumidores] → Changeset
  major + tabla de migración clave vieja → nueva (misma que el informe A1
  cita); el catálogo nuevo es el que Hacienda valida en la clave.
- [El cambio de política altera el XAdES-EPES emitido] → es la corrección
  exigida por el Anexo 2; se documenta en el Changeset y se verifica con la
  prueba constante ↔ manifiesto antes de landear.
- [Rebase del stack con `main` (incluye el PR `#56` y otros merges)] →
  landear `#53` primero (el más pequeño), CI verde por eslabón, sin tocar
  contenido en el rebase.
- [A1 y A2 corren en paralelo: el informe puede cambiar de destino] → las
  correcciones citan secciones del informe, no hashes; si el PR `#56` cambia,
  solo se actualizan citas.
- [Nombres de las claves nuevas de `DocumentTypeCode`] → se toman del
  catálogo oficial y la convención de nombres del repo; donde el nombre
  legible no sea evidente se marca para revisión (regla `names.json`), sin
  adivinar.

## Migration Plan

1. Landear `#53`, luego `#54` (cada uno con CI verde).
2. Retarget + correcciones + Changeset en `#55` (PR final de A2).
3. Revisión del PR final: `pnpm verify` completo (incluye candados 1/2,
   `spec:verify` y la verificación nueva de política) y revisión humana del
   Changeset.
4. Rollback: revert del PR final antes de su merge; después de un release no
   hay rollback de npm — por eso todo va en un solo PR revisado y no en
   incrementales publicables.

## Open Questions

- ¿Qué bump exacto declara el Changeset (major de `shared`, del SDK, de
  ambos)? Depende de qué paquetes exponen las constantes corregidas; se
  confirma al escribir el Changeset según `pnpm changeset status`.
- Si el manual REST confirma casing oficial para `HaciendaStatus`, ¿entra la
  corrección en este PR o en uno posterior con su propio spec? Hoy el plan es
  supuesto documentado sin cambio; si aparece fuente, se decide en la
  revisión sin alterar los specs de este cambio.
