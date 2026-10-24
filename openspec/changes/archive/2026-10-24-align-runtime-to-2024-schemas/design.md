## Context

Ver `proposal.md` — Why. El estado actual mezcla dos autoridades: `manifest.json` declara `currentSet: "2024/v4.4"`, pero el build embebe los XSD de `2026/v4.4` y el helper de validación usa `"2026"` por defecto. Además, los catálogos y esquemas compartidos aceptan valores que solo existen en 2026 (clave alfanumérica, `TipoDocReferencia` 19–20, `CodigoReferencia` 13–17) y existe un builder dedicado a la sustitución con código 16. La decisión de producto ya está cerrada: 2024 es autoritativo y 2026 no se adopta.

## Goals / Non-Goals

**Goals:**

- Que el comportamiento por defecto del SDK (build, validación y pruebas de aceptación) sea 2024.
- Que las construcciones exclusivas de 2026 sean imposibles de emitir y se rechacen como entrada.
- Que manifiesto, README, procedencia y documentación de cumplimiento cuenten la misma historia: 2024 autoritativo, 2026 solo referencia.
- Dejar una migración explícita para consumidores afectados por los valores retirados.

**Non-Goals:**

- Borrar o re-vendorizar los XSD de `2026/v4.4`; se conservan como evidencia y para pruebas negativas.
- Adoptar 2026 en el futuro ni diseñar un flag de transición; si ATV publica y confirma el set, será un cambio aparte.
- Cambiar la estructura general de documentos v4.4, la firma XAdES o los catálogos ajenos a las referencias y la clave.

## Decisions

### D1. 2024 es el único criterio de aceptación; 2026 queda como referencia

El build embebido y el helper de validación usan `2024/v4.4` por defecto. `SCHEMA_GENERATIONS` puede conservar `"2026"` para pruebas negativas, pero ninguna prueba de aceptación ni camino de runtime lo usa como esquema por defecto.

- **Alternativa considerada:** flag de entorno para elegir generación. Se descarta porque reproduce el desajuste actual y permite que un despliegue emita documentos no conformes con la autoridad declarada.
- **Alternativa considerada:** validar contra ambos sets y aceptar si uno pasa. Se descarta porque una aceptación 2026 no compensa un rechazo 2024.

### D2. Los valores 2026 se retiran en la fuente, no solo en los builders

`REFERENCE_DOC_TYPES` deja de incluir 19–20 y `REFERENCE_CODES` deja de incluir 13–16; `REP_REFERENCE_CODES` deja de añadir 17. La clave se restringe a `\d{50}` en los esquemas compartidos, en el constructor y en el parser. Los builders consumen esos catálogos, así que la barrera queda en la validación de entrada y no depende de guardas dispersas.

- **Alternativa considerada:** mantener los catálogos completos y rechazar en cada builder. Se descarta porque la API pública seguiría anunciando valores inválidos y cada builder podría olvidar la guarda.

### D3. Se retira la API de sustitución con código 16

`ExactFeReplacementInputSchema`, `calculateExactFeReplacement`, `buildExactFacturaReplacementXml` y sus exports/fixtures/pruebas se retiran del camino público, porque el código 16 solo existe en 2026. La funcionalidad no se puede expresar de forma conforme con 2024.

- **Alternativa considerada:** conservarla detrás de un flag `preview2026`. Se descarta por la decisión de revertir y porque el código 16 no tiene equivalente 2024.
- **Consecuencia:** cambio **BREAKING**; el changeset debe indicar que la API desaparece y qué hacer (esperar adopción oficial de 2026 o emitir el documento con los códigos 2024 disponibles).

### D4. El manifiesto omite `nextSet`

`manifest.json` deja de declarar `nextSet` para `2026/v4.4`; el set sigue en `sets[]` como referencia vendorizada y `currentSet` sigue en `2024/v4.4`. No se añade un campo nuevo del tipo `authorityUnconfirmed` porque el manifiesto ya expresa la ausencia de próximo set omitiendo la clave; la explicación vive en el README y en el registro de procedencia. La retirada es una edición revisada del manifiesto, no una operación de `spec:update` (que exige `effectiveFrom`); `spec:verify` valida el resultado.

- **Alternativa considerada:** conservar `nextSet` sin `effectiveFrom` o con una marca de no confirmado. Se descarta porque el esquema actual exige `effectiveFrom` y porque la sola presencia de `nextSet` sugiere una adopción futura que no está decidida.

### D5. La suite separa aceptación 2024 de rechazo 2026

La suite de conformidad valida todos los fixtures contra 2024. Los casos que hoy afirman aceptación bajo 2026 se reescriben para afirmar rechazo bajo 2024; `updates-2026.spec.ts` se convierte en pruebas de rechazo o se retira si todo su contenido depende de construcciones 2026. El helper conserva la opción `generation` solo para estas pruebas negativas.

### D6. Documentación con una sola autoridad

`packages/sdk/schemas/README.md`, `docs/specs/v4-4-schema-provenance.md` y `docs/specs/v4.4-compliance.md` dejan de afirmar que 2026 es obligatorio el 2026-11-01. El registro de procedencia cierra la decisión: 2024 autoritativo, 2026 no adoptado, sin fecha de obligatoriedad afirmada.

## Risks / Trade-offs

- **Consumidores que ya envían clave alfanumérica o refs 2026** → Changeset major con notas de migración y error de validación claro que nombre el valor retirado.
- **Cambios activos que dependen de `exact-credit-extensions` o de la sustitución con código 16** → Revisar esos cambios antes de aplicar; la API retirada y sus fixtures deben ajustarse o retirarse en el mismo commit.
- **Pruebas y manifiesto esperando `nextSet`** → Buscar usos en `scripts/spec-watch` y pruebas; el código de `spec:update` ya trata `nextSet` como opcional, pero los fixtures que lo inyectan deben seguir pasando.
- **Pérdida de una capacidad que 2026 ofrecía** → Intencional: se conserva la evidencia y los XSD 2026 para una adopción futura; no se promete soporte mientras no haya autoridad ATV.
- **Diferencia entre cédula del contribuyente y clave** → La cédula puede seguir siendo un string en la identificación del emisor; lo que se restringe es el segmento de la clave, que el XSD 2024 exige numérico.

## Migration Plan

1. Retirar `nextSet` del manifiesto y verificar con `pnpm spec:verify`.
2. Cambiar el build/runtime y el helper de validación al set 2024.
3. Restringir clave y catálogos de referencia; retirar la API de sustitución con código 16.
4. Reescribir pruebas de conformidad, propiedad y regresiones 2026 como rechazo 2024.
5. Actualizar README, procedencia y compliance.
6. Añadir changeset con bump major y notas de migración; ejecutar `pnpm verify`.

Rollback: revertir el commit. No hay migración de datos ni cambios en los bytes vendorizados; el árbol 2026 permanece intacto.

## Open Questions

Ninguna que cambie el alcance. La posible publicación oficial de 2026 por ATV queda fuera de este cambio y se resolverá con un change futuro si ocurre.
